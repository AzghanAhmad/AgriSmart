import uuid
from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

try:
    from ..db import SessionLocal
    from ..schemas.user import User
except ImportError:
    from db import SessionLocal
    from schemas.user import User


auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


def _get_serializer():
    secret = current_app.config.get('SECRET_KEY') or 'dev-insecure'
    return URLSafeTimedSerializer(secret_key=secret, salt='auth-token')


def _create_token(payload: dict) -> str:
    return _get_serializer().dumps(payload)


def _decode_token(token: str, max_age_seconds: int = 60 * 60 * 24 * 7) -> dict:
    return _get_serializer().loads(token, max_age=max_age_seconds)


@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    phone = (data.get('phone') or '').strip()
    location = (data.get('location') or '').strip() or None
    role = (data.get('role') or 'farmer').strip().lower()
    
    # Accept coordinates for geotagging
    lat_raw = data.get('latitude')
    lng_raw = data.get('longitude')
    latitude = float(lat_raw) if lat_raw is not None else None
    longitude = float(lng_raw) if lng_raw is not None else None

    if not name or not email or not password:
        return jsonify({'error': 'name, email and password are required'}), 400
    if role not in ('farmer', 'admin'):
        return jsonify({'error': 'Invalid role'}), 400

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            return jsonify({'error': 'Email already registered'}), 409

        user = User(
            user_id=str(uuid.uuid4()),
            name=name,
            email=email,
            password_hash=generate_password_hash(password),
            phone=phone or None,
            location=location,
            latitude=latitude,
            longitude=longitude,
            role=role,
        )
        db.add(user)
        db.commit()

        token = _create_token({'uid': user.user_id, 'role': user.role})
        return jsonify({
            'token': token,
            'user': {
                'id': user.user_id,
                'name': user.name,
            'email': user.email,
            'phone': user.phone,
            'location': location,
            'latitude': latitude,
            'longitude': longitude,
            'role': user.role,
            }
        }), 201
    finally:
        db.close()


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    if not email or not password:
        return jsonify({'error': 'email and password are required'}), 400

    db = SessionLocal()
    try:
        try:
            user = db.query(User).filter(User.email == email).first()
            if not user or not check_password_hash(user.password_hash, password):
                return jsonify({'error': 'Invalid email or password'}), 401

            token = _create_token({'uid': user.user_id, 'role': user.role})
            return jsonify({
                'token': token,
                'user': {
                    'id': user.user_id,
                    'name': user.name,
                    'email': user.email,
                    'phone': user.phone,
                    'location': user.location,
                    'latitude': user.latitude,
                    'longitude': user.longitude,
                    'role': user.role,
                }
            })
        except Exception as e:
            # FIX: prevent server crash / connection abort on DB errors
            current_app.logger.exception('Login DB/query error')
            debug_details = str(e) if current_app.debug else None
            return jsonify({
                'error': 'Login failed',
                'details': debug_details
            }), 500
    finally:
        db.close()


@auth_bp.route('/me', methods=['GET'])
def me():
    auth_header = request.headers.get('Authorization', '')
    parts = auth_header.split()
    if len(parts) == 2 and parts[0].lower() == 'bearer':
        token = parts[1]
    else:
        return jsonify({'error': 'Missing bearer token'}), 401

    try:
        payload = _decode_token(token)
    except SignatureExpired:
        return jsonify({'error': 'Token expired'}), 401
    except BadSignature:
        return jsonify({'error': 'Invalid token'}), 401

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.user_id == payload.get('uid')).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        return jsonify({
            'id': user.user_id,
            'name': user.name,
            'email': user.email,
            'phone': user.phone,
            'location': user.location,
            'latitude': user.latitude,
            'longitude': user.longitude,
            'role': user.role,
        })
    finally:
        db.close()


