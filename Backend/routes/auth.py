import os
import uuid
from flask import Blueprint, request, jsonify, current_app, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from PIL import Image
import io
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

try:
    from ..db import SessionLocal
    from ..schemas.user import User
except ImportError:
    from db import SessionLocal
    from schemas.user import User


auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


def _token_version(user: User) -> int:
    v = getattr(user, 'token_version', None)
    return int(v) if v is not None else 0


def _privacy_bool(val) -> bool:
    if val is None:
        return True
    return bool(val)


def _user_to_json(user: User) -> dict:
    return {
        'id': user.user_id,
        'name': user.name,
        'email': user.email,
        'phone': user.phone,
        'location': user.location,
        'latitude': user.latitude,
        'longitude': user.longitude,
        'role': user.role,
        'profileImageUrl': getattr(user, 'profile_image_url', None),
        'privacyShareLocation': _privacy_bool(getattr(user, 'privacy_share_location', True)),
        'privacyShareCropData': _privacy_bool(getattr(user, 'privacy_share_crop', False)),
        'privacyAnalytics': _privacy_bool(getattr(user, 'privacy_analytics', True)),
        'farmAcres': getattr(user, 'farm_acres', None),
        'farmCropTypes': getattr(user, 'farm_crop_types', None),
        'farmHealthScore': getattr(user, 'farm_health_score', None),
        'farmMonthlyRevenue': getattr(user, 'farm_monthly_revenue', None),
    }


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
        db.refresh(user)

        token = _create_token({
            'uid': user.user_id,
            'role': user.role,
            'v': _token_version(user),
        })
        return jsonify({
            'token': token,
            'user': _user_to_json(user),
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
        user = db.query(User).filter(User.email == email).first()
        if not user or not check_password_hash(user.password_hash, password):
            return jsonify({'error': 'Invalid email or password'}), 401

        token = _create_token({
            'uid': user.user_id,
            'role': user.role,
            'v': _token_version(user),
        })
        return jsonify({
            'token': token,
            'user': _user_to_json(user),
        })
    finally:
        db.close()


def get_auth_user():
    """
    Validate Bearer token and return the User row if the session is still valid
    (including token_version for logout-all-devices).
    Returns (user, None) on success, or (None, err_response) on failure.
    """
    payload, err = _require_user_from_token()
    if err:
        return None, err
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.user_id == payload.get('uid')).first()
        if not user:
            return None, (jsonify({'error': 'User not found'}), 404)
        if _token_version(user) != int(payload.get('v', 0)):
            return None, (jsonify({'error': 'Session revoked'}), 401)
        return user, None
    finally:
        db.close()


@auth_bp.route('/me', methods=['GET'])
def me():
    user, err = get_auth_user()
    if err:
        return err
    return jsonify(_user_to_json(user))


def _require_user_from_token():
    auth_header = request.headers.get('Authorization', '')
    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != 'bearer':
        return None, (jsonify({'error': 'Missing bearer token'}), 401)
    try:
        payload = _decode_token(parts[1])
    except SignatureExpired:
        return None, (jsonify({'error': 'Token expired'}), 401)
    except BadSignature:
        return None, (jsonify({'error': 'Invalid token'}), 401)
    return payload, None


@auth_bp.route('/profile', methods=['PATCH', 'PUT'])
def update_profile():
    """Update profile and farm overview fields for the authenticated user."""
    auth_user, err = get_auth_user()
    if err:
        return err
    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    phone = (data.get('phone') or '').strip() or None
    location = (data.get('location') or '').strip() or None
    if not name:
        return jsonify({'error': 'name is required'}), 400

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.user_id == auth_user.user_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        user.name = name
        user.phone = phone
        user.location = location
        # Allow explicit null to clear coordinates when location is cleared
        if 'latitude' in data:
            lat_raw = data.get('latitude')
            user.latitude = (
                float(lat_raw) if lat_raw is not None and lat_raw != '' else None
            )
        if 'longitude' in data:
            lng_raw = data.get('longitude')
            user.longitude = (
                float(lng_raw) if lng_raw is not None and lng_raw != '' else None
            )
        if 'farmAcres' in data:
            raw = data.get('farmAcres')
            user.farm_acres = float(raw) if raw is not None and raw != '' else None
        if 'farmCropTypes' in data:
            raw = data.get('farmCropTypes')
            user.farm_crop_types = int(raw) if raw is not None and raw != '' else None
        if 'farmHealthScore' in data:
            raw = data.get('farmHealthScore')
            user.farm_health_score = float(raw) if raw is not None and raw != '' else None
        if 'farmMonthlyRevenue' in data:
            raw = data.get('farmMonthlyRevenue')
            user.farm_monthly_revenue = float(raw) if raw is not None and raw != '' else None
        db.commit()
        return jsonify(_user_to_json(user)), 200
    finally:
        db.close()


@auth_bp.route('/profile/photo', methods=['POST'])
def upload_profile_photo():
    """Upload profile picture (JPEG/PNG); stored under static/uploads/avatars/."""
    auth_user, err = get_auth_user()
    if err:
        return err
    file = request.files.get('file')
    if not file or file.filename == '':
        return jsonify({'error': 'Missing file'}), 400

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.user_id == auth_user.user_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        try:
            raw = file.read()
            image = Image.open(io.BytesIO(raw)).convert('RGB')
        except Exception:
            return jsonify({'error': 'Invalid image file'}), 400

        uploads_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'avatars')
        os.makedirs(uploads_dir, exist_ok=True)
        uid = auth_user.user_id
        filename = f'{uid}.jpg'
        save_path = os.path.join(uploads_dir, filename)
        image.save(save_path, format='JPEG', quality=88)

        image_url = url_for('static', filename=f'uploads/avatars/{filename}', _external=True)
        user.profile_image_url = image_url
        db.commit()
        return jsonify(_user_to_json(user)), 200
    finally:
        db.close()


@auth_bp.route('/privacy', methods=['PATCH'])
def update_privacy():
    """Persist data privacy toggles."""
    auth_user, err = get_auth_user()
    if err:
        return err
    data = request.get_json(silent=True) or {}
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.user_id == auth_user.user_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        if 'privacyShareLocation' in data:
            user.privacy_share_location = bool(data.get('privacyShareLocation'))
        if 'privacyShareCropData' in data:
            user.privacy_share_crop = bool(data.get('privacyShareCropData'))
        if 'privacyAnalytics' in data:
            user.privacy_analytics = bool(data.get('privacyAnalytics'))
        db.commit()
        return jsonify(_user_to_json(user)), 200
    finally:
        db.close()


@auth_bp.route('/change-password', methods=['POST'])
def change_password():
    auth_user, err = get_auth_user()
    if err:
        return err
    data = request.get_json(silent=True) or {}
    current_password = data.get('currentPassword') or data.get('current_password') or ''
    new_password = data.get('newPassword') or data.get('new_password') or ''
    if not current_password or not new_password:
        return jsonify({'error': 'current and new password are required'}), 400
    if len(new_password) < 8:
        return jsonify({'error': 'New password must be at least 8 characters'}), 400

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.user_id == auth_user.user_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        if not check_password_hash(user.password_hash, current_password):
            return jsonify({'error': 'Current password is incorrect'}), 400
        user.password_hash = generate_password_hash(new_password)
        db.commit()
        return jsonify({'ok': True, 'message': 'Password updated'}), 200
    finally:
        db.close()


@auth_bp.route('/logout-all', methods=['POST'])
def logout_all_devices():
    auth_user, err = get_auth_user()
    if err:
        return err
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.user_id == auth_user.user_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        user.token_version = _token_version(user) + 1
        db.commit()
        return jsonify({'ok': True}), 200
    finally:
        db.close()


@auth_bp.route('/account', methods=['DELETE'])
def delete_account():
    auth_user, err = get_auth_user()
    if err:
        return err
    uid = auth_user.user_id

    try:
        from ..schemas.detection import Detection
        from ..schemas.schedule import Schedule, ScheduleProgress
        from ..models import Crop, TimelapseEntry
    except ImportError:
        from schemas.detection import Detection
        from schemas.schedule import Schedule, ScheduleProgress
        from models import Crop, TimelapseEntry

    db = SessionLocal()
    try:
        schedule_ids = [r.schedule_id for r in db.query(Schedule).filter(Schedule.farmer_id == uid).all()]
        for sid in schedule_ids:
            db.query(ScheduleProgress).filter(ScheduleProgress.schedule_id == sid).delete()
        db.query(Schedule).filter(Schedule.farmer_id == uid).delete()

        crop_ids = [c.id for c in db.query(Crop).filter(Crop.farmer_id == uid).all()]
        if crop_ids:
            db.query(TimelapseEntry).filter(TimelapseEntry.crop_id.in_(crop_ids)).delete(synchronize_session=False)
        db.query(Crop).filter(Crop.farmer_id == uid).delete(synchronize_session=False)

        db.query(Detection).filter(Detection.farmer_id == uid).delete(synchronize_session=False)

        user = db.query(User).filter(User.user_id == uid).first()
        if user:
            db.delete(user)
        db.commit()
        return jsonify({'ok': True}), 200
    except Exception as e:
        db.rollback()
        print('❌ delete_account:', e)
        return jsonify({'error': 'Failed to delete account'}), 500
    finally:
        db.close()

