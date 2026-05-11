import os
try:
    from common.env import load_service_env
except ImportError:
    load_service_env = None

if load_service_env is not None:
    load_service_env(os.path.dirname(__file__))


def get_service_port() -> int:
    raw = os.getenv("CHATBOT_SERVICE_PORT", "8002").strip()
    try:
        return int(raw)
    except ValueError:
        return 8002


def get_max_sessions() -> int:
    raw = os.getenv("CHATBOT_MAX_SESSIONS", "150").strip()
    try:
        return int(raw)
    except ValueError:
        return 150


def get_chatbot_module_path() -> str:
    default_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "Backend", "chatbot", "chatbot.py")
    )
    return os.getenv("CHATBOT_MODULE_PATH", default_path)
