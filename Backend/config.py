import os
from dotenv import load_dotenv
try:
    from common.env import load_service_env
except ImportError:
    load_service_env = None

load_dotenv()
if load_service_env is not None:
    load_service_env(os.path.dirname(__file__))

def get_database_url() -> str:
    db_url = os.getenv('DATABASE_URL')
    if db_url:
        return db_url
    user = os.getenv('DB_USER')
    password = os.getenv('DB_PASSWORD')
    host = os.getenv('DB_HOST', 'localhost')
    port = os.getenv('DB_PORT')
    name = os.getenv('DB_NAME')
    if user and password and name:
        port_part = f":{port}" if port else ''
        return f"postgresql+psycopg2://{user}:{password}@{host}{port_part}/{name}"
    return 'sqlite:///agrismart.db'

def get_allowed_origins() -> str:
    return os.getenv('ALLOWED_ORIGINS', '*')

def get_upload_root() -> str:
    return os.getenv('UPLOAD_ROOT', os.path.join('static', 'uploads'))


def get_secret_key() -> str:
    return os.getenv('SECRET_KEY', 'dev-insecure')


def get_weather_api_key() -> str:
    return os.getenv('OPENWEATHER_API_KEY', '')

def get_gemini_api_key() -> str:
    return os.getenv('GEMINI_API_KEY', '')


def get_gemini_model() -> str:
    """Model id for google.generativeai (e.g. gemini-1.5-flash). gemini-pro is retired."""
    return os.getenv('GEMINI_MODEL', 'gemini-1.5-flash')


def get_yolo_service_url() -> str:
    return os.getenv('YOLO_SERVICE_URL', '').strip()


def get_chatbot_service_url() -> str:
    return os.getenv('CHATBOT_SERVICE_URL', '').strip()


def get_internal_http_timeout() -> float:
    raw = os.getenv('INTERNAL_HTTP_TIMEOUT', '60').strip()
    try:
        return float(raw)
    except ValueError:
        return 60.0


def get_backend_model_root() -> str:
    return os.getenv('MODEL_DIR', os.path.join(os.path.dirname(__file__), 'models'))


def _bool_env(name: str, default: bool) -> bool:
    raw = os.getenv(name, 'true' if default else 'false').strip().lower()
    return raw in ('1', 'true', 'yes', 'on')


def get_enable_local_yolo_fallback() -> bool:
    # Keep the main backend memory-light by default. Set this to true only when
    # running YOLO inside the backend process instead of the separate yolo-service.
    return _bool_env('ENABLE_LOCAL_YOLO_FALLBACK', False)


def get_enable_local_chatbot_fallback() -> bool:
    return _bool_env('ENABLE_LOCAL_CHATBOT_FALLBACK', True)

