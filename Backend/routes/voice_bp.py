# Speech-to-text and text-to-speech routes (local Whisper / optional Vosk / pyttsx3 / gTTS).
# Register: app.register_blueprint(voice_bp)

from __future__ import annotations

import os
import re
import uuid
import wave
import json
import shutil
import subprocess
import tempfile

import logging

from flask import Blueprint, request, jsonify, current_app, has_app_context

voice_bp = Blueprint('voice', __name__, url_prefix='/api/voice')

_URDU_CHAR_RE = re.compile(r'[\u0600-\u06FF]')
_WS_COLLAPSE_RE = re.compile(r'\s+')
_ENGLISH_STT_HINT = frozenset(
    {
        'what',
        'tell',
        'line',
        'hello',
        'how',
        'is',
        'the',
        'are',
        'where',
        'when',
        'why',
        'please',
    }
)

# Google Cloud Speech-to-Text fallback control:
# - GOOGLE_STT_ENABLED=true/1/yes/on  => force enable
# - GOOGLE_STT_ENABLED=false/0/no/off => force disable
# - unset                             => auto-enable if credentials env is present
_GOOGLE_STT_ENABLED_RAW = os.getenv('GOOGLE_STT_ENABLED', '').strip().lower()

# Lazy-loaded Whisper model (global, loaded once)
_whisper_model = None

# Lazy-loaded Vosk model (global, loaded once)
_vosk_model = None

# Whisper's load_audio() invokes `ffmpeg` via subprocess; Windows often lacks it on PATH.
_ffmpeg_path_prepared = False


def _ensure_ffmpeg_on_path() -> None:
    """Prepend imageio-ffmpeg's bundled ffmpeg to PATH if system ffmpeg is missing."""
    global _ffmpeg_path_prepared
    # If ffmpeg is already available, nothing to do.
    if shutil.which('ffmpeg'):
        return
    try:
        import imageio_ffmpeg

        exe = imageio_ffmpeg.get_ffmpeg_exe()
        # Whisper shells out to the literal command `ffmpeg` / `ffmpeg.exe`.
        # imageio-ffmpeg's binary name is versioned (e.g. ffmpeg-win-...exe),
        # so `shutil.which("ffmpeg")` won't find it. Create a small shim named
        # `ffmpeg.exe` and prepend its folder to PATH.
        shim_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ffmpeg_shim'))
        os.makedirs(shim_dir, exist_ok=True)
        shim_exe = os.path.join(shim_dir, 'ffmpeg.exe')
        if not os.path.isfile(shim_exe):
            shutil.copyfile(exe, shim_exe)

        os.environ['PATH'] = shim_dir + os.pathsep + os.environ.get('PATH', '')
        current_app.logger.info('Using ffmpeg shim from imageio-ffmpeg: %s -> %s', exe, shim_exe)
        current_app.logger.info('ffmpeg which after ensure: %s', shutil.which('ffmpeg'))
        _ffmpeg_path_prepared = True
    except Exception as e:
        current_app.logger.warning('Could not add bundled ffmpeg to PATH: %s', e)
        _ffmpeg_path_prepared = True


def _stt_debug(msg: str) -> None:
    """User-requested visibility: print + logger."""
    print(msg)
    try:
        current_app.logger.info(msg)
    except RuntimeError:
        logging.getLogger(__name__).info(msg)


def _is_google_stt_enabled() -> bool:
    if _GOOGLE_STT_ENABLED_RAW in ('1', 'true', 'yes', 'on'):
        return True
    if _GOOGLE_STT_ENABLED_RAW in ('0', 'false', 'no', 'off'):
        return False
    # Auto mode: enable when credentials path is present.
    creds = os.getenv('GOOGLE_APPLICATION_CREDENTIALS', '').strip()
    return bool(creds)


def _google_language_code(whisper_lang: str) -> str:
    # Prefer regional variants Google models are tuned for
    if whisper_lang == 'ur':
        return os.getenv('GOOGLE_STT_URDU_CODE', 'ur-PK').strip() or 'ur-PK'
    return os.getenv('GOOGLE_STT_ENGLISH_CODE', 'en-US').strip() or 'en-US'


def _google_stt_transcribe(wav_path: str, whisper_lang: str) -> str | None:
    """
    Google Cloud Speech-to-Text fallback.
    Requires env GOOGLE_APPLICATION_CREDENTIALS (service account JSON) or ADC.
    """
    if not _is_google_stt_enabled():
        _stt_debug(
            'Google STT skipped: disabled (set GOOGLE_STT_ENABLED=true or provide '
            'GOOGLE_APPLICATION_CREDENTIALS for auto-enable)'
        )
        return None
    try:
        from google.cloud import speech  # type: ignore
    except Exception as e:
        current_app.logger.warning('Google STT not available (missing dependency): %s', e)
        return None

    try:
        with open(wav_path, 'rb') as f:
            content = f.read()

        client = speech.SpeechClient()
        audio = speech.RecognitionAudio(content=content)
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=16000,
            language_code=_google_language_code(whisper_lang),
            enable_automatic_punctuation=True,
            # Keep it stable; avoid creative decoding
            use_enhanced=True,
        )

        _stt_debug(f'Google STT call: language_code={config.language_code!r} bytes={len(content)}')
        response = client.recognize(config=config, audio=audio)
        texts: list[str] = []
        for r in response.results:
            alt = r.alternatives[0].transcript if r.alternatives else ''
            if alt:
                texts.append(alt)
        out = ' '.join(texts).strip()
        _stt_debug(f'Google STT Output: {out!r}')
        return out or None
    except Exception as e:
        current_app.logger.warning('Google STT failed: %s', e)
        return None


def _normalize_urdu_text(text: str) -> str:
    """
    Normalize common Urdu Unicode variants and collapse extra spaces.
    Keeps only text cleanup; no semantic rewriting.
    """
    if not text:
        return ''
    t = text
    # Farsi Yeh / Alef Maksura -> Urdu Yeh
    t = t.replace('\u064A', '\u06CC').replace('\u0649', '\u06CC')
    # Heh Goal and Teh Marbuta -> Do Chashmi Heh
    t = t.replace('\u06C1', '\u06BE').replace('\u0629', '\u06BE')
    # Tatweel and Arabic diacritics
    t = t.replace('\u0640', '')
    t = re.sub(r'[\u064B-\u065F\u0670]', '', t)
    # Urdu punctuation normalization
    t = t.replace('،', '، ').replace('۔', '۔ ')
    t = _WS_COLLAPSE_RE.sub(' ', t).strip()
    return t


def _postprocess_urdu(text: str) -> str:
    """
    Light rule-based fixes for common Urdu OCR/STT mistakes.
    Intentionally conservative: only a few high-confidence replacements.
    """
    if not text:
        return ''
    fixes = {
        'هے': 'ہے',
        'تھیک': 'ٹھیک',
        'هوں': 'ہوں',
    }
    out = text
    for wrong, right in fixes.items():
        out = out.replace(wrong, right)
    return out


def _normalize_stt_language(raw: str | None) -> str:
    """Map incoming locale strings to explicit STT languages supported by this route."""
    s = (raw or '').strip().lower().replace('_', '-')
    if s.startswith('ur'):
        return 'ur'
    return 'en'


def _urdu_ratio(text: str) -> float:
    """Return ratio of Urdu-script chars among visible non-space chars."""
    if not text:
        return 0.0
    visible = [ch for ch in text if not ch.isspace()]
    if not visible:
        return 0.0
    urdu_count = sum(1 for ch in visible if _URDU_CHAR_RE.match(ch))
    return urdu_count / len(visible)


def _is_mostly_urdu(text: str, threshold: float = 0.60) -> bool:
    return _urdu_ratio(text) >= threshold


def _output_looks_english_heavy(text: str) -> bool:
    """Heuristic for obvious bad STT output before Urdu validation."""
    if not text:
        return False
    tokens = re.findall(r'[a-zA-Z]+', text.lower())
    if len(tokens) < 2:
        return False
    hits = sum(1 for t in tokens if t in _ENGLISH_STT_HINT)
    if len(tokens) <= 6:
        return hits >= 2
    return hits >= max(3, len(tokens) // 5)


def _whisper_load():
    """FIX: Load Whisper once; return model or None if unavailable."""
    global _whisper_model
    if _whisper_model is False:
        return None
    if _whisper_model is not None:
        return _whisper_model
    try:
        import whisper

        size = os.getenv('WHISPER_MODEL', 'tiny').strip() or 'tiny'
        _whisper_model = whisper.load_model(size)
        return _whisper_model
    except Exception as e:
        current_app.logger.warning('Whisper not available: %s', e)
        _whisper_model = False
        return None


def _whisper_quality(result: dict) -> dict:
    """
    Extract lightweight quality signals from Whisper output.
    - avg_logprob: higher (closer to 0) is better
    - no_speech_prob: higher means likely silence
    - compression_ratio: very high can indicate hallucination/repetition
    """
    segs = result.get('segments') or []
    if not isinstance(segs, list):
        segs = []

    avg_logprobs: list[float] = []
    no_speech_probs: list[float] = []
    compression_ratios: list[float] = []
    for s in segs:
        if not isinstance(s, dict):
            continue
        v = s.get('avg_logprob')
        if isinstance(v, (int, float)):
            avg_logprobs.append(float(v))
        v = s.get('no_speech_prob')
        if isinstance(v, (int, float)):
            no_speech_probs.append(float(v))
        v = s.get('compression_ratio')
        if isinstance(v, (int, float)):
            compression_ratios.append(float(v))

    def mean(xs: list[float]) -> float | None:
        return (sum(xs) / len(xs)) if xs else None

    return {
        'segments': len(segs),
        'avg_logprob_mean': mean(avg_logprobs),
        'no_speech_prob_mean': mean(no_speech_probs),
        'compression_ratio_mean': mean(compression_ratios),
    }


def _should_retry_whisper(text: str, whisper_lang: str, quality: dict) -> bool:
    """Decide retry based on Urdu validation + Whisper quality signals."""
    if not text or len(text.strip()) < 3:
        return True

    if whisper_lang != 'ur':
        return False

    if not _is_mostly_urdu(text) or _output_looks_english_heavy(text):
        return True

    # Use Whisper quality signals when present.
    # Conservative thresholds (avoid unnecessary retries).
    avg_lp = quality.get('avg_logprob_mean')
    no_sp = quality.get('no_speech_prob_mean')
    comp = quality.get('compression_ratio_mean')

    if isinstance(no_sp, (int, float)) and no_sp >= 0.85:
        return True
    if isinstance(avg_lp, (int, float)) and avg_lp <= -1.25:
        return True
    if isinstance(comp, (int, float)) and comp >= 3.0:
        return True

    return False


def _transcribe_whisper(
    path: str,
    whisper_lang: str = 'ur',
    *,
    temperature: float = 0.0,
) -> tuple[str, dict]:
    model = _whisper_load()
    if model is None:
        raise RuntimeError('whisper_unavailable')
    import whisper

    kwargs: dict = {
        'language': whisper_lang,
        'task': 'transcribe',
        'temperature': float(temperature),
        'beam_size': 10,
        'best_of': 10,
        'condition_on_previous_text': False,
        'compression_ratio_threshold': 2.4,
        'logprob_threshold': -1.0,
        'no_speech_threshold': 0.6,
    }
    _stt_debug(
        'STT Whisper call: '
        f'language={kwargs.get("language")!r} task={kwargs.get("task")!r} '
        f'temperature={kwargs.get("temperature")} beam_size={kwargs.get("beam_size")} '
        f'best_of={kwargs.get("best_of")} condition_on_previous_text={kwargs.get("condition_on_previous_text")} '
        f'compression_ratio_threshold={kwargs.get("compression_ratio_threshold")} '
        f'logprob_threshold={kwargs.get("logprob_threshold")} '
        f'no_speech_threshold={kwargs.get("no_speech_threshold")}'
    )

    result = model.transcribe(path, **kwargs)
    text = (result.get('text') or '').strip()
    detected = result.get('language')
    _stt_debug(f'Whisper detected language: {detected!r}')
    _stt_debug(f'Raw Whisper Output: {text!r}')
    q = _whisper_quality(result if isinstance(result, dict) else {})
    _stt_debug(f'Whisper quality: {q}')
    return text, q


def _vosk_load():
    """Optional Vosk: set VOSK_MODEL_PATH to extracted model directory."""
    global _vosk_model
    if _vosk_model is False:
        return None
    if _vosk_model is not None:
        return _vosk_model
    model_path = os.getenv('VOSK_MODEL_PATH', '').strip()
    if not model_path or not os.path.isdir(model_path):
        _vosk_model = False
        return None
    try:
        from vosk import Model

        _vosk_model = Model(model_path)
        return _vosk_model
    except Exception as e:
        current_app.logger.warning('Vosk not available: %s', e)
        _vosk_model = False
        return None


def _transcribe_vosk_wav(path: str) -> str | None:
    """Transcribe 16-bit mono PCM WAV via Vosk (optional fallback)."""
    model = _vosk_load()
    if model is None:
        return None
    try:
        from vosk import KaldiRecognizer

        wf = wave.open(path, 'rb')
        if wf.getnchannels() != 1 or wf.getsampwidth() != 2 or wf.getcomptype() != 'NONE':
            wf.close()
            return None
        rec = KaldiRecognizer(model, wf.getframerate())
        rec.SetWords(True)
        while True:
            data = wf.readframes(4000)
            if len(data) == 0:
                break
            rec.AcceptWaveform(data)
        wf.close()
        res = json.loads(rec.FinalResult())
        return (res.get('text') or '').strip() or None
    except Exception as e:
        current_app.logger.warning('Vosk transcription failed: %s', e)
        return None


def _ffmpeg_to_wav_mono16k(src: str) -> str | None:
    """Decode input to 16 kHz mono PCM WAV and normalize volume."""
    _ensure_ffmpeg_on_path()
    if not shutil.which('ffmpeg'):
        return None
    fd, out = tempfile.mkstemp(suffix='.wav')
    os.close(fd)
    try:
        # `loudnorm` is a good single-pass normalizer for noisy phone recordings.
        # We keep it simple (no 2-pass) to limit latency.
        afilter = os.getenv('VOICE_FFMPEG_AF', '').strip() or 'loudnorm=I=-16:TP=-1.5:LRA=11'
        subprocess.run(
            [
                'ffmpeg',
                '-y',
                '-i',
                src,
                '-af',
                afilter,
                '-ar',
                '16000',
                '-ac',
                '1',
                '-c:a',
                'pcm_s16le',
                out,
            ],
            check=True,
            capture_output=True,
            timeout=120,
        )
        if os.path.isfile(out) and os.path.getsize(out) > 64:
            return out
    except Exception as e:
        current_app.logger.warning('ffmpeg wav conversion failed: %s', e)
    try:
        os.unlink(out)
    except OSError:
        pass
    return None


def preprocess_audio(input_path: str) -> str | None:
    """
    Preprocess for STT:
    - decode any input to 16kHz mono PCM WAV
    - normalize volume (via ffmpeg filter)

    Returns a temp wav path (caller must delete) or None if preprocessing unavailable.
    """
    return _ffmpeg_to_wav_mono16k(input_path)


def _ensure_voice_dir() -> str:  # FIX: single output directory for generated audio
    root = current_app.static_folder or 'static'
    out = os.path.join(root, 'voice')
    os.makedirs(out, exist_ok=True)
    return out


@voice_bp.route('/stt', methods=['POST'])
def stt():
    """Receive audio file; return {\"text\": \"...\"}."""
    tmp_path = None
    wav_path = None
    try:
        if 'audio' not in request.files and 'file' not in request.files:
            return jsonify({'error': 'missing audio file (field: audio or file)'}), 400
        upload = request.files.get('audio') or request.files.get('file')
        language = (
            request.form.get('language')
            or request.args.get('language')
            or ''
        ).strip()

        suffix = os.path.splitext(upload.filename or '')[1] or '.webm'
        fd, tmp_path = tempfile.mkstemp(suffix=suffix)
        os.close(fd)
        upload.save(tmp_path)
        raw_size = os.path.getsize(tmp_path)
        current_app.logger.info('STT upload: bytes=%s name=%s', raw_size, upload.filename)

        if raw_size < 256:
            current_app.logger.warning('STT: upload very small (%s bytes), likely silent clip', raw_size)

        # FIX: require at least one local STT engine
        has_whisper = _whisper_load() is not None
        has_vosk = _vosk_load() is not None
        if not has_whisper and not has_vosk:
            return jsonify({
                'error': 'stt_unavailable',
                'hint': 'Install openai-whisper (and ffmpeg) or set VOSK_MODEL_PATH. See Backend/requirements-voice.txt',
            }), 503

        _ensure_ffmpeg_on_path()
        if has_whisper and not shutil.which('ffmpeg'):
            return jsonify({
                'error': 'ffmpeg_missing',
                'hint': (
                    'Whisper needs ffmpeg. Run: pip install imageio-ffmpeg '
                    'or install ffmpeg and add it to PATH (winget install ffmpeg).'
                ),
            }), 503

        # Audio preprocessing: 16 kHz mono WAV + volume normalization via ffmpeg.
        wav_path = preprocess_audio(tmp_path)
        path_for_stt = wav_path or tmp_path
        if wav_path:
            current_app.logger.info('STT: using ffmpeg-normalized wav (%s bytes)', os.path.getsize(wav_path))

        text = ''
        raw_lang = (language or '').strip()
        whisper_lang = _normalize_stt_language(raw_lang)
        _stt_debug(f'Detected language param (raw): {raw_lang!r} → whisper: {whisper_lang!r}')

        # Policy:
        # - Urdu voice: Google Cloud STT as primary, Whisper as backup
        # - English voice: Whisper as primary, Google as fallback
        if whisper_lang == 'ur':
            # 1) Google primary for Urdu
            google_text = _google_stt_transcribe(path_for_stt, 'ur')
            if google_text:
                text = _postprocess_urdu(_normalize_urdu_text(google_text))
                ratio = _urdu_ratio(text)
                _stt_debug(f'Google Urdu validation: ratio={ratio:.3f} mostly_urdu={_is_mostly_urdu(text)}')
                if _is_mostly_urdu(text) and not _output_looks_english_heavy(text):
                    return jsonify({'text': text})

            # 2) Whisper backup for Urdu (only when Google is unavailable/low quality)
            q: dict = {}
            if has_whisper:
                try:
                    text, q = _transcribe_whisper(path_for_stt, 'ur', temperature=0.0)
                except RuntimeError as e:
                    code = str(e)
                    if code == 'ffmpeg_missing':
                        return jsonify({
                            'error': 'ffmpeg_missing',
                            'hint': (
                                'pip install imageio-ffmpeg or add ffmpeg to PATH '
                                '(https://ffmpeg.org/download.html).'
                            ),
                        }), 503
                    text = ''
                except FileNotFoundError as e:
                    current_app.logger.exception('Whisper STT (ffmpeg not found): %s', e)
                    return jsonify({
                        'error': 'ffmpeg_missing',
                        'hint': 'ffmpeg executable not found. pip install imageio-ffmpeg and restart the server.',
                    }), 503
                except Exception:
                    current_app.logger.exception('Whisper STT error')
                    text = ''

            text = _normalize_urdu_text(text)
            needs_retry = _should_retry_whisper(text, 'ur', q)
            if needs_retry and has_whisper:
                _stt_debug('STT Urdu backup: retrying Whisper with temperature=0.2')
                try:
                    alt, _alt_q = _transcribe_whisper(path_for_stt, 'ur', temperature=0.2)
                    alt = _normalize_urdu_text(alt)
                    if alt and _is_mostly_urdu(alt) and not _output_looks_english_heavy(alt):
                        text = alt
                        needs_retry = False
                except Exception as e:  # pragma: no cover
                    current_app.logger.warning('Whisper Urdu backup retry failed: %s', e)

            if needs_retry:
                return jsonify(
                    {
                        'text': '',
                        'error': 'speech_unclear',
                        'hint': 'Speech unclear, please speak in Urdu',
                    }
                )

            text = _postprocess_urdu(text)
        else:
            # English: Whisper primary
            q: dict = {}
            if has_whisper:
                try:
                    text, q = _transcribe_whisper(path_for_stt, 'en', temperature=0.0)
                except RuntimeError as e:
                    code = str(e)
                    if code == 'ffmpeg_missing':
                        return jsonify({
                            'error': 'ffmpeg_missing',
                            'hint': (
                                'pip install imageio-ffmpeg or add ffmpeg to PATH '
                                '(https://ffmpeg.org/download.html).'
                            ),
                        }), 503
                    text = ''
                except FileNotFoundError as e:
                    current_app.logger.exception('Whisper STT (ffmpeg not found): %s', e)
                    return jsonify({
                        'error': 'ffmpeg_missing',
                        'hint': 'ffmpeg executable not found. pip install imageio-ffmpeg and restart the server.',
                    }), 503
                except Exception:
                    current_app.logger.exception('Whisper STT error')
                    text = ''

            text = _WS_COLLAPSE_RE.sub(' ', (text or '').strip())
            # English fallback to Google if Whisper failed
            if not text or len(text) < 2:
                google_text = _google_stt_transcribe(path_for_stt, 'en')
                if google_text:
                    text = _WS_COLLAPSE_RE.sub(' ', google_text.strip())

        return jsonify({'text': text})
    except Exception as e:
        current_app.logger.exception('STT endpoint error')
        return jsonify({'error': 'stt_failed', 'details': str(e)}), 500
    finally:
        if wav_path and os.path.isfile(wav_path):
            try:
                os.unlink(wav_path)
            except OSError:
                pass
        if tmp_path and os.path.isfile(tmp_path):
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


@voice_bp.route('/tts', methods=['POST'])
def tts():
    """Input JSON {\"text\": \"...\", \"language\": \"en\"}; return {\"url\": \"/static/voice/...\"}."""
    data = request.get_json(silent=True) or {}
    text = (data.get('text') or '').strip()
    language = (data.get('language') or 'en').strip().lower().split('-')[0] or 'en'
    if not text:
        return jsonify({'error': 'text is required'}), 400

    try:
        voice_dir = _ensure_voice_dir()
        file_id = uuid.uuid4().hex

        # FIX: Try offline pyttsx3 first (writes WAV on many platforms)
        try:
            import pyttsx3

            wav_name = f'{file_id}.wav'
            wav_path = os.path.join(voice_dir, wav_name)
            engine = pyttsx3.init()
            engine.save_to_file(text, wav_path)
            engine.runAndWait()
            if os.path.isfile(wav_path) and os.path.getsize(wav_path) > 0:
                return jsonify({'url': f'/static/voice/{wav_name}', 'format': 'wav'})
        except Exception as e:
            current_app.logger.debug('pyttsx3 TTS failed: %s', e)

        # FIX: Fallback gTTS (requires network; no API key)
        try:
            from gtts import gTTS

            mp3_name = f'{file_id}.mp3'
            mp3_path = os.path.join(voice_dir, mp3_name)
            gTTS(text=text, lang=language).save(mp3_path)
            return jsonify({'url': f'/static/voice/{mp3_name}', 'format': 'mp3'})
        except Exception as e:
            current_app.logger.exception('gTTS failed')
            return jsonify({'error': 'tts_failed', 'details': str(e)}), 500
    except Exception as e:
        current_app.logger.exception('TTS endpoint error')
        return jsonify({'error': 'tts_failed', 'details': str(e)}), 500
