import os
from dotenv import load_dotenv


def load_service_env(service_dir: str) -> None:
    """Load root .env first, then service-local .env overrides."""
    service_dir = os.path.abspath(service_dir)
    project_root = os.path.abspath(os.path.join(service_dir, ".."))
    load_dotenv(os.path.join(project_root, ".env"), override=False)
    load_dotenv(os.path.join(service_dir, ".env"), override=True)
