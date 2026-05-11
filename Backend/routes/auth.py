import os
import uuid
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
try:
    from ..db import SessionLocal
    from ..schemas.user import User
    from ..schemas.system_setting import SystemSetting
except ImportError:
    from db import SessionLocal
    from schemas.user import User
    from schemas.system_setting import SystemSetting


auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


def _user_to_json(user: User, req) -> dict:
    """Shape matches React Native `User` (camelCase for optional fields)."""
    base = (req.host_url or '').rstrip('/')
    pic = (user.profile_image_url or '').strip()
    profile_image_url = None
    if pic:
        profile_image_url = f"{base}{pic}" if pic.startswith('/') else pic
    return {
        'id': user.user_id,
        'name': user.name,
        'email': user.email,
        'phone': user.phone,
        'location': user.location,
        'latitude': user.latitude,
        'longitude': user.longitude,
        'role': user.role,
        'profileImageUrl': profile_image_url,
        'privacyShareLocation': bool(getattr(user, 'privacy_share_location', True)),
        'privacyShareCropData': bool(getattr(user, 'privacy_share_crop', False)),
        'privacyAnalytics': bool(getattr(user, 'privacy_analytics', True)),
        'farmAcres': user.farm_acres,
        'farmCropTypes': user.farm_crop_types,
        'farmHealthScore': user.farm_health_score,
        'farmMonthlyRevenue': user.farm_monthly_revenue,
        'restrictedUntil': user.restricted_until.isoformat() if getattr(user, 'restricted_until', None) else None,
        'restrictionReason': getattr(user, 'restriction_reason', None),
    }


def _is_user_restricted(user: User):
    restricted_until = getattr(user, 'restricted_until', None)
    if not restricted_until:
        return False, None
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    until = restricted_until.replace(tzinfo=None)
    if until <= now:
        return False, None
    return True, until


def _get_serializer():
    secret = current_app.config.get('SECRET_KEY') or 'dev-insecure'
    return URLSafeTimedSerializer(secret_key=secret, salt='auth-token')


def _is_maintenance_mode(db) -> bool:
    row = db.query(SystemSetting).filter(SystemSetting.key == 'systemMaintenance').first()
    if not row or row.value is None:
        return False
    return str(row.value).strip().lower() in ('1', 'true', 'yes', 'on')


def _create_token(payload: dict) -> str:
    return _get_serializer().dumps(payload)


def _decode_token(token: str, max_age_seconds: int = 60 * 60 * 24 * 7) -> dict:
    return _get_serializer().loads(token, max_age=max_age_seconds)


def get_auth_user():
    """
    Validate Authorization: Bearer <token> and load the User row.

    Returns:
        (user, None) on success — user is expunged from the session so it is safe
        to use after this function returns.
        (None, (response, status)) on failure — pass through from route handlers as
        ``return err`` (Flask accepts (body, status) tuples).
    """
    auth_header = (request.headers.get('Authorization') or '').strip()
    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != 'bearer':
        return None, (jsonify({'error': 'Authentication required'}), 401)

    token = parts[1]
    try:
        payload = _decode_token(token)
    except SignatureExpired:
        return None, (jsonify({'error': 'Token expired'}), 401)
    except BadSignature:
        return None, (jsonify({'error': 'Invalid token'}), 401)

    uid = payload.get('uid')
    if not uid:
        return None, (jsonify({'error': 'Invalid token'}), 401)

    token_tv = int(payload.get('tv', 0) or 0)

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.user_id == uid).first()
        if not user:
            return None, (jsonify({'error': 'User not found'}), 404)
        if (user.role or '').lower() == 'farmer' and _is_maintenance_mode(db):
            return None, (jsonify({'error': 'System is under maintenance. Please try again later.'}), 503)
        is_restricted, until = _is_user_restricted(user)
        if is_restricted:
            return None, (
                jsonify({
                    'error': 'Account is restricted by admin',
                    'restrictedUntil': until.isoformat() if until else None,
                    'restrictionReason': getattr(user, 'restriction_reason', None),
                }),
                403
            )
        db_tv = int(getattr(user, 'token_version', 0) or 0)
        if token_tv != db_tv:
            return None, (jsonify({'error': 'Session expired. Please sign in again.'}), 401)
        db.expunge(user)
        return user, None
    finally:
        db.close()

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

        token = _create_token({
            'uid': user.user_id,
            'role': user.role,
            'tv': int(getattr(user, 'token_version', 0) or 0),
        })
        return jsonify({
            'token': token,
            'user': _user_to_json(user, request),
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
            if (user.role or '').lower() == 'farmer' and _is_maintenance_mode(db):
                return jsonify({'error': 'System is under maintenance. Please try again later.'}), 503
            is_restricted, until = _is_user_restricted(user)
            if is_restricted:
                return jsonify({
                    'error': 'Account is restricted by admin',
                    'restrictedUntil': until.isoformat() if until else None,
                    'restrictionReason': getattr(user, 'restriction_reason', None),
                }), 403

            token = _create_token({
                'uid': user.user_id,
                'role': user.role,
                'tv': int(getattr(user, 'token_version', 0) or 0),
            })
            return jsonify({
                'token': token,
                'user': _user_to_json(user, request),
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
        if (user.role or '').lower() == 'farmer' and _is_maintenance_mode(db):
            return jsonify({'error': 'System is under maintenance. Please try again later.'}), 503
        token_tv = int(payload.get('tv', 0) or 0)
        if token_tv != int(getattr(user, 'token_version', 0) or 0):
            return jsonify({'error': 'Session expired. Please sign in again.'}), 401
        return jsonify(_user_to_json(user, request))
    finally:
        db.close()


@auth_bp.route('/profile', methods=['PUT'])
def update_profile():
    user, err = get_auth_user()
    if err:
        return err
    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'name is required'}), 400

    db = SessionLocal()
    try:
        row = db.query(User).filter(User.user_id == user.user_id).first()
        if not row:
            return jsonify({'error': 'User not found'}), 404

        row.name = name
        if 'phone' in data:
            row.phone = (data.get('phone') or '').strip() or None
        if 'location' in data:
            row.location = (data.get('location') or '').strip() or None
        if 'latitude' in data:
            lat = data.get('latitude')
            row.latitude = float(lat) if lat is not None else None
        if 'longitude' in data:
            lng = data.get('longitude')
            row.longitude = float(lng) if lng is not None else None
        if 'farmAcres' in data:
            v = data.get('farmAcres')
            row.farm_acres = float(v) if v is not None and v != '' else None
        if 'farmCropTypes' in data:
            v = data.get('farmCropTypes')
            row.farm_crop_types = int(v) if v is not None and v != '' else None
        if 'farmHealthScore' in data:
            v = data.get('farmHealthScore')
            row.farm_health_score = float(v) if v is not None and v != '' else None
        if 'farmMonthlyRevenue' in data:
            v = data.get('farmMonthlyRevenue')
            row.farm_monthly_revenue = float(v) if v is not None and v != '' else None
        if 'privacyShareLocation' in data:
            row.privacy_share_location = bool(data.get('privacyShareLocation'))
        if 'privacyShareCropData' in data:
            row.privacy_share_crop = bool(data.get('privacyShareCropData'))
        if 'privacyAnalytics' in data:
            row.privacy_analytics = bool(data.get('privacyAnalytics'))

        db.commit()
        db.refresh(row)
        return jsonify(_user_to_json(row, request))
    except Exception as e:
        db.rollback()
        current_app.logger.exception('update_profile')
        return jsonify({'error': 'Could not update profile', 'details': str(e)}), 500
    finally:
        db.close()


@auth_bp.route('/profile-photo', methods=['POST'])
def upload_profile_photo():
    user, err = get_auth_user()
    if err:
        return err
    f = request.files.get('photo')
    if not f or not f.filename:
        return jsonify({'error': 'photo file is required'}), 400

    ext = os.path.splitext(secure_filename(f.filename))[1].lower() or '.jpg'
    if ext not in ('.jpg', '.jpeg', '.png', '.webp'):
        ext = '.jpg'
    fname = f'profile_{user.user_id[:8]}_{uuid.uuid4().hex[:10]}{ext}'
    upload_root = current_app.config.get('UPLOAD_FOLDER') or os.path.join(current_app.static_folder, 'uploads')
    subdir = os.path.join(upload_root, 'profiles')
    os.makedirs(subdir, exist_ok=True)
    dest = os.path.join(subdir, fname)
    f.save(dest)
    rel = f'/static/uploads/profiles/{fname}'

    db = SessionLocal()
    try:
        row = db.query(User).filter(User.user_id == user.user_id).first()
        if not row:
            return jsonify({'error': 'User not found'}), 404
        row.profile_image_url = rel
        db.commit()
        db.refresh(row)
        return jsonify(_user_to_json(row, request))
    except Exception as e:
        db.rollback()
        current_app.logger.exception('upload_profile_photo')
        return jsonify({'error': 'Could not save profile photo', 'details': str(e)}), 500
    finally:
        db.close()


@auth_bp.route('/change-password', methods=['POST'])
def change_password():
    user, err = get_auth_user()
    if err:
        return err
    data = request.get_json(silent=True) or {}
    current_password = data.get('currentPassword') or ''
    new_password = data.get('newPassword') or ''
    if not current_password or not new_password:
        return jsonify({'error': 'currentPassword and newPassword are required'}), 400

    db = SessionLocal()
    try:
        row = db.query(User).filter(User.user_id == user.user_id).first()
        if not row or not check_password_hash(row.password_hash, current_password):
            return jsonify({'error': 'Current password is incorrect'}), 401
        row.password_hash = generate_password_hash(new_password)
        db.commit()
        return jsonify({'ok': True})
    finally:
        db.close()


@auth_bp.route('/logout-all', methods=['POST'])
def logout_all():
    user, err = get_auth_user()
    if err:
        return err
    db = SessionLocal()
    try:
        row = db.query(User).filter(User.user_id == user.user_id).first()
        if not row:
            return jsonify({'error': 'User not found'}), 404
        row.token_version = int(getattr(row, 'token_version', 0) or 0) + 1
        db.commit()
        return jsonify({'ok': True})
    finally:
        db.close()


@auth_bp.route('/account', methods=['DELETE'])
def delete_account():
    user, err = get_auth_user()
    if err:
        return err
    uid = user.user_id

    try:
        from ..schemas.detection import Detection
        from ..schemas.chat_conversation import ChatConversation, ChatMessage
        from ..models import Crop, TimelapseEntry
    except ImportError:
        from schemas.detection import Detection
        from schemas.chat_conversation import ChatConversation, ChatMessage
        from models import Crop, TimelapseEntry

    db = SessionLocal()
    try:
        conv_ids = [c[0] for c in db.query(ChatConversation.id).filter(ChatConversation.user_id == uid).all()]
        if conv_ids:
            db.query(ChatMessage).filter(ChatMessage.conversation_id.in_(conv_ids)).delete(synchronize_session=False)
            db.query(ChatConversation).filter(ChatConversation.user_id == uid).delete(synchronize_session=False)

        crop_ids = [c[0] for c in db.query(Crop.id).filter(Crop.farmer_id == uid).all()]
        if crop_ids:
            db.query(TimelapseEntry).filter(TimelapseEntry.crop_id.in_(crop_ids)).delete(synchronize_session=False)
            db.query(Crop).filter(Crop.farmer_id == uid).delete(synchronize_session=False)

        db.query(Detection).filter(Detection.farmer_id == uid).delete(synchronize_session=False)

        row = db.query(User).filter(User.user_id == uid).first()
        if row:
            db.delete(row)
        db.commit()
        return jsonify({'ok': True})
    except Exception as e:
        db.rollback()
        current_app.logger.exception('delete_account')
        return jsonify({'error': 'Could not delete account', 'details': str(e)}), 500
    finally:
        db.close()
