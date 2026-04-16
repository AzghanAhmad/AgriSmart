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

try:
    from .roman_urdu import FORCE_ROMAN_URDU, contains_urdu, urdu_to_roman
except ImportError:
    from roman_urdu import FORCE_ROMAN_URDU, contains_urdu, urdu_to_roman

voice_bp = Blueprint('voice', __name__, url_prefix='/api/voice')

_WHISPER_ROMAN_URDU_PROMPT = """The following speech is in Urdu.
Transcribe it in Roman Urdu using English letters only.
Do not translate to English.
Do not output Urdu script.
Example: mujhe gandum k bary ma btay"""

_WHISPER_ROMAN_URDU_PROMPT_STRONG = (
    _WHISPER_ROMAN_URDU_PROMPT
    + "\n\nRepeat: write Urdu sounds as Latin letters only (Roman Urdu). Never answer in English."
)

# Common English tokens — if many appear in a clip we expected as Urdu, retry with stronger prompt.
_ENGLISH_STT_HINT = frozenset({
    'what', 'the', 'is', 'are', 'was', 'were', 'tell', 'please', 'thank', 'thanks',
    'hello', 'hi', 'how', 'when', 'where', 'why', 'who', 'this', 'that', 'these', 'those',
    'you', 'your', 'can', 'could', 'would', 'should', 'about', 'with', 'from', 'have', 'has',
    'me', 'my', 'do', 'does', 'did', 'want', 'need', 'know', 'like', 'just', 'not', 'for', 'and',
})

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


def _normalize_stt_language(raw: str | None) -> str | None:
    """
    Map client values (ur-PK, urdu, en-US) to Whisper: strictly 'ur' or 'en'.
    Anything else / empty / auto / unknown → None (omit language = Whisper auto-detect).
    """
    s = (raw or '').strip().lower().replace('_', '-')
    if not s or s in ('auto', 'unknown'):
        return None
    if s.startswith('ur') or s.split('-')[0] == 'urdu':
        return 'ur'
    if s.startswith('en') or s.split('-')[0] in ('eng', 'english'):
        return 'en'
    return None


def _output_looks_english_heavy_for_urdu_expected(text: str) -> bool:
    """Heuristic: Latin transcript looks like English, not Roman Urdu."""
    if not text or contains_urdu(text):
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


def _transcribe_whisper(
    path: str,
    whisper_lang: str | None,
    *,
    roman_urdu_prompt: bool = False,
    strong_roman_prompt: bool = False,
) -> str:
    model = _whisper_load()
    if model is None:
        raise RuntimeError('whisper_unavailable')
    import whisper

    kwargs: dict = {'task': 'transcribe'}
    if whisper_lang:
        kwargs['language'] = whisper_lang

    if roman_urdu_prompt and whisper_lang == 'ur' and FORCE_ROMAN_URDU:
        kwargs['initial_prompt'] = (
            _WHISPER_ROMAN_URDU_PROMPT_STRONG if strong_roman_prompt else _WHISPER_ROMAN_URDU_PROMPT
        )

    _stt_debug(f'STT Whisper call: language={kwargs.get("language")!r} task={kwargs.get("task")!r} '
               f'roman_prompt={roman_urdu_prompt} strong={strong_roman_prompt}')

    result = model.transcribe(path, **kwargs)
    text = (result.get('text') or '').strip()
    _stt_debug(f'Raw Whisper Output: {text!r}')
    return text


def _apply_roman_urdu_postprocess(text: str) -> str:
    """If Arabic-script Urdu remains, transliterate to Roman Urdu (no-op for pure Latin)."""
    if not FORCE_ROMAN_URDU or not text:
        return text
    raw = text.strip()
    if not contains_urdu(raw):
        return text
    roman = urdu_to_roman(raw)
    if has_app_context():
        current_app.logger.info('STT Roman Urdu: before=%r after=%r', raw, roman)
    else:
        logging.getLogger(__name__).info('STT Roman Urdu: before=%r after=%r', raw, roman)
    return roman


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
    """Decode any ffmpeg-supported input to 16 kHz mono PCM WAV for Whisper."""
    _ensure_ffmpeg_on_path()
    if not shutil.which('ffmpeg'):
        return None
    fd, out = tempfile.mkstemp(suffix='.wav')
    os.close(fd)
    try:
        subprocess.run(
            [
                'ffmpeg',
                '-y',
                '-i',
                src,
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

        wav_path = _ffmpeg_to_wav_mono16k(tmp_path)
        path_for_stt = wav_path or tmp_path
        if wav_path:
            current_app.logger.info('STT: using ffmpeg-normalized wav (%s bytes)', os.path.getsize(wav_path))

        text = ''
        if has_whisper:
            try:
                raw_lang = (language or '').strip()
                whisper_lang = _normalize_stt_language(raw_lang)
                _stt_debug(f'Detected language param (raw): {raw_lang!r} → whisper: {whisper_lang!r}')

                roman_prompt = bool(whisper_lang == 'ur' and FORCE_ROMAN_URDU)
                text = _transcribe_whisper(
                    path_for_stt,
                    whisper_lang,
                    roman_urdu_prompt=roman_prompt,
                    strong_roman_prompt=False,
                )

                # Never fall back to Whisper auto-detect for Urdu — that often picks English.
                if not text.strip() and whisper_lang and whisper_lang != 'ur':
                    _stt_debug(f'STT: empty with language={whisper_lang!r}, retrying auto-detect')
                    text = _transcribe_whisper(
                        path_for_stt,
                        None,
                        roman_urdu_prompt=False,
                        strong_roman_prompt=False,
                    )

                if (
                    whisper_lang == 'ur'
                    and text.strip()
                    and FORCE_ROMAN_URDU
                    and _output_looks_english_heavy_for_urdu_expected(text)
                ):
                    _stt_debug('STT: Urdu expected but output looks English-heavy; retry with stronger Roman Urdu prompt')
                    text = _transcribe_whisper(
                        path_for_stt,
                        'ur',
                        roman_urdu_prompt=True,
                        strong_roman_prompt=True,
                    )
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
                if code == 'whisper_unavailable':
                    text = ''
                else:
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

        if not text and has_vosk:
            vosk_try = path_for_stt if path_for_stt.endswith('.wav') else tmp_path
            vosk_text = _transcribe_vosk_wav(vosk_try)
            if vosk_text:
                text = vosk_text

        text = _apply_roman_urdu_postprocess(text)

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
