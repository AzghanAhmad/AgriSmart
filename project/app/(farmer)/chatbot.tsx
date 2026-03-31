import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  PermissionsAndroid,
} from 'react-native';
import { Send, Mic, MicOff, Bot, User, RotateCcw } from 'lucide-react-native';
import Voice from '@react-native-voice/voice';
import Tts from 'react-native-tts';
import { useApp } from '@/contexts/AppContext';
import { translate } from '@/utils/translations';
import {
  getStoredChatbotSessionId,
  saveChatbotSessionId,
  clearStoredChatbotSessionId,
  sendChatbotMessage,
  resetChatbotServerSession,
} from '@/services/chatbotService';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

function welcomeText(language: 'en' | 'ur'): string {
  if (language === 'ur') {
    return 'السلام علیکم! میں AgriSmart ہوں — گندم، چاول اور کپاس کے بارے میں پوچھ سکتے ہیں۔';
  }
  return "Hello! I'm AgriSmart — ask me about wheat, rice, cotton, pests, or farming in Pakistan.";
}

export default function ChatbotScreen() {
  const { language } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  // Voice status states: Idle → Listening → Processing
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'processing'>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Newly added refs for voice workflow (recognized text + control flags)
  const recognizedTextRef = useRef<string>('');
  const manualStopRef = useRef<boolean>(false);

  const isListening = voiceStatus === 'listening';
  const isProcessing = voiceStatus === 'processing';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await getStoredChatbotSessionId();
      if (!cancelled) {
        setSessionId(stored);
        setMessages([
          {
            id: 'welcome',
            text: welcomeText(language),
            isUser: false,
            timestamp: new Date(),
          },
        ]);
        setSessionReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [language]);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // Newly added: Configure TTS language once (English only: en-US)
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        // Some environments may not have the native TTS module ready yet.
        const getInitStatus = (Tts as any).getInitStatus;
        if (typeof getInitStatus === 'function') {
          const status = await getInitStatus();
          if (cancelled) return;

          // react-native-tts usually returns 'succeeded' / 'failed'
          if (status === 'succeeded') {
            Tts.setDefaultLanguage('en-US');
          }
        } else {
          // Fallback (older versions): attempt directly, but keep it safe.
          try {
            Tts.setDefaultLanguage('en-US');
          } catch {
            // ignore init issues
          }
        }
      } catch {
        // Ignore TTS init errors; we still try speaking inside try/catch later.
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || !sessionReady) {
        return;
      }

      // While the chatbot request is in-flight, we treat this as "Processing"
      setVoiceStatus('processing');

      const userMessage: Message = {
        id: Date.now().toString(),
        text: text.trim(),
        isUser: true,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputText('');

      try {
        const { response, session_id } = await sendChatbotMessage(text.trim(), sessionId);
        setSessionId(session_id);
        await saveChatbotSessionId(session_id);

        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: response,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMessage]);

        // Newly added: Speak bot response aloud (English TTS config)
        try {
          Tts.stop();
        } catch {
          // ignore
        }
        try {
          Tts.speak(response);
        } catch (e) {
          console.warn('TTS error:', e);
        }
      } catch (e: any) {
        const msg =
          e?.message ||
          translate('networkError', language);
        Alert.alert(translate('error', language), msg);
      } finally {
        setVoiceStatus('idle');
      }
    },
    [sessionId, sessionReady, language]
  );

  const handleNewChat = useCallback(async () => {
    try {
      if (sessionId) {
        await resetChatbotServerSession(sessionId);
      }
    } catch {
      // Still clear local session if server reset fails
    }
    await clearStoredChatbotSessionId();
    setSessionId(null);
    setMessages([
      {
        id: 'welcome',
        text: welcomeText(language),
        isUser: false,
        timestamp: new Date(),
      },
    ]);
  }, [sessionId, language]);

  const requestMicPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;

    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
      title: 'Microphone Permission',
      message: 'We need access to your microphone to take voice input.',
      buttonPositive: 'OK',
      buttonNegative: 'Cancel',
    });

    // DEBUG: log permission result
    console.log('[VOICE][DEBUG] RECORD_AUDIO permission result:', result);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }, []);

  // FIX: centralize start logic; prevents overlapping starts and logs root cause
  const startListening = useCallback(async () => {
    if (isProcessing) return;
    if (isListening) return;

    // DEBUG: emulator note (cannot reliably detect without extra deps)
    // If you are testing on an Android emulator, SpeechRecognizer may fail.
    // Prefer testing on a real device.

    const granted = await requestMicPermission();
    if (!granted) {
      Alert.alert('Microphone permission denied', 'Enable microphone access and try again.');
      setVoiceStatus('idle');
      return;
    }

    recognizedTextRef.current = '';
    manualStopRef.current = false;

    try {
      // FIX: ensure prior session isn't still active
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

      setVoiceStatus('listening');
      console.log('[VOICE][DEBUG] Voice.start(en-US) calling...');
      await Voice.start('en-US'); // English only
      console.log('[VOICE][DEBUG] Voice.start(en-US) returned successfully');
    } catch (e: any) {
      console.log('[VOICE][DEBUG] Voice.start failed:', e);
      setVoiceStatus('idle');

      const details =
        e?.message ||
        e?.toString?.() ||
        'Unknown error';

      Alert.alert(
        'Voice error',
        `Could not start voice recognition. Please try again.\n\nDetails: ${details}\n\nIf you're using Expo Go or an emulator, voice recognition may not work—try a real device + a native build.`
      );
    }
  }, [isListening, isProcessing, requestMicPermission]);

  // Newly added: Start/stop listening with real voice recognition
  const handleVoiceInput = useCallback(async () => {
    if (isProcessing) return;

    // Stop if currently listening
    if (isListening) {
      manualStopRef.current = true;
      try {
        await Voice.stop();
      } catch {
        // ignore
      }
      setVoiceStatus('idle');
      return;
    }
    // FIX: single entrypoint for starting
    await startListening();
  }, [isListening, isProcessing, startListening]);

  // Newly added: Voice event wiring + cleanup
  useEffect(() => {
    Voice.onSpeechStart = () => {
      // DEBUG
      console.log('[VOICE][DEBUG] onSpeechStart');
      setVoiceStatus('listening');
    };

    Voice.onSpeechResults = (event: any) => {
      // DEBUG
      console.log('[VOICE][DEBUG] onSpeechResults:', event?.value);
      const text = event?.value?.[0];
      if (typeof text === 'string' && text.trim()) {
        recognizedTextRef.current = text.trim();
      }
    };

    Voice.onSpeechEnd = () => {
      // DEBUG
      console.log('[VOICE][DEBUG] onSpeechEnd');
      const manualStopped = manualStopRef.current;
      manualStopRef.current = false;

      const text = recognizedTextRef.current.trim();
      recognizedTextRef.current = '';

      // If the user stopped manually, don't auto-send.
      if (manualStopped) {
        setVoiceStatus('idle');
        return;
      }

      if (!text) {
        setVoiceStatus('idle');
        Alert.alert('No speech detected', 'Please try again.');
        return;
      }

      // Auto-send recognized speech through the same existing API flow.
      sendMessage(text);
    };

    Voice.onSpeechError = (event: any) => {
      // DEBUG
      console.log('[VOICE][DEBUG] onSpeechError:', event);
      recognizedTextRef.current = '';
      manualStopRef.current = false;
      setVoiceStatus('idle');

      const message =
        event?.error?.message ||
        event?.error?.code ||
        event?.error?.toString?.() ||
        'Speech recognition error. Please try again.';

      Alert.alert('Voice recognition error', message);
    };

    return () => {
      // Cleanup listeners on unmount to avoid duplicate events
      Voice.destroy()
        .catch(() => {
          // ignore
        })
        .finally(() => {
          Voice.removeAllListeners();
        });

      try {
        Tts.stop();
      } catch {
        // ignore
      }
    };
  }, [sendMessage]);

  const quickQuestions = [
    'How to treat wheat rust disease?',
    'gandum mein zang lag gayi hai kya karein',
    'Best time to irrigate rice?',
    'kapas mein keere zyada ho gaye hain',
    'When to apply fertilizer to wheat?',
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Bot color="#22C55E" size={24} />
        </View>
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerTitle}>AgriSmart</Text>
          <Text style={styles.headerSubtitle}>
            {language === 'ur' ? 'ذریعی معاون — بیک اینڈ سے منسلک' : 'Farming assistant — connected to backend'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.newChatButton}
          onPress={handleNewChat}
          accessibilityLabel="New chat"
        >
          <RotateCcw color="#22C55E" size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageWrapper,
              message.isUser ? styles.userMessageWrapper : styles.botMessageWrapper,
            ]}
          >
            <View style={styles.messageHeader}>
              <View
                style={[
                  styles.messageIcon,
                  message.isUser ? styles.userIcon : styles.botIcon,
                ]}
              >
                {message.isUser ? (
                  <User color="white" size={16} />
                ) : (
                  <Bot color="white" size={16} />
                )}
              </View>
            </View>
            <View
              style={[
                styles.messageBubble,
                message.isUser ? styles.userMessage : styles.botMessage,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  message.isUser ? styles.userMessageText : styles.botMessageText,
                ]}
              >
                {message.text}
              </Text>
              <Text style={styles.messageTime}>
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>
        ))}

        {isProcessing && (
          <View style={styles.typingIndicator}>
            <View style={styles.botIconWrap}>
              <Bot color="white" size={16} />
            </View>
            <View style={styles.typingBubble}>
              <Text style={styles.typingText}>
                {language === 'ur' ? 'جواب تیار ہو رہا ہے…' : 'Thinking…'}
              </Text>
              <View style={styles.typingDots}>
                <View style={[styles.dot, styles.dot1]} />
                <View style={[styles.dot, styles.dot2]} />
                <View style={[styles.dot, styles.dot3]} />
              </View>
            </View>
          </View>
        )}

        {messages.length === 1 && !isProcessing && (
          <View style={styles.quickQuestionsContainer}>
            <Text style={styles.quickQuestionsTitle}>
              {language === 'ur' ? 'فوری سوالات:' : 'Quick questions:'}
            </Text>
            {quickQuestions.map((question, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickQuestionButton}
                onPress={() => sendMessage(question)}
              >
                <Text style={styles.quickQuestionText}>{question}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            placeholder={
              language === 'ur'
                ? 'فصل، بیماری، کھاد، آبپاشی…'
                : 'Ask about crops, disease, fertilizer, irrigation…'
            }
            placeholderTextColor="#9CA3AF"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!isProcessing}
          />

          <TouchableOpacity
            style={[styles.voiceButton, isListening && styles.recordingButton]}
            onPress={handleVoiceInput}
            accessibilityLabel="Voice input"
          >
            {isListening ? (
              <MicOff color="white" size={20} />
            ) : (
              <Mic color="#6B7280" size={20} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.disabledButton]}
            onPress={() => {
              sendMessage(inputText);
            }}
            disabled={!inputText.trim() || isProcessing || isListening}
          >
            <Send color="white" size={20} />
          </TouchableOpacity>
        </View>

        {/* Newly added: Listening indicator */}
        {isListening && (
          <View style={styles.listeningIndicator}>
            <Text style={styles.listeningText}>Listening...</Text>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextBlock: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  newChatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  userMessageWrapper: {
    justifyContent: 'flex-end',
  },
  botMessageWrapper: {
    justifyContent: 'flex-start',
  },
  messageHeader: {
    width: 32,
  },
  messageIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userIcon: {
    backgroundColor: '#3B82F6',
  },
  botIcon: {
    backgroundColor: '#22C55E',
  },
  botIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userMessage: {
    backgroundColor: '#3B82F6',
  },
  botMessage: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: 'white',
  },
  botMessageText: {
    color: '#374151',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 6,
    opacity: 0.7,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  typingBubble: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typingText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  typingDots: {
    flexDirection: 'row',
    gap: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#9CA3AF',
  },
  dot1: {},
  dot2: {},
  dot3: {},
  quickQuestionsContainer: {
    marginTop: 16,
    gap: 8,
  },
  quickQuestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  quickQuestionButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  quickQuestionText: {
    fontSize: 14,
    color: '#22C55E',
    fontWeight: '500',
  },
  inputContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    backgroundColor: '#F9FAFB',
  },
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingButton: {
    backgroundColor: '#EF4444',
  },
  // Newly added: minimal listening feedback
  listeningIndicator: {
    marginTop: 8,
    alignItems: 'center',
  },
  listeningText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
  },
});