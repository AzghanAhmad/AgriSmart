import os
try:
    from common.env import load_service_env
except ImportError:
    load_service_env = None

if load_service_env is not None:
    load_service_env(os.path.dirname(__file__))


def get_model_root() -> str:
    return os.getenv("MODEL_DIR", os.getenv("YOLO_MODEL_ROOT", "/models"))


def get_service_port() -> int:
    raw = os.getenv("YOLO_SERVICE_PORT", "8001").strip()
    try:
        return int(raw)
    except ValueError:
        return 8001
