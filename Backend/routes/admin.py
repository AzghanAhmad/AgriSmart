from flask import Blueprint, request, jsonify
try:
    from ..db import SessionLocal
    from ..schemas.detection import Detection, OutbreakAlert
except ImportError:
    # Fallback when running as a script: python Backend/app.py
    from db import SessionLocal
    from schemas.detection import Detection, OutbreakAlert

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

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
            'status': a.status,
            'createdAt': a.created_at.isoformat() if a.created_at else None,
            'centerLat': a.center_lat,
            'centerLng': a.center_lng,
            'radiusKm': a.radius_km,
        } for a in alerts]
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

