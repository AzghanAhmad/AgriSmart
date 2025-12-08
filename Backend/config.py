import os
from dotenv import load_dotenv

load_dotenv()

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

