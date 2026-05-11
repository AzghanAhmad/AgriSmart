from flask import Flask, request, jsonify, Response, send_file, make_response
from flask_cors import CORS
from werkzeug.utils import safe_join
import os
import sys
import logging
import requests
from sqlalchemy import text

# Ensure sibling packages (e.g. common/) are importable when running:
#   cd Backend && python app.py
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

try:
    from .db import Base, engine
    from .schemas.chat_conversation import ChatConversation, ChatMessage  # noqa: F401 — register tables
    from .schemas.subsidy import SubsidyProgram  # noqa: F401 — register tables
    from .schemas.subsidy_application import SubsidyApplication  # noqa: F401 — register tables
    from .schemas.system_setting import SystemSetting  # noqa: F401 — register tables
    from .routes.farmer import farmer_bp
    from .routes.admin import admin_bp
    from .routes.auth import auth_bp
    from .routes.support import support_bp
    from .routes.guidance import guidance_bp
    from .routes.schedule import schedule_bp
    from .routes.timelapse import timelapse_bp
    from .routes.chatbot_bp import chatbot_bp
    from .routes.voice_bp import voice_bp
    from .modules.yield_estimation import yield_estimation_bp
    from .services.yolo_client import predict_from_filestorage
    from .config import (
        get_allowed_origins,
        get_upload_root,
        get_secret_key,
        get_chatbot_service_url,
        get_enable_local_chatbot_fallback,
        get_enable_local_yolo_fallback,
        get_internal_http_timeout,
    )
    from .core.seed_guidance import seed_guidance_if_needed
    from .core.seed_schedules import seed_schedules_if_needed
    from common.logging_utils import configure_logging
except ImportError:
    # Fallback for running as a script: python Backend/app.py
    from db import Base, engine
    from schemas.chat_conversation import ChatConversation, ChatMessage  # noqa: F401
    from schemas.subsidy import SubsidyProgram  # noqa: F401
    from schemas.subsidy_application import SubsidyApplication  # noqa: F401
    from schemas.system_setting import SystemSetting  # noqa: F401
    from routes.farmer import farmer_bp
    from routes.admin import admin_bp
    from routes.auth import auth_bp
    from routes.support import support_bp
    from routes.guidance import guidance_bp
    from routes.schedule import schedule_bp
    from routes.timelapse import timelapse_bp
    from routes.chatbot_bp import chatbot_bp
    from routes.voice_bp import voice_bp
    from modules.yield_estimation import yield_estimation_bp
    from services.yolo_client import predict_from_filestorage
    from config import (
        get_allowed_origins,
        get_upload_root,
        get_secret_key,
        get_chatbot_service_url,
        get_enable_local_chatbot_fallback,
        get_enable_local_yolo_fallback,
        get_internal_http_timeout,
    )
    from core.seed_guidance import seed_guidance_if_needed
    from core.seed_schedules import seed_schedules_if_needed
    from common.logging_utils import configure_logging

app = Flask(__name__, static_folder='static', static_url_path='/static')
logger = configure_logging("backend")
logger.info("Backend service starting")
# Timelapse JSON uploads send multiple base64 images; allow a generous body size
app.config['MAX_CONTENT_LENGTH'] = 48 * 1024 * 1024
# Configure CORS via env; default to permissive in dev
allowed_origins = get_allowed_origins()
if allowed_origins == '*':
    CORS(app)
else:
    CORS(app, resources={r"/*": {"origins": [o.strip() for o in allowed_origins.split(',') if o.strip()]}})

# Static uploads (served under /static/uploads/...)
# Note: static_folder is set in Flask() constructor above
uploads_root = get_upload_root()
if not os.path.isabs(uploads_root):
    uploads_root = os.path.join(app.static_folder, 'uploads')
os.makedirs(uploads_root, exist_ok=True)
app.config['UPLOAD_FOLDER'] = uploads_root
app.config['SECRET_KEY'] = get_secret_key()
chatbot_service_url = get_chatbot_service_url().rstrip("/")
internal_http_timeout = get_internal_http_timeout()
enable_local_yolo_fallback = get_enable_local_yolo_fallback()
enable_local_chatbot_fallback = get_enable_local_chatbot_fallback()
logger.info(
    "Execution mode | yolo_fallback=%s | chatbot_fallback=%s",
    "enabled" if enable_local_yolo_fallback else "disabled",
    "enabled" if enable_local_chatbot_fallback else "disabled",
)
logger.info(
    "Service endpoints | yolo=%s | chatbot=%s",
    os.getenv("YOLO_SERVICE_URL", "").strip() or "<not-set>",
    chatbot_service_url or "<not-set>",
)
if enable_local_yolo_fallback:
    try:
        try:
            from .core.yolo import validate_dvc_model_paths  # type: ignore
        except ImportError:
            from core.yolo import validate_dvc_model_paths  # type: ignore

        missing_models = validate_dvc_model_paths()
        if missing_models:
            logger.warning("Local YOLO models are missing under MODEL_DIR; local fallback may fail.")
    except Exception as exc:
        logger.warning("Skipping local YOLO model validation (strict mode). err=%s", exc)

# Initialize DB
with app.app_context():
    # First create all tables (this creates the database file if it doesn't exist)
    print("📦 Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created")
    
    # Run database migration to add new columns/tables
    try:
        print("🔄 Running database migrations...")
        try:
            from .migrate_db import run_migrations
        except ImportError:
            from migrate_db import run_migrations
        run_migrations(engine)
        print("✅ Database migrations completed")
    except Exception as me:
        print(f'⚠️ Database migration error: {me}')
    
    # Seed disease guidance table (idempotent)
    try:
        print("🌱 Seeding disease guidance data...")
        seed_guidance_if_needed()
        print("✅ Guidance data seeded")
    except Exception as se:
        print(f'⚠️ Guidance seeding error: {se}')
    
    # Seed disease schedules table (idempotent)
    try:
        print("📅 Seeding disease schedules data...")
        seed_schedules_if_needed()
        print("✅ Schedules data seeded")
    except Exception as se:
        print(f'⚠️ Schedules seeding error: {se}')

# Register blueprints
app.register_blueprint(farmer_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(support_bp)
app.register_blueprint(guidance_bp)
app.register_blueprint(schedule_bp)
app.register_blueprint(timelapse_bp)  # Smart TimeLapse Module
app.register_blueprint(yield_estimation_bp)  # Yield Estimation Module
app.register_blueprint(chatbot_bp)  # LangGraph + Chroma + Groq assistant
app.register_blueprint(voice_bp)  # Hybrid STT/TTS (Whisper / Vosk / pyttsx3 / gTTS)

# Optional warm start: load chatbot + ChromaDB at boot so first user message is fast.
# Set AGRISMART_PRELOAD_CHATBOT=1 to enable (recommended for demos on mobile).
try:
    preload = os.getenv("AGRISMART_PRELOAD_CHATBOT", "0").strip().lower() in ("1", "true", "yes", "on")
    if preload:
        if chatbot_service_url:
            logger.info("Preloading external chatbot service")
            requests.get(f"{chatbot_service_url}/warmup", timeout=internal_http_timeout)
            logger.info("External chatbot service warmup requested")
        else:
            logger.info("CHATBOT_SERVICE_URL not set; skipping external chatbot warmup")
except Exception as e:
    logger.warning("Chatbot preload skipped: %s", e)

@app.route('/')
def home():
    return jsonify({
        "message": "🌾 AgriSmart Backend is Running",
        "status": "online",
        "version": "1.0",
        "endpoints": {
            "auth": "/api/auth/*",
            "farmer": "/api/farmer/*",
            "admin": "/api/admin/*",
            "guidance": "/api/guidance",
            "schedule": "/api/farmer/schedule/*",
            "yield": "/api/yield/*",
            "predict": "/predict",
            "chatbot": "/api/chatbot/chat",
            "chatbot_warmup": "/api/chatbot/warmup",
            "voice_stt": "/api/voice/stt",
            "voice_tts": "/api/voice/tts"
        }
    })

@app.route('/health')
def health():
    """Health check endpoint for mobile app connection testing"""
    import socket
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    
    return jsonify({
        "status": "healthy",
        "service": "backend",
        "execution_mode": {
            "local_yolo_fallback": enable_local_yolo_fallback,
            "local_chatbot_fallback": enable_local_chatbot_fallback,
        },
        "server": {
            "hostname": hostname,
            "ip": local_ip,
            "port": 5000
        },
        "database": "connected",
        "message": "Backend is fully operational"
    })


@app.route('/health/dependencies')
def dependency_health():
    deps = {
        "database": {"status": "unknown"},
        "yolo_service": {"status": "unknown"},
        "chatbot_service": {"status": "unknown"},
    }

    # Database check
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        deps["database"] = {"status": "healthy"}
    except Exception as exc:
        deps["database"] = {"status": "unhealthy", "error": str(exc)}

    # YOLO service check
    yolo_url = os.getenv("YOLO_SERVICE_URL", "").strip().rstrip("/")
    if yolo_url:
        try:
            live_resp = requests.get(f"{yolo_url}/health", timeout=internal_http_timeout)
            ready_resp = requests.get(f"{yolo_url}/ready", timeout=internal_http_timeout)
            ready_payload = ready_resp.json() if ready_resp.headers.get("content-type", "").startswith("application/json") else {}
            deps["yolo_service"] = {
                "liveness": "healthy" if live_resp.status_code < 400 else "unhealthy",
                "readiness": ready_payload.get("status", "unhealthy"),
                "status": "healthy" if (live_resp.status_code < 400 and ready_resp.status_code < 400) else "unhealthy",
            }
            if ready_payload.get("error"):
                deps["yolo_service"]["error"] = ready_payload.get("error")
        except Exception as exc:
            deps["yolo_service"] = {"status": "unhealthy", "error": str(exc)}
    else:
        deps["yolo_service"] = {
            "status": "fallback-local" if enable_local_yolo_fallback else "unavailable",
        }

    # Chatbot service check
    if chatbot_service_url:
        try:
            live_resp = requests.get(f"{chatbot_service_url}/health", timeout=internal_http_timeout)
            ready_resp = requests.get(f"{chatbot_service_url}/ready", timeout=internal_http_timeout)
            ready_payload = ready_resp.json() if ready_resp.headers.get("content-type", "").startswith("application/json") else {}
            deps["chatbot_service"] = {
                "liveness": "healthy" if live_resp.status_code < 400 else "unhealthy",
                "readiness": ready_payload.get("status", "unhealthy"),
                "status": "healthy" if (live_resp.status_code < 400 and ready_resp.status_code < 400) else "unhealthy",
            }
            if ready_payload.get("error"):
                deps["chatbot_service"]["error"] = ready_payload.get("error")
        except Exception as exc:
            deps["chatbot_service"] = {"status": "unhealthy", "error": str(exc)}
    else:
        deps["chatbot_service"] = {
            "status": "fallback-local" if enable_local_chatbot_fallback else "unavailable",
        }

    overall = "healthy"
    if any(v.get("status") in ("unhealthy", "unavailable") for v in deps.values()):
        overall = "degraded"

    return jsonify({
        "status": overall,
        "service": "backend",
        "dependencies": deps,
    }), (200 if overall == "healthy" else 503)


@app.route('/predict', methods=['POST'])
@app.route('/predict/<path_crop>', methods=['POST'])
def predict(path_crop: str | None = None):
    try:
        logger.info("Incoming POST /predict")

        # Attempt to resolve crop type from multiple sources for robustness with different clients
        crop_type = None
        # 1) URL path param
        if path_crop:
            crop_type = path_crop
        # 2) Multipart form field
        if not crop_type:
            crop_type = request.form.get('cropType')
        # 3) Query string
        if not crop_type:
            crop_type = request.args.get('cropType')
        # 4) JSON body
        if not crop_type:
            try:
                json_body = request.get_json(silent=True) or {}
                crop_type = json_body.get('cropType')
            except Exception:
                pass
        # 5) Header
        if not crop_type:
            crop_type = request.headers.get('X-Crop-Type')

        # Validate file
        if 'file' not in request.files:
            logger.warning("Missing file field in /predict")
            return jsonify({'error': 'Missing file field (expected key: file)'}), 400
        if not crop_type:
            logger.warning("Missing cropType in /predict")
            return jsonify({'error': 'Missing cropType (provide via form field, query, JSON, header X-Crop-Type, or URL /predict/<crop>)'}), 400

        crop_type = str(crop_type).lower().strip()
        file = request.files['file']

        logger.info("Received crop type: %s", crop_type)

        response_payload, error_payload, status_code = predict_from_filestorage(file, crop_type)
        if error_payload:
            if status_code >= 500:
                logger.error("Predict failed with server error")
            else:
                logger.warning("Predict failed with client error")
            return jsonify(error_payload), status_code
        return jsonify(response_payload), status_code

    except Exception as e:
        logger.exception("Predict route error: %s", str(e))
        return jsonify({'error': 'Internal server error'}), 500


# Explicit route to serve static files (for better compatibility with React Native)
@app.route('/static/<path:filename>', methods=['GET', 'HEAD', 'OPTIONS'])
def serve_static(filename):
    """Serve static files explicitly with proper error handling and headers"""
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        response = Response()
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, HEAD, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        return response
    
    try:
        # Build safe file path
        file_path = safe_join(app.static_folder, filename)
        
        if not file_path or not os.path.exists(file_path):
            logger.warning("Static file not found: %s", filename)
            return jsonify({'error': 'File not found'}), 404
        
        # Get file size for logging
        file_size = os.path.getsize(file_path)
        
        # Determine MIME type
        mime_type = 'application/octet-stream'
        if filename.lower().endswith(('.jpg', '.jpeg')):
            mime_type = 'image/jpeg'
        elif filename.lower().endswith('.png'):
            mime_type = 'image/png'
        elif filename.lower().endswith('.gif'):
            mime_type = 'image/gif'
        elif filename.lower().endswith('.webp'):
            mime_type = 'image/webp'
        
        # Read file into memory for React Native compatibility (prevents "unexpected end of stream")
        with open(file_path, 'rb') as f:
            file_data = f.read()
        
        # Create response with file data
        response = make_response(file_data)
        response.headers['Content-Type'] = mime_type
        response.headers['Content-Length'] = str(file_size)
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, HEAD, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        response.headers['Cache-Control'] = 'public, max-age=3600'
        response.headers['Accept-Ranges'] = 'bytes'
        
        logger.info("Serving static file: %s (%s bytes)", filename, file_size)
        return response
        
    except Exception as e:
        logger.exception("Error serving static file %s: %s", filename, e)
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    # ⚠️ For production, use gunicorn or waitress
    app.run(host='0.0.0.0', port=5000, debug=False)
