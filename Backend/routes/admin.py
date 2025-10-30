from flask import Blueprint, request, jsonify
from ..db import SessionLocal
from ..schemas.detection import Detection

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
        } for r in rows]
        return jsonify({'total': total, 'page': page, 'pageSize': page_size, 'items': data})
    finally:
        db.close()


