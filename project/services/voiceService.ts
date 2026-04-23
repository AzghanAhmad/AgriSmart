/**
 * Hybrid voice: React Native SpeechRecognition first, then backend /api/voice/stt.
 * TTS: react-native-tts first, then backend /api/voice/tts + expo-av playback.
 * User-facing name: voiceService (this file is .ts to match the Expo/TS project).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { getApiBaseUrl } from '@/utils/env';

/**
 * When true (default): skip Android/iOS SpeechRecognizer and record with expo-av first.
 * That captures audio *while* the user speaks. The old flow (listen → empty → start recording)
 * started recording *after* speech ended, so uploads were often silent → Whisper returned "".
 * Set EXPO_PUBLIC_VOICE_RECORDING_FIRST=0 to prefer native recognition first.
 */
const USE_RECORDING_FIRST = process.env.EXPO_PUBLIC_VOICE_RECORDING_FIRST !== '0';

/** Mono 16 kHz speech preset — easier for Whisper than stereo 44.1 kHz. */
const STT_RECORDING_OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: true,
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 64000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 64000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
};

function getMultipartAudioMeta(uri: string): { name: string; type: string } {
  const u = uri.toLowerCase();
  if (u.endsWith('.3gp')) {
    return { name: 'speech.3gp', type: 'audio/3gpp' };
  }
  if (u.endsWith('.caf')) {
    return { name: 'speech.caf', type: 'audio/x-caf' };
  }
  if (u.endsWith('.webm')) {
    return { name: 'speech.webm', type: 'audio/webm' };
  }
  return { name: 'speech.m4a', type: 'audio/mp4' };
}

// --- Types ---

export type VoiceLocale = 'en-US' | 'ur-PK';

export type HybridVoicePhase = 'idle' | 'listening' | 'processing' | 'recording' | 'error';

export type HybridVoiceState = {
  phase: HybridVoicePhase;
  liveTranscript: string;
  errorCode: HybridVoiceErrorCode | null;
  errorMessage: string | null;
};

export type HybridVoiceErrorCode =
  | 'mic_permission_denied'
  | 'mic_busy'
  | 'mic_failed'
  | 'recording_too_short'
  | 'no_speech_detected'
  | 'stt_failed'
  | 'native_voice_failed';

function classifyMicStartError(e: any): HybridVoiceErrorCode {
  const msg = String(e?.message || e?.toString?.() || '').toLowerCase();
  // Permission-ish errors
  if (
    msg.includes('permission') ||
    msg.includes('not authorized') ||
    msg.includes('denied') ||
    msg.includes('eacces')
  ) {
    return 'mic_permission_denied';
  }
  // Mic is already in use / cannot start recorder
  if (
    msg.includes('busy') ||
    msg.includes('in use') ||
    msg.includes('audiofocus') ||
    msg.includes('audio record') ||
    msg.includes('audiorecord') ||
    msg.includes('could not start') ||
    msg.includes('start failed') ||
    msg.includes('avaudio') ||
    msg.includes('session') ||
    msg.includes('cannot start') ||
    msg.includes('resource')
  ) {
    return 'mic_busy';
  }
  return 'mic_failed';
}

/** // DEBUG: lazy native module handles (avoid crashing when not linked) */
function getVoiceModule(): any {
  try {
    const mod = require('@react-native-voice/voice');
    return mod.default || mod;
  } catch (e) {
    console.log('[voiceService][DEBUG] @react-native-voice not loaded:', e);
    return null;
  }
}

function getTtsModule(): any {
  try {
    return require('react-native-tts').default || require('react-native-tts');
  } catch (e) {
    console.log('[voiceService][DEBUG] react-native-tts not loaded:', e);
    return null;
  }
}

// --- Public API: STT upload ---

/**
 * // FIX: Send recorded file to Flask /api/voice/stt (multipart).
 */
export async function sendAudioToBackend(filePath: string, language: string): Promise<string> {
  const base = getApiBaseUrl().replace(/\/$/, '');
  const uri =
    Platform.OS === 'android' && filePath && !filePath.startsWith('file://')
      ? `file://${filePath}`
      : filePath;

  const meta = getMultipartAudioMeta(uri);
  const form = new FormData();
  form.append(
    'audio',
    {
      uri,
      name: meta.name,
      type: meta.type,
    } as unknown as Blob
  );

  form.append('language', language);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    const res = await fetch(`${base}/api/voice/stt`, {
      method: 'POST',
      body: form,
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    const data = (await res.json()) as { text?: string; error?: string; hint?: string };
    if (!res.ok) {
      const msg = [data.error, data.hint].filter(Boolean).join(' — ') || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return (data.text || '').trim();
  } finally {
    clearTimeout(timeout);
  }
}

// --- Public API: TTS ---

let lastSound: Audio.Sound | null = null;

/**
 * // FIX: Stop TTS + expo playback and switch session to recording-capable.
 * Without this, mic recording often silently fails right after the bot speaks.
 */
export async function stopPlaybackAndPrepareMic(): Promise<void> {
  try {
    const Tts = getTtsModule();
    if (Tts && typeof Tts.stop === 'function') {
      await Promise.resolve(Tts.stop());
    }
  } catch {
    // ignore
  }
  try {
    if (lastSound) {
      const s = lastSound;
      lastSound = null;
      await s.stopAsync();
      await s.unloadAsync();
    }
  } catch {
    // ignore
  }
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
}

async function playUrlWithExpoAv(fullUrl: string): Promise<void> {
  try {
    if (lastSound) {
      await lastSound.unloadAsync();
      lastSound = null;
    }
  } catch {
    // ignore
  }

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
  });

  const { sound } = await Audio.Sound.createAsync({ uri: fullUrl }, { shouldPlay: true });
  lastSound = sound;
  sound.setOnPlaybackStatusUpdate((s) => {
    if ('didJustFinish' in s && s.didJustFinish) {
      sound.unloadAsync().catch(() => {});
      if (lastSound === sound) lastSound = null;
    }
  });
}

/**
 * // FIX: Speak chatbot reply — TTS native first, backend /api/voice/tts + expo-av fallback.
 */
export async function speakBotResponse(text: string, language: VoiceLocale): Promise<void> {
  const trimmed = (text || '').trim();
  if (!trimmed || Platform.OS === 'web') return;

  // For Urdu replies, prefer backend TTS (gTTS lang='ur') so we reliably get Urdu audio
  // even on devices without a proper Urdu voice installed.
  if (language.toLowerCase().startsWith('ur')) {
    const base = getApiBaseUrl().replace(/\/$/, '');
    const res = await fetch(`${base}/api/voice/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ text: trimmed, language: 'ur' }),
    });
    const data = (await res.json()) as { url?: string; error?: string; details?: string };
    if (!res.ok || !data.url) {
      throw new Error(data.error || data.details || `TTS HTTP ${res.status}`);
    }
    const path = data.url.startsWith('/') ? data.url : `/${data.url}`;
    await playUrlWithExpoAv(`${base}${path}`);
    return;
  }

  const Tts = getTtsModule();
  if (Tts) {
    try {
      const getInitStatus = Tts.getInitStatus;
      if (typeof getInitStatus === 'function') {
        const status = await getInitStatus();
        if (status !== 'succeeded') {
          throw new Error('tts_init_not_ready');
        }
      }
      try {
        Tts.stop();
      } catch {
        // ignore
      }
      Tts.setDefaultLanguage(language);
      await Promise.resolve(Tts.speak(trimmed));
      return;
    } catch (e) {
      console.log('[voiceService][DEBUG] Native TTS failed, trying backend:', e);
    }
  }

  const base = getApiBaseUrl().replace(/\/$/, '');
  const langShort = language.toLowerCase().split('-')[0] || 'en';
  const res = await fetch(`${base}/api/voice/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ text: trimmed, language: langShort === 'ur' ? 'ur' : 'en' }),
  });
  const data = (await res.json()) as { url?: string; error?: string; details?: string };
  if (!res.ok || !data.url) {
    throw new Error(data.error || data.details || `TTS HTTP ${res.status}`);
  }
  const path = data.url.startsWith('/') ? data.url : `/${data.url}`;
  await playUrlWithExpoAv(`${base}${path}`);
}

// --- Hook: hybrid mic ---

const FALLBACK_MAX_MS = 15000;
/** If RN Voice "starts" but never fires events (broken native), fall back to expo recording. */
const VOICE_SILENCE_FALLBACK_MS = 4500;

/** // FIX: Use expo-av permission API so recording works without react-native-audio-recorder-player native link */
async function ensureRecordPermission(): Promise<boolean> {
  try {
    const { status } = await Audio.requestPermissionsAsync();
    console.log('[voiceService][DEBUG] Audio.requestPermissionsAsync:', status);
    return status === 'granted';
  } catch (e) {
    console.log('[voiceService][DEBUG] Audio.requestPermissionsAsync failed:', e);
    return false;
  }
}

export type UseHybridVoiceOptions = {
  locale: VoiceLocale;
  /** Called with final transcript; should call your existing sendMessage(text). */
  onFinalText: (text: string) => void;
  /** When false (e.g. chat request in flight), mic is ignored. */
  canInteract: boolean;
};

export function useHybridVoice(options: UseHybridVoiceOptions): HybridVoiceState & {
  toggleMic: () => Promise<void>;
  resetError: () => void;
} {
  const { locale, onFinalText, canInteract } = options;
  const [phase, setPhase] = useState<HybridVoicePhase>('idle');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [errorCode, setErrorCode] = useState<HybridVoiceErrorCode | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognizedTextRef = useRef('');
  const manualStopRef = useRef(false);
  const usingRecorderRef = useRef(false);
  const recorderRef = useRef<Audio.Recording | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceListenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceListenActiveRef = useRef(false);

  const clearVoiceListenTimeout = useCallback(() => {
    if (voiceListenTimeoutRef.current) {
      clearTimeout(voiceListenTimeoutRef.current);
      voiceListenTimeoutRef.current = null;
    }
    voiceListenActiveRef.current = false;
  }, []);
  const onFinalTextRef = useRef(onFinalText);
  useEffect(() => {
    onFinalTextRef.current = onFinalText;
  }, [onFinalText]);

  const clearFallbackTimer = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  const stopRecorderAndUpload = useCallback(async () => {
    const rec = recorderRef.current;
    if (!rec) {
      setPhase('idle');
      usingRecorderRef.current = false;
      return;
    }
    clearFallbackTimer();
    setPhase('processing');
    usingRecorderRef.current = false;
    try {
      const statusBeforeStop = await rec.getStatusAsync();
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      console.log('[voiceService][DEBUG] expo-av recording URI:', uri, 'durationMs:', statusBeforeStop.durationMillis);
      if (!uri) {
        throw new Error('Recording produced no file');
      }
      const durationMs = statusBeforeStop.durationMillis ?? 0;
      if (durationMs < 450) {
        setErrorCode('recording_too_short');
        setErrorMessage('Recording too short. Tap mic, speak, then tap again to send.');
        setPhase('error');
        return;
      }
      const text = await sendAudioToBackend(uri, locale);
      setLiveTranscript(text);
      if (text) {
        setPhase('idle');
        onFinalTextRef.current(text);
      } else {
        setErrorCode('no_speech_detected');
        setErrorMessage('No speech detected (backend).');
        setPhase('error');
      }
    } catch (e: any) {
      console.log('[voiceService][DEBUG] Backend STT failed:', e);
      setErrorCode('stt_failed');
      setErrorMessage(e?.message || 'Backend speech recognition failed.');
      setPhase('error');
    } finally {
      recorderRef.current = null;
    }
  }, [clearFallbackTimer, locale]);

  const startFallbackRecording = useCallback(async () => {
    const Voice = getVoiceModule();
    if (Voice) {
      try {
        await Voice.cancel();
      } catch {
        // ignore
      }
      try {
        await Voice.stop();
      } catch {
        // ignore
      }
    }

    usingRecorderRef.current = true;
    setPhase('recording');
    setLiveTranscript('');
    recognizedTextRef.current = '';

    if (recorderRef.current) {
      try {
        await recorderRef.current.stopAndUnloadAsync();
      } catch {
        // ignore
      }
      recorderRef.current = null;
    }

    try {
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(STT_RECORDING_OPTIONS);
      await recording.startAsync();
      recorderRef.current = recording;
      clearFallbackTimer();
      fallbackTimerRef.current = setTimeout(() => {
        console.log('[voiceService][DEBUG] Fallback max duration reached');
        stopRecorderAndUpload();
      }, FALLBACK_MAX_MS);
    } catch (e: any) {
      console.log('[voiceService][DEBUG] expo-av startRecording failed:', e);
      const code = classifyMicStartError(e);
      setErrorCode(code);
      if (code === 'mic_permission_denied') {
        setErrorMessage('Microphone permission denied.');
      } else if (code === 'mic_busy') {
        setErrorMessage(
          'Microphone is being used by another app (e.g., Google Meet). Switch the mic to AgriSmart and try again.'
        );
      } else {
        setErrorMessage(
          e?.message ||
            'Could not start microphone recording. Please check mic permission and try again.'
        );
      }
      setPhase('error');
      usingRecorderRef.current = false;
      recorderRef.current = null;
    }
  }, [clearFallbackTimer, clearVoiceListenTimeout, stopRecorderAndUpload]);

  const tryStartNativeVoice = useCallback(async (): Promise<boolean> => {
    const Voice = getVoiceModule();
    if (!Voice) {
      console.log('[voiceService][DEBUG] Native Voice module missing');
      return false;
    }
    try {
      if (typeof Voice.isAvailable === 'function') {
        try {
          const ok = await Voice.isAvailable();
          console.log('[voiceService][DEBUG] Voice.isAvailable:', ok);
          if (!ok) return false;
        } catch {
          return false;
        }
      }
      manualStopRef.current = false;
      recognizedTextRef.current = '';
      setLiveTranscript('');
      try {
        await Voice.cancel();
      } catch {
        // ignore
      }
      try {
        await Voice.stop();
      } catch {
        // ignore
      }
      setPhase('listening');
      await Voice.start(locale);
      console.log('[voiceService][DEBUG] Voice.start ok', locale);

      clearVoiceListenTimeout();
      voiceListenActiveRef.current = true;
      voiceListenTimeoutRef.current = setTimeout(async () => {
        if (!voiceListenActiveRef.current || usingRecorderRef.current) return;
        voiceListenActiveRef.current = false;
        voiceListenTimeoutRef.current = null;
        console.log('[voiceService][DEBUG] Voice timed out — switching to expo-av recording');
        try {
          await Voice.stop?.();
        } catch {
          // ignore
        }
        setPhase('idle');
        await startFallbackRecording();
      }, VOICE_SILENCE_FALLBACK_MS);

      return true;
    } catch (e) {
      console.log('[voiceService][DEBUG] Voice.start failed:', e);
      clearVoiceListenTimeout();
      setPhase('idle');
      return false;
    }
  }, [clearVoiceListenTimeout, locale, startFallbackRecording]);

  const toggleMic = useCallback(async () => {
    if (!canInteract) return;
    setErrorMessage(null);

    if (phase === 'listening' && !usingRecorderRef.current) {
      clearVoiceListenTimeout();
      manualStopRef.current = true;
      const Voice = getVoiceModule();
      try {
        await Voice?.stop?.();
      } catch {
        // ignore
      }
      setPhase('idle');
      return;
    }

    if (phase === 'recording' && usingRecorderRef.current) {
      await stopRecorderAndUpload();
      return;
    }

    if (phase === 'processing') return;

    const granted = await ensureRecordPermission();
    if (!granted) {
      setErrorCode('mic_permission_denied');
      setErrorMessage('Microphone permission denied.');
      setPhase('error');
      return;
    }

    await stopPlaybackAndPrepareMic();

    if (USE_RECORDING_FIRST) {
      await startFallbackRecording();
      return;
    }

    const ok = await tryStartNativeVoice();
    if (!ok) {
      await startFallbackRecording();
    }
  }, [
    canInteract,
    phase,
    clearVoiceListenTimeout,
    tryStartNativeVoice,
    startFallbackRecording,
    stopRecorderAndUpload,
  ]);

  useEffect(() => {
    if (USE_RECORDING_FIRST) return undefined;
    const Voice = getVoiceModule();
    if (!Voice) return undefined;

    Voice.onSpeechStart = () => {
      console.log('[voiceService][DEBUG] onSpeechStart');
      voiceListenActiveRef.current = false;
      if (voiceListenTimeoutRef.current) {
        clearTimeout(voiceListenTimeoutRef.current);
        voiceListenTimeoutRef.current = null;
      }
      setPhase('listening');
    };

    Voice.onSpeechResults = (e: { value?: string[] }) => {
      const t = e?.value?.[0];
      console.log('[voiceService][DEBUG] onSpeechResults', e?.value);
      if (typeof t === 'string' && t.trim()) {
        recognizedTextRef.current = t.trim();
        setLiveTranscript(t.trim());
        voiceListenActiveRef.current = false;
        if (voiceListenTimeoutRef.current) {
          clearTimeout(voiceListenTimeoutRef.current);
          voiceListenTimeoutRef.current = null;
        }
      }
    };

    Voice.onSpeechEnd = async () => {
      console.log('[voiceService][DEBUG] onSpeechEnd');
      voiceListenActiveRef.current = false;
      if (voiceListenTimeoutRef.current) {
        clearTimeout(voiceListenTimeoutRef.current);
        voiceListenTimeoutRef.current = null;
      }
      if (usingRecorderRef.current) return;
      const manual = manualStopRef.current;
      manualStopRef.current = false;
      if (manual) {
        setPhase('idle');
        return;
      }
      const text = recognizedTextRef.current.trim();
      recognizedTextRef.current = '';
      if (text) {
        setLiveTranscript(text);
        onFinalTextRef.current(text);
        setPhase('idle');
        return;
      }
      // Empty native transcript: do NOT start expo recording here — that runs *after* the user
      // stopped speaking and often uploads silence. Ask for a retry instead.
      console.log('[voiceService][DEBUG] Empty RN transcript — prompt retry');
      setErrorMessage('No speech recognized. Tap the mic again to record your message.');
      setPhase('error');
    };

    Voice.onSpeechError = async (event: any) => {
      console.log('[voiceService][DEBUG] onSpeechError', event);
      voiceListenActiveRef.current = false;
      if (voiceListenTimeoutRef.current) {
        clearTimeout(voiceListenTimeoutRef.current);
        voiceListenTimeoutRef.current = null;
      }
      if (usingRecorderRef.current) return;
      manualStopRef.current = false;
      recognizedTextRef.current = '';
      setErrorMessage(
        event?.error?.message || event?.error?.code?.toString?.() || 'Speech recognition error.'
      );
      setPhase('error');
    };

    return () => {
      clearFallbackTimer();
      clearVoiceListenTimeout();
      Voice.destroy()
        .catch(() => {})
        .finally(() => Voice.removeAllListeners?.());
    };
  }, [clearFallbackTimer, clearVoiceListenTimeout, startFallbackRecording]);

  useEffect(() => {
    return () => {
      clearFallbackTimer();
      clearVoiceListenTimeout();
      const r = recorderRef.current;
      recorderRef.current = null;
      if (r) {
        r.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, [clearFallbackTimer, clearVoiceListenTimeout]);

  const resetError = useCallback(() => {
    setErrorMessage(null);
    setErrorCode(null);
  }, []);

  return {
    phase,
    liveTranscript,
    errorCode,
    errorMessage,
    toggleMic,
    resetError,
  };
}
