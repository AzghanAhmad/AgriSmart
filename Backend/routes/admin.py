from collections import defaultdict
from datetime import datetime, timedelta
import json
import uuid

from flask import Blueprint, request, jsonify
try:
    from ..db import SessionLocal
    from ..schemas.detection import Detection, OutbreakAlert
    from ..schemas.subsidy_application import SubsidyApplication
    from ..schemas.subsidy import SubsidyProgram
    from ..schemas.user import User
    from ..schemas.system_setting import SystemSetting
    from ..core.outbreak_config import (
        cluster_sensitivity_percent,
        severity_from_sensitivity_pct,
        heatmap_point_intensity_percent,
    )
except ImportError:
    # Fallback when running as a script: python Backend/app.py
    from db import SessionLocal
    from schemas.detection import Detection, OutbreakAlert
    from schemas.subsidy_application import SubsidyApplication
    from schemas.subsidy import SubsidyProgram
    from schemas.user import User
    from schemas.system_setting import SystemSetting
    from core.outbreak_config import (
        cluster_sensitivity_percent,
        severity_from_sensitivity_pct,
        heatmap_point_intensity_percent,
    )

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

ALLOWED_SYSTEM_SETTING_KEYS = {
    'emailNotifications',
    'pushNotifications',
    'smsNotifications',
    'dataBackup',
    'autoReports',
    'systemMaintenance',
    'debugMode',
}

DEFAULT_SYSTEM_SETTINGS = {
    'emailNotifications': True,
    'pushNotifications': True,
    'smsNotifications': False,
    'dataBackup': True,
    'autoReports': True,
    'systemMaintenance': False,
    'debugMode': False,
}


def _to_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        return value.strip().lower() in ('1', 'true', 'yes', 'on')
    return False


def _load_system_settings(db):
    settings = dict(DEFAULT_SYSTEM_SETTINGS)
    rows = db.query(SystemSetting).all()
    for row in rows:
        if row.key in ALLOWED_SYSTEM_SETTING_KEYS:
            settings[row.key] = _to_bool(row.value)
    return settings


def _upsert_system_setting(db, key, bool_value):
    row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    stored_value = 'true' if bool_value else 'false'
    if row:
        row.value = stored_value
    else:
        row = SystemSetting(key=key, value=stored_value)
        db.add(row)
    return row


def _parse_range(range_key):
    normalized = (range_key or 'week').lower()
    if normalized not in ('week', 'month'):
        normalized = 'week'
    days = 7 if normalized == 'week' else 30
    today = datetime.utcnow().date()
    dates = [today - timedelta(days=days - 1 - i) for i in range(days)]
    labels = [d.strftime('%a') if normalized == 'week' else d.strftime('%d %b') for d in dates]
    return normalized, dates, labels, datetime.combine(dates[0], datetime.min.time())


def _series_from_dates(dates, counts_by_key, key):
    return [int(counts_by_key.get(key, {}).get(d, 0)) for d in dates]


def _parse_positive_days(value):
    try:
        days = int(value)
        return days if days > 0 else None
    except (TypeError, ValueError):
        return None


def _parse_iso_datetime(value):
    if not value:
        return None
    raw = str(value).strip()
    if not raw:
        return None
    try:
        if len(raw) == 10:
            return datetime.strptime(raw, '%Y-%m-%d')
        return datetime.fromisoformat(raw.replace('Z', '+00:00')).replace(tzinfo=None)
    except Exception:
        return None


def _parse_criteria(value):
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return []
        parts = [p.strip() for p in text.replace('\n', ',').split(',')]
        return [p for p in parts if p]
    return []


def _safe_int(value, default=0):
    try:
        return int(value)
    except Exception:
        return default


def _safe_float(value, default=0.0):
    try:
        return float(value)
    except Exception:
        return default


def _serialize_subsidy(row):
    criteria = []
    try:
        if row.eligibility_criteria:
            parsed = json.loads(row.eligibility_criteria)
            if isinstance(parsed, list):
                criteria = [str(v) for v in parsed if str(v).strip()]
    except Exception:
        criteria = []

    return {
        'id': row.subsidy_id,
        'parentSubsidyId': row.parent_subsidy_id,
        'title': row.title,
        'description': row.description or '',
        'amount': _safe_float(row.amount, 0.0),
        'maxAmount': _safe_float(row.max_amount, _safe_float(row.amount, 0.0)),
        'eligibilityCriteria': criteria,
        'applicationDeadline': row.application_deadline.isoformat() if row.application_deadline else None,
        'status': (row.status or 'active').lower(),
        'totalApplicants': _safe_int(row.total_applicants, 0),
        'approvedApplicants': _safe_int(row.approved_applicants, 0),
        'totalDisbursed': _safe_float(row.total_disbursed, 0.0),
        'createdAt': row.created_at.isoformat() if row.created_at else None,
    }


def _build_subsidy_tree(rows):
    serialized = [_serialize_subsidy(r) for r in rows]
    by_parent = defaultdict(list)
    top = []
    for item in serialized:
        parent_id = item.get('parentSubsidyId')
        if parent_id:
            by_parent[parent_id].append(item)
        else:
            top.append(item)
    for item in serialized:
        item['subSubsidies'] = by_parent.get(item['id'], [])
    return top, serialized


@admin_bp.route('/system-settings', methods=['GET'])
def get_system_settings():
    db = SessionLocal()
    try:
        return jsonify({'settings': _load_system_settings(db)})
    except Exception as e:
        print('❌ Error loading system settings:', str(e))
        return jsonify({'error': 'Failed to load system settings', 'details': str(e)}), 500
    finally:
        db.close()


@admin_bp.route('/system-settings', methods=['POST'])
def update_system_settings():
    payload = request.get_json(silent=True) or {}
    updates = payload.get('settings') if isinstance(payload.get('settings'), dict) else payload
    if not isinstance(updates, dict):
        return jsonify({'error': 'settings payload must be an object'}), 400

    requested_keys = [k for k in updates.keys() if k in ALLOWED_SYSTEM_SETTING_KEYS]
    if not requested_keys:
        return jsonify({'error': 'No valid settings keys provided'}), 400

    db = SessionLocal()
    try:
        for key in requested_keys:
            _upsert_system_setting(db, key, _to_bool(updates.get(key)))
        db.commit()
        return jsonify({'success': True, 'settings': _load_system_settings(db)})
    except Exception as e:
        db.rollback()
        print('❌ Error updating system settings:', str(e))
        return jsonify({'error': 'Failed to update system settings', 'details': str(e)}), 500
    finally:
        db.close()


@admin_bp.route('/dashboard/overview', methods=['GET'])
def dashboard_overview():
    db = SessionLocal()
    try:
        from sqlalchemy import func

        total_farmers = db.query(User).filter(User.role == 'farmer').count()
        total_reports = db.query(Detection).count()
        active_diseases = db.query(func.count(func.distinct(Detection.disease_name))).filter(
            Detection.disease_name.isnot(None),
            Detection.disease_name != 'Healthy Crop'
        ).scalar() or 0
        pending_alerts = db.query(OutbreakAlert).filter(OutbreakAlert.status == 'pending').count()
        approved_alerts = db.query(OutbreakAlert).filter(OutbreakAlert.status == 'approved').count()

        activities = []

        latest_farmers = (
            db.query(User)
            .filter(User.role == 'farmer')
            .order_by(User.created_at.desc())
            .limit(4)
            .all()
        )
        for farmer in latest_farmers:
            activities.append({
                'id': f"farmer-{farmer.user_id}",
                'type': 'farmer_registered',
                'title': farmer.name or 'Farmer',
                'subtitle': farmer.location or farmer.email or '',
                'timestamp': farmer.created_at.isoformat() if farmer.created_at else None,
            })

        latest_detections = (
            db.query(Detection)
            .order_by(Detection.timestamp.desc())
            .limit(4)
            .all()
        )
        for detection in latest_detections:
            activities.append({
                'id': f"detection-{detection.detection_id}",
                'type': 'detection_reported',
                'title': detection.disease_name or detection.disease_id or 'Detection',
                'subtitle': f"Farmer {detection.farmer_id or 'N/A'} • {(detection.confidence_score or 0):.0f}%",
                'timestamp': detection.timestamp.isoformat() if detection.timestamp else None,
            })

        latest_alerts = (
            db.query(OutbreakAlert)
            .order_by(OutbreakAlert.created_at.desc())
            .limit(4)
            .all()
        )
        for alert in latest_alerts:
            activities.append({
                'id': f"alert-{alert.alert_id}",
                'type': 'alert_created' if alert.status == 'pending' else 'alert_approved',
                'title': alert.disease_name or alert.disease_id or 'Outbreak Alert',
                'subtitle': f"{alert.status.title()} • {alert.radius_km:.0f} km radius",
                'timestamp': alert.created_at.isoformat() if alert.created_at else None,
            })

        activities.sort(key=lambda item: item.get('timestamp') or '', reverse=True)

        return jsonify({
            'stats': {
                'totalFarmers': total_farmers,
                'totalReports': total_reports,
                'activeDiseases': int(active_diseases),
                'pendingAlerts': pending_alerts,
                'approvedAlerts': approved_alerts,
            },
            'activities': activities[:8],
        })
    except Exception as e:
        print('❌ Error fetching dashboard overview:', str(e))
        return jsonify({
            'stats': {
                'totalFarmers': 0,
                'totalReports': 0,
                'activeDiseases': 0,
                'pendingAlerts': 0,
                'approvedAlerts': 0,
            },
            'activities': [],
        }), 500
    finally:
        db.close()


@admin_bp.route('/dashboard/trends/registrations', methods=['GET'])
def dashboard_registrations_trend():
    db = SessionLocal()
    try:
        range_key, dates, labels, start_dt = _parse_range(request.args.get('range'))
        farmers_by_day = defaultdict(int)
        reports_by_day = defaultdict(int)

        farmers = db.query(User).filter(
            User.role == 'farmer',
            User.created_at >= start_dt,
        ).all()
        for farmer in farmers:
            if farmer.created_at:
                farmers_by_day[farmer.created_at.date()] += 1

        detections = db.query(Detection).filter(Detection.timestamp >= start_dt).all()
        for detection in detections:
            if detection.timestamp:
                reports_by_day[detection.timestamp.date()] += 1

        return jsonify({
            'range': range_key,
            'labels': labels,
            'series': [
                {
                    'key': 'farmerRegistrations',
                    'label': 'Farmer registrations',
                    'color': '#14B8A6',
                    'data': [farmers_by_day.get(d, 0) for d in dates],
                },
                {
                    'key': 'diseaseReports',
                    'label': 'Disease reports',
                    'color': '#3B82F6',
                    'data': [reports_by_day.get(d, 0) for d in dates],
                },
            ],
        })
    except Exception as e:
        print('❌ Error fetching registration trend:', str(e))
        return jsonify({'range': 'week', 'labels': [], 'series': []}), 500
    finally:
        db.close()


@admin_bp.route('/dashboard/trends/crops', methods=['GET'])
def dashboard_crop_trend():
    db = SessionLocal()
    try:
        range_key, dates, labels, start_dt = _parse_range(request.args.get('range'))
        counts_by_crop = defaultdict(lambda: defaultdict(int))

        detections = db.query(Detection).filter(Detection.timestamp >= start_dt).all()
        for detection in detections:
            if not detection.timestamp:
                continue
            crop = (detection.crop_type or '').strip().lower()
            if crop not in ('wheat', 'rice', 'cotton'):
                continue
            counts_by_crop[crop][detection.timestamp.date()] += 1

        return jsonify({
            'range': range_key,
            'labels': labels,
            'series': [
                {
                    'key': 'wheat',
                    'label': 'Wheat',
                    'color': '#22C55E',
                    'data': _series_from_dates(dates, counts_by_crop, 'wheat'),
                },
                {
                    'key': 'rice',
                    'label': 'Rice',
                    'color': '#3B82F6',
                    'data': _series_from_dates(dates, counts_by_crop, 'rice'),
                },
                {
                    'key': 'cotton',
                    'label': 'Cotton',
                    'color': '#F59E0B',
                    'data': _series_from_dates(dates, counts_by_crop, 'cotton'),
                },
            ],
        })
    except Exception as e:
        print('❌ Error fetching crop trend:', str(e))
        return jsonify({'range': 'week', 'labels': [], 'series': []}), 500
    finally:
        db.close()


@admin_bp.route('/dashboard/trends/alerts', methods=['GET'])
def dashboard_alert_trend():
    db = SessionLocal()
    try:
        range_key, dates, labels, start_dt = _parse_range(request.args.get('range'))
        counts_by_status = defaultdict(lambda: defaultdict(int))

        alerts = db.query(OutbreakAlert).filter(OutbreakAlert.created_at >= start_dt).all()
        for alert in alerts:
            if not alert.created_at:
                continue
            status = (alert.status or '').strip().lower()
            if status not in ('pending', 'approved'):
                continue
            counts_by_status[status][alert.created_at.date()] += 1

        return jsonify({
            'range': range_key,
            'labels': labels,
            'series': [
                {
                    'key': 'pending',
                    'label': 'Pending alerts',
                    'color': '#EF4444',
                    'data': _series_from_dates(dates, counts_by_status, 'pending'),
                },
                {
                    'key': 'approved',
                    'label': 'Approved alerts',
                    'color': '#10B981',
                    'data': _series_from_dates(dates, counts_by_status, 'approved'),
                },
            ],
        })
    except Exception as e:
        print('❌ Error fetching alert trend:', str(e))
        return jsonify({'range': 'week', 'labels': [], 'series': []}), 500
    finally:
        db.close()

@admin_bp.route('/detections', methods=['GET'])
def list_detections():
    page = int(request.args.get('page', 1))
    page_size = int(request.args.get('pageSize', 20))
    offset = (page - 1) * page_size
    db = SessionLocal()
    try:
        total = db.query(Detection).count()
        rows = db.query(Detection).order_by(Detection.timestamp.desc()).offset(offset).limit(page_size).all()
        data = [{
            'detectionId': r.detection_id,
            'farmerId': r.farmer_id,
            'landId': r.land_id,
            'diseaseId': r.disease_id,
            'imageUrl': r.image_ref,
            'confidence': r.confidence_score,
            'status': r.status,
            'timestamp': r.timestamp.isoformat() if r.timestamp else None,
            'latitude': getattr(r, 'latitude', None),
            'longitude': getattr(r, 'longitude', None),
            'alertGenerated': getattr(r, 'alert_generated', None),
        } for r in rows]
        return jsonify({'total': total, 'page': page, 'pageSize': page_size, 'items': data})
    except Exception as e:
        print('❌ Error fetching admin detections:', str(e))
        return jsonify({'error': 'Failed to fetch detections', 'details': str(e)}), 500
    finally:
        db.close()


@admin_bp.route('/reports', methods=['GET'])
def list_reports():
    page = int(request.args.get('page', 1))
    page_size = int(request.args.get('pageSize', 20))
    status = (request.args.get('status') or '').strip().lower()
    q = (request.args.get('q') or '').strip().lower()
    offset = (page - 1) * page_size
    db = SessionLocal()
    try:
        rows = db.query(Detection).order_by(Detection.timestamp.desc()).all()
        farmer_ids = list({r.farmer_id for r in rows if r.farmer_id})
        farmer_map = {}
        if farmer_ids:
            farmers = db.query(User).filter(User.user_id.in_(farmer_ids)).all()
            farmer_map = {u.user_id: u for u in farmers}

        items = []
        for r in rows:
            farmer = farmer_map.get(r.farmer_id)
            farmer_name = (farmer.name if farmer and farmer.name else f"Farmer {r.farmer_id}") if r.farmer_id else 'Unknown farmer'
            location = ''
            if farmer:
                if getattr(farmer, 'location', None):
                    location = farmer.location
                elif getattr(farmer, 'latitude', None) is not None and getattr(farmer, 'longitude', None) is not None:
                    location = f"{farmer.latitude:.4f}, {farmer.longitude:.4f}"

            report = {
                'id': r.detection_id,
                'detectionId': r.detection_id,
                'farmerId': r.farmer_id,
                'farmerName': farmer_name,
                'diseaseName': r.disease_name or r.disease_id or 'Unknown disease',
                'cropType': (r.crop_type or 'unknown').title(),
                'location': location or 'Unknown location',
                'status': (r.status or 'pending').lower(),
                'imageUrl': r.image_ref,
                'confidence': int(round(r.confidence_score or 0)),
                'submittedAt': r.timestamp.isoformat() if r.timestamp else None,
                'reviewedAt': r.timestamp.isoformat() if (r.status or '').lower() in ('reviewed', 'resolved') and r.timestamp else None,
            }
            items.append(report)

        if status and status != 'all':
            items = [item for item in items if item['status'] == status]

        if q:
            items = [
                item for item in items
                if q in (item['diseaseName'] or '').lower()
                or q in (item['farmerName'] or '').lower()
                or q in (item['cropType'] or '').lower()
                or q in (item['location'] or '').lower()
            ]

        total = len(items)
        page_items = items[offset: offset + page_size]
        return jsonify({'total': total, 'page': page, 'pageSize': page_size, 'items': page_items})
    except Exception as e:
        print('❌ Error fetching admin reports:', str(e))
        return jsonify({'error': 'Failed to fetch reports', 'details': str(e)}), 500
    finally:
        db.close()


@admin_bp.route('/reports/<report_id>/status', methods=['POST'])
def update_report_status(report_id):
    db = SessionLocal()
    try:
        payload = request.get_json(silent=True) or {}
        new_status = (payload.get('status') or '').strip().lower()
        if new_status not in ('pending', 'reviewed', 'resolved'):
            return jsonify({'error': 'status must be pending, reviewed, or resolved'}), 400

        row = db.query(Detection).filter(Detection.detection_id == report_id).first()
        if not row:
            return jsonify({'error': 'Report not found'}), 404

        row.status = new_status
        db.commit()
        return jsonify({'success': True, 'id': report_id, 'status': new_status})
    except Exception as e:
        db.rollback()
        print('❌ Error updating report status:', str(e))
        return jsonify({'error': 'Failed to update report status', 'details': str(e)}), 500
    finally:
        db.close()


@admin_bp.route('/subsidies', methods=['GET'])
def list_subsidies():
    status = (request.args.get('status') or 'all').strip().lower()
    q = (request.args.get('q') or '').strip().lower()
    db = SessionLocal()
    try:
        rows = db.query(SubsidyProgram).order_by(SubsidyProgram.created_at.desc()).all()
        top_level, all_items = _build_subsidy_tree(rows)
        items = top_level
        if status != 'all':
            items = [i for i in items if i.get('status') == status]
        if q:
            items = [
                i for i in items
                if q in (i.get('title') or '').lower()
                or q in (i.get('description') or '').lower()
                or any(q in c.lower() for c in i.get('eligibilityCriteria') or [])
            ]
        return jsonify({
            'total': len(items),
            'items': items,
            'allItems': all_items,
        })
    except Exception as e:
        print('❌ Error fetching subsidies:', str(e))
        return jsonify({'error': 'Failed to fetch subsidies', 'details': str(e)}), 500
    finally:
        db.close()


@admin_bp.route('/subsidies', methods=['POST'])
def create_subsidy():
    payload = request.get_json(silent=True) or {}
    title = (payload.get('title') or '').strip()
    if not title:
        return jsonify({'error': 'title is required'}), 400

    amount = _safe_float(payload.get('amount'), 0.0)
    max_amount = _safe_float(payload.get('maxAmount'), amount)
    if amount < 0 or max_amount < 0:
        return jsonify({'error': 'amount values must be non-negative'}), 400

    criteria = _parse_criteria(payload.get('eligibilityCriteria'))
    deadline = _parse_iso_datetime(payload.get('applicationDeadline'))
    status = (payload.get('status') or 'active').strip().lower()
    if status not in ('active', 'paused', 'expired'):
        status = 'active'

    db = SessionLocal()
    try:
        parent_subsidy_id = (payload.get('parentSubsidyId') or '').strip() or None
        if parent_subsidy_id:
            parent = db.query(SubsidyProgram).filter(SubsidyProgram.subsidy_id == parent_subsidy_id).first()
            if not parent:
                return jsonify({'error': 'parent subsidy not found'}), 404

        row = SubsidyProgram(
            subsidy_id=str(uuid.uuid4()),
            parent_subsidy_id=parent_subsidy_id,
            title=title,
            description=(payload.get('description') or '').strip(),
            amount=amount,
            max_amount=max_amount,
            eligibility_criteria=json.dumps(criteria),
            application_deadline=deadline,
            status=status,
            total_applicants=max(0, _safe_int(payload.get('totalApplicants'), 0)),
            approved_applicants=max(0, _safe_int(payload.get('approvedApplicants'), 0)),
            total_disbursed=max(0.0, _safe_float(payload.get('totalDisbursed'), 0.0)),
        )
        db.add(row)
        db.commit()
        return jsonify({'success': True, 'item': _serialize_subsidy(row)}), 201
    except Exception as e:
        db.rollback()
        print('❌ Error creating subsidy:', str(e))
        return jsonify({'error': 'Failed to create subsidy', 'details': str(e)}), 500
    finally:
        db.close()


@admin_bp.route('/subsidies/<subsidy_id>', methods=['PUT'])
def update_subsidy(subsidy_id):
    payload = request.get_json(silent=True) or {}
    db = SessionLocal()
    try:
        row = db.query(SubsidyProgram).filter(SubsidyProgram.subsidy_id == subsidy_id).first()
        if not row:
            return jsonify({'error': 'Subsidy not found'}), 404

        if 'title' in payload:
            title = (payload.get('title') or '').strip()
            if not title:
                return jsonify({'error': 'title cannot be empty'}), 400
            row.title = title
        if 'description' in payload:
            row.description = (payload.get('description') or '').strip()
        if 'amount' in payload:
            row.amount = max(0.0, _safe_float(payload.get('amount'), 0.0))
        if 'maxAmount' in payload:
            row.max_amount = max(0.0, _safe_float(payload.get('maxAmount'), row.amount or 0.0))
        if 'eligibilityCriteria' in payload:
            row.eligibility_criteria = json.dumps(_parse_criteria(payload.get('eligibilityCriteria')))
        if 'applicationDeadline' in payload:
            row.application_deadline = _parse_iso_datetime(payload.get('applicationDeadline'))
        if 'status' in payload:
            status = (payload.get('status') or '').strip().lower()
            if status in ('active', 'paused', 'expired'):
                row.status = status
        if 'totalApplicants' in payload:
            row.total_applicants = max(0, _safe_int(payload.get('totalApplicants'), row.total_applicants))
        if 'approvedApplicants' in payload:
            row.approved_applicants = max(0, _safe_int(payload.get('approvedApplicants'), row.approved_applicants))
        if 'totalDisbursed' in payload:
            row.total_disbursed = max(0.0, _safe_float(payload.get('totalDisbursed'), row.total_disbursed))

        db.commit()
        return jsonify({'success': True, 'item': _serialize_subsidy(row)})
    except Exception as e:
        db.rollback()
        print('❌ Error updating subsidy:', str(e))
        return jsonify({'error': 'Failed to update subsidy', 'details': str(e)}), 500
    finally:
        db.close()


@admin_bp.route('/subsidies/<subsidy_id>/status', methods=['POST'])
def update_subsidy_status(subsidy_id):
    payload = request.get_json(silent=True) or {}
    status = (payload.get('status') or '').strip().lower()
    if status not in ('active', 'paused', 'expired'):
        return jsonify({'error': 'status must be active, paused, or expired'}), 400

    db = SessionLocal()
    try:
        row = db.query(SubsidyProgram).filter(SubsidyProgram.subsidy_id == subsidy_id).first()
        if not row:
            return jsonify({'error': 'Subsidy not found'}), 404
        row.status = status
        db.commit()
        return jsonify({'success': True, 'item': _serialize_subsidy(row)})
    except Exception as e:
        db.rollback()
        print('❌ Error updating subsidy status:', str(e))
        return jsonify({'error': 'Failed to update subsidy status', 'details': str(e)}), 500
    finally:
        db.close()


@admin_bp.route('/subsidies/<subsidy_id>', methods=['DELETE'])
def delete_subsidy(subsidy_id):
    db = SessionLocal()
    try:
        row = db.query(SubsidyProgram).filter(SubsidyProgram.subsidy_id == subsidy_id).first()
        if not row:
            return jsonify({'error': 'Subsidy not found'}), 404

        child_rows = db.query(SubsidyProgram).filter(SubsidyProgram.parent_subsidy_id == subsidy_id).all()
        child_ids = [c.subsidy_id for c in child_rows]
        delete_ids = [subsidy_id, *child_ids]
        if delete_ids:
            db.query(SubsidyApplication).filter(SubsidyApplication.subsidy_id.in_(delete_ids)).delete(synchronize_session=False)
        for child in child_rows:
            db.delete(child)
        db.delete(row)
        db.commit()
        return jsonify({'success': True, 'deletedSubsidyId': subsidy_id, 'deletedChildren': len(child_rows)})
    except Exception as e:
        db.rollback()
        print('❌ Error deleting subsidy:', str(e))
        return jsonify({'error': 'Failed to delete subsidy', 'details': str(e)}), 500
    finally:
        db.close()


@admin_bp.route('/subsidy-applications', methods=['GET'])
def list_subsidy_applications():
    status = (request.args.get('status') or 'all').strip().lower()
    db = SessionLocal()
    try:
        q = db.query(SubsidyApplication)
        if status != 'all':
            q = q.filter(SubsidyApplication.status == status)
        rows = q.order_by(SubsidyApplication.created_at.desc()).all()

        subsidy_ids = list({r.subsidy_id for r in rows if r.subsidy_id})
        farmer_ids = list({r.farmer_id for r in rows if r.farmer_id})
        subsidy_map = {}
        farmer_map = {}
        if subsidy_ids:
            subsidies = db.query(SubsidyProgram).filter(SubsidyProgram.subsidy_id.in_(subsidy_ids)).all()
            subsidy_map = {s.subsidy_id: s for s in subsidies}
        if farmer_ids:
            farmers = db.query(User).filter(User.user_id.in_(farmer_ids)).all()
            farmer_map = {f.user_id: f for f in farmers}

        items = []
        for r in rows:
            subsidy = subsidy_map.get(r.subsidy_id)
            farmer = farmer_map.get(r.farmer_id)
            items.append({
                'applicationId': r.application_id,
                'subsidyId': r.subsidy_id,
                'subsidyTitle': subsidy.title if subsidy else 'Unknown subsidy',
                'farmerId': r.farmer_id,
                'farmerName': (farmer.name if farmer and farmer.name else f"Farmer {r.farmer_id}"),
                'farmerLocation': (getattr(farmer, 'location', None) if farmer else None),
                'status': (r.status or 'pending').lower(),
                'applyNote': r.apply_note,
                'decisionNote': r.decision_note,
                'createdAt': r.created_at.isoformat() if r.created_at else None,
                'decidedAt': r.decided_at.isoformat() if r.decided_at else None,
            })

        return jsonify({'total': len(items), 'items': items})
    except Exception as e:
        print('❌ Error listing subsidy applications:', str(e))
        return jsonify({'error': 'Failed to load subsidy applications', 'details': str(e)}), 500
    finally:
        db.close()


@admin_bp.route('/subsidy-applications/<application_id>/status', methods=['POST'])
def decide_subsidy_application(application_id):
    payload = request.get_json(silent=True) or {}
    next_status = (payload.get('status') or '').strip().lower()
    decision_note = (payload.get('decisionNote') or '').strip() or None
    if next_status not in ('accepted', 'rejected'):
        return jsonify({'error': 'status must be accepted or rejected'}), 400

    db = SessionLocal()
    try:
        row = db.query(SubsidyApplication).filter(SubsidyApplication.application_id == application_id).first()
        if not row:
            return jsonify({'error': 'Subsidy application not found'}), 404

        if (row.status or '').lower() == next_status:
            return jsonify({'success': True, 'status': next_status})

        previous_status = (row.status or 'pending').lower()
        row.status = next_status
        row.decision_note = decision_note
        row.decided_at = datetime.utcnow()

        subsidy = db.query(SubsidyProgram).filter(SubsidyProgram.subsidy_id == row.subsidy_id).first()
        if subsidy:
            if previous_status != 'accepted' and next_status == 'accepted':
                subsidy.approved_applicants = int(getattr(subsidy, 'approved_applicants', 0) or 0) + 1
            elif previous_status == 'accepted' and next_status == 'rejected':
                subsidy.approved_applicants = max(0, int(getattr(subsidy, 'approved_applicants', 0) or 0) - 1)

        db.commit()
        return jsonify({'success': True, 'applicationId': application_id, 'status': next_status})
    except Exception as e:
        db.rollback()
        print('❌ Error deciding subsidy application:', str(e))
        return jsonify({'error': 'Failed to decide subsidy application', 'details': str(e)}), 500
    finally:
        db.close()


@admin_bp.route('/alerts', methods=['GET'])
def list_alerts():
    status = request.args.get('status')
    db = SessionLocal()
    try:
        # Check if OutbreakAlerts table exists
        from sqlalchemy import inspect
        inspector = inspect(db.bind)
        if 'OutbreakAlerts' not in inspector.get_table_names():
            return jsonify({'items': []})
        
        q = db.query(OutbreakAlert)
        if status:
            q = q.filter(OutbreakAlert.status == status)
        alerts = q.order_by(OutbreakAlert.created_at.desc()).all()
        items = [{
            'alertId': a.alert_id,
            'diseaseId': a.disease_id,
            'diseaseName': getattr(a, 'disease_name', None) or a.disease_id or 'Unknown',
            'status': a.status,
            'createdAt': a.created_at.isoformat() if a.created_at else None,
            'centerLat': a.center_lat,
            'centerLng': a.center_lng,
            'radiusKm': a.radius_km,
        } for a in alerts]
        print(f"📋 Found {len(items)} outbreak alerts")
        return jsonify({'items': items})
    except Exception as e:
        print('❌ Error fetching alerts:', str(e))
        # Return empty list instead of error if table doesn't exist yet
        if 'no such table' in str(e).lower() or 'OutbreakAlerts' in str(e):
            return jsonify({'items': []})
        return jsonify({'error': 'Failed to fetch alerts', 'details': str(e)}), 500
    finally:
        db.close()


@admin_bp.route('/alerts/<alert_id>/approve', methods=['POST'])
def approve_alert(alert_id):
    db = SessionLocal()
    try:
        # Check if OutbreakAlerts table exists
        from sqlalchemy import inspect
        inspector = inspect(db.bind)
        if 'OutbreakAlerts' not in inspector.get_table_names():
            return jsonify({'error': 'OutbreakAlerts table not found. Please run database migration.'}), 500
        
        alert = db.query(OutbreakAlert).filter(OutbreakAlert.alert_id == alert_id).first()
        if not alert:
            return jsonify({'error': 'Alert not found'}), 404
        alert.status = 'approved'
        # Mark related detections as approved based on geo-radius and disease match
        # Use getattr to safely access columns that might not exist yet
        detections = db.query(Detection).filter(
            Detection.disease_id == alert.disease_id,
        ).all()
        for d in detections:
            if hasattr(d, 'latitude') and hasattr(d, 'longitude'):
                if getattr(d, 'latitude', None) is not None and getattr(d, 'longitude', None) is not None:
                    if hasattr(d, 'alert_generated'):
                        d.alert_generated = 'approved'
        db.commit()
        return jsonify({'success': True})
    except Exception as e:
        print('❌ Error approving alert:', str(e))
        db.rollback()
        return jsonify({'error': 'Failed to approve alert', 'details': str(e)}), 500
    finally:
        db.close()


@admin_bp.route('/heatmap/stats', methods=['GET'])
def heatmap_stats():
    """Get statistics for heatmap display"""
    db = SessionLocal()
    try:
        from sqlalchemy import func, distinct
        from datetime import datetime, timedelta
        
        # Total cases (all detections with diseases, excluding healthy crops)
        total_cases = db.query(Detection).filter(
            Detection.disease_name != 'Healthy Crop',
            Detection.disease_name.isnot(None)
        ).count()
        
        # Affected regions (unique locations from approved alerts)
        affected_regions = db.query(OutbreakAlert).filter(
            OutbreakAlert.status == 'approved'
        ).count()
        
        # Weekly increase (detections in last 7 days vs previous 7 days)
        now = datetime.utcnow()
        week_ago = now - timedelta(days=7)
        two_weeks_ago = now - timedelta(days=14)
        
        this_week = db.query(Detection).filter(
            Detection.timestamp >= week_ago,
            Detection.disease_name != 'Healthy Crop'
        ).count()
        
        last_week = db.query(Detection).filter(
            Detection.timestamp >= two_weeks_ago,
            Detection.timestamp < week_ago,
            Detection.disease_name != 'Healthy Crop'
        ).count()
        
        weekly_increase = 0
        if last_week > 0:
            weekly_increase = round(((this_week - last_week) / last_week) * 100, 1)
        elif this_week > 0:
            weekly_increase = 100.0
        
        # Estimate acres affected (simplified: assume each detection is from ~1 acre)
        # In production, this would come from land_id area data
        acres_affected = total_cases * 1.0  # Simplified estimation
        
        return jsonify({
            'totalCases': total_cases,
            'affectedRegions': affected_regions,
            'weeklyIncrease': weekly_increase,
            'acresAffected': round(acres_affected / 1000, 1) if acres_affected >= 1000 else round(acres_affected, 1),
            'acresAffectedRaw': acres_affected
        })
    except Exception as e:
        print('❌ Error fetching heatmap stats:', str(e))
        return jsonify({
            'totalCases': 0,
            'affectedRegions': 0,
            'weeklyIncrease': 0,
            'acresAffected': 0,
            'acresAffectedRaw': 0
        }), 500
    finally:
        db.close()


@admin_bp.route('/heatmap/points', methods=['GET'])
def heatmap_points():
    """Get all detection points for heatmap visualization"""
    db = SessionLocal()
    try:
        import math
        
        # Get all detections that are part of approved alerts
        approved_alerts = db.query(OutbreakAlert).filter(
            OutbreakAlert.status == 'approved'
        ).all()
        
        # Helper function to check if coordinates are in Pakistan
        def is_in_pakistan(lat, lng):
            return lat >= 23.5 and lat <= 37.0 and lng >= 60.0 and lng <= 77.0
        
        # Get all detections with coordinates and disease names
        all_detections = db.query(Detection).filter(
            Detection.latitude.isnot(None),
            Detection.longitude.isnot(None),
            Detection.disease_name.isnot(None),
            Detection.disease_name != 'Healthy Crop'
        ).all()
        
        # Filter to only include detections within Pakistan bounds
        detections = [
            d for d in all_detections 
            if is_in_pakistan(d.latitude, d.longitude)
        ]
        
        print(f"🔍 Found {len(all_detections)} total detections, {len(detections)} within Pakistan bounds")
        
        # Calculate intensity for each point based on nearby detections
        points = []
        for det in detections:
            # Count nearby detections within 10km radius (to calculate intensity)
            nearby_count = 0
            for other_det in detections:
                if other_det.detection_id != det.detection_id:
                    # Haversine distance calculation
                    lat1, lng1 = det.latitude, det.longitude
                    lat2, lng2 = other_det.latitude, other_det.longitude
                    
                    r = 6371.0  # Earth radius in km
                    d_lat = math.radians(lat2 - lat1)
                    d_lng = math.radians(lng2 - lng1)
                    a = (
                        math.sin(d_lat / 2) ** 2
                        + math.cos(math.radians(lat1))
                        * math.cos(math.radians(lat2))
                        * math.sin(d_lng / 2) ** 2
                    )
                    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
                    distance_km = r * c
                    
                    if distance_km <= 10.0:
                        nearby_count += 1
            
            # Intensity from regional peer density as 0–100% (same scale as outbreak sensitivity)
            intensity = heatmap_point_intensity_percent(nearby_count)
            
            points.append({
                'latitude': float(det.latitude),
                'longitude': float(det.longitude),
                'intensity': int(intensity),
                'diseaseName': str(det.disease_name or 'Unknown'),
            })
        
        print(f"📍 Generated {len(points)} heatmap points")
        if len(points) > 0:
            print(f"   Sample point: lat={points[0]['latitude']}, lng={points[0]['longitude']}, intensity={points[0]['intensity']}")
        
        return jsonify({'points': points})
    except Exception as e:
        print('❌ Error fetching heatmap points:', str(e))
        return jsonify({'points': []}), 500
    finally:
        db.close()


@admin_bp.route('/heatmap/alert-details/<alert_id>', methods=['GET'])
def alert_details(alert_id):
    """Get case count for a specific alert"""
    db = SessionLocal()
    try:
        from sqlalchemy import func
        import math
        
        alert = db.query(OutbreakAlert).filter(OutbreakAlert.alert_id == alert_id).first()
        if not alert:
            return jsonify({
                'cases': 0,
                'sensitivityPercent': 0.0,
                'severity': 'low',
            }), 404
        
        # Count detections within the alert's radius
        def _haversine_km(lat1, lng1, lat2, lng2):
            r = 6371.0
            d_lat = math.radians(lat2 - lat1)
            d_lng = math.radians(lng2 - lng1)
            a = (
                math.sin(d_lat / 2) ** 2
                + math.cos(math.radians(lat1))
                * math.cos(math.radians(lat2))
                * math.sin(d_lng / 2) ** 2
            )
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            return r * c
        
        # Get disease name from alert
        disease_name = getattr(alert, 'disease_name', None) or alert.disease_id
        
        # Get all detections of the same disease
        detections = db.query(Detection).filter(
            Detection.disease_name == disease_name,
            Detection.latitude.isnot(None),
            Detection.longitude.isnot(None)
        ).all()
        
        # Count those within radius
        case_count = sum(
            1 for d in detections
            if _haversine_km(
                alert.center_lat, alert.center_lng,
                d.latitude, d.longitude
            ) <= alert.radius_km
        )
        
        sensitivity_pct = cluster_sensitivity_percent(case_count)
        severity = severity_from_sensitivity_pct(sensitivity_pct)
        return jsonify({
            'cases': case_count,
            'sensitivityPercent': round(sensitivity_pct, 1),
            'severity': severity,
        })
    except Exception as e:
        print('❌ Error fetching alert details:', str(e))
        return jsonify({
            'cases': 0,
            'sensitivityPercent': 0.0,
            'severity': 'low',
        }), 500
    finally:
        db.close()


@admin_bp.route('/farmers', methods=['GET'])
def list_farmers():
    """
    Get all farmers with their name and location.
    Returns users with role='farmer'.
    """
    db = SessionLocal()
    try:
        # Query all users with role='farmer'
        farmers = db.query(User).filter(User.role == 'farmer').order_by(User.created_at.desc()).all()
        
        items = []
        for f in farmers:
            # Get location - either from location string or coordinates
            location_str = None
            if getattr(f, 'location', None):
                location_str = f.location
            elif getattr(f, 'latitude', None) and getattr(f, 'longitude', None):
                location_str = f"Lat: {f.latitude:.4f}, Lng: {f.longitude:.4f}"
            
            items.append({
                'id': f.user_id,
                'name': f.name,
                'email': f.email,
                'phone': getattr(f, 'phone', None),
                'location': location_str,
                'latitude': getattr(f, 'latitude', None),
                'longitude': getattr(f, 'longitude', None),
                'registrationDate': f.created_at.isoformat() if f.created_at else None,
                'restrictedUntil': f.restricted_until.isoformat() if getattr(f, 'restricted_until', None) else None,
                'restrictionReason': getattr(f, 'restriction_reason', None),
            })
        
        return jsonify({
            'total': len(items),
            'items': items
        })
    except Exception as e:
        print('❌ Error fetching farmers:', str(e))
        return jsonify({'error': 'Failed to fetch farmers', 'details': str(e)}), 500
    finally:
        db.close()


@admin_bp.route('/farmers/<farmer_id>/restrict', methods=['POST'])
def restrict_farmer_account(farmer_id):
    db = SessionLocal()
    try:
        payload = request.get_json(silent=True) or {}
        days = _parse_positive_days(payload.get('days'))
        if not days:
            return jsonify({'error': 'days must be a positive integer'}), 400
        reason = (payload.get('reason') or '').strip() or None

        farmer = db.query(User).filter(User.user_id == farmer_id, User.role == 'farmer').first()
        if not farmer:
            return jsonify({'error': 'Farmer not found'}), 404

        restricted_until = datetime.utcnow() + timedelta(days=days)
        farmer.restricted_until = restricted_until
        farmer.restriction_reason = reason
        farmer.token_version = int(getattr(farmer, 'token_version', 0) or 0) + 1
        db.commit()

        return jsonify({
            'success': True,
            'farmerId': farmer.user_id,
            'restrictedUntil': restricted_until.isoformat(),
            'restrictionReason': reason,
        })
    except Exception as e:
        db.rollback()
        print('❌ Error restricting farmer account:', str(e))
        return jsonify({'error': 'Failed to restrict farmer account', 'details': str(e)}), 500
    finally:
        db.close()


@admin_bp.route('/farmers/<farmer_id>/unrestrict', methods=['POST'])
def unrestrict_farmer_account(farmer_id):
    db = SessionLocal()
    try:
        farmer = db.query(User).filter(User.user_id == farmer_id, User.role == 'farmer').first()
        if not farmer:
            return jsonify({'error': 'Farmer not found'}), 404

        farmer.restricted_until = None
        farmer.restriction_reason = None
        farmer.token_version = int(getattr(farmer, 'token_version', 0) or 0) + 1
        db.commit()

        return jsonify({
            'success': True,
            'farmerId': farmer.user_id,
            'restrictedUntil': None,
        })
    except Exception as e:
        db.rollback()
        print('❌ Error removing farmer restriction:', str(e))
        return jsonify({'error': 'Failed to remove farmer restriction', 'details': str(e)}), 500
    finally:
        db.close()


@admin_bp.route('/farmers/<farmer_id>', methods=['DELETE'])
def delete_farmer_account(farmer_id):
    db = SessionLocal()
    try:
        farmer = db.query(User).filter(User.user_id == farmer_id, User.role == 'farmer').first()
        if not farmer:
            return jsonify({'error': 'Farmer not found'}), 404

        try:
            from ..schemas.detection import Detection
            from ..schemas.chat_conversation import ChatConversation, ChatMessage
            from ..models import Crop, TimelapseEntry
        except ImportError:
            from schemas.detection import Detection
            from schemas.chat_conversation import ChatConversation, ChatMessage
            from models import Crop, TimelapseEntry

        conv_ids = [c[0] for c in db.query(ChatConversation.id).filter(ChatConversation.user_id == farmer_id).all()]
        if conv_ids:
            db.query(ChatMessage).filter(ChatMessage.conversation_id.in_(conv_ids)).delete(synchronize_session=False)
            db.query(ChatConversation).filter(ChatConversation.user_id == farmer_id).delete(synchronize_session=False)

        crop_ids = [c[0] for c in db.query(Crop.id).filter(Crop.farmer_id == farmer_id).all()]
        if crop_ids:
            db.query(TimelapseEntry).filter(TimelapseEntry.crop_id.in_(crop_ids)).delete(synchronize_session=False)
            db.query(Crop).filter(Crop.farmer_id == farmer_id).delete(synchronize_session=False)

        db.query(Detection).filter(Detection.farmer_id == farmer_id).delete(synchronize_session=False)
        db.delete(farmer)
        db.commit()

        return jsonify({'success': True, 'deletedFarmerId': farmer_id})
    except Exception as e:
        db.rollback()
        print('❌ Error deleting farmer account:', str(e))
        return jsonify({'error': 'Failed to delete farmer account', 'details': str(e)}), 500
    finally:
        db.close()
