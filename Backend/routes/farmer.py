import os
import uuid
import datetime
import math
from flask import Blueprint, request, jsonify, current_app, url_for
from PIL import Image
from sqlalchemy import func
import io
try:
    from ..db import SessionLocal
    from ..schemas.detection import Detection, OutbreakAlert
    from ..schemas.guidance import DiseaseGuidance
    from ..core.yolo import get_model_for_crop
except ImportError:
    # Fallback when running as a script: python Backend/app.py
    from db import SessionLocal
    from schemas.detection import Detection, OutbreakAlert
    from schemas.guidance import DiseaseGuidance
    from core.yolo import get_model_for_crop

farmer_bp = Blueprint('farmer', __name__, url_prefix='/api/farmer')

@farmer_bp.route('/detections', methods=['POST'])
def create_detection():
    try:
        print("\n📥 Incoming POST /api/farmer/detections")
        file = request.files.get('file')
        crop_type = (request.form.get('cropType') or request.args.get('cropType') or request.headers.get('X-Crop-Type') or '').lower()
        farmer_id = request.form.get('farmerId') or request.args.get('farmerId')
        land_id = request.form.get('landId') or request.args.get('landId')
        lat_raw = request.form.get('latitude') or request.args.get('latitude')
        lng_raw = request.form.get('longitude') or request.args.get('longitude')

        if not file:
            return jsonify({'error': 'Missing file field'}), 400
        if not crop_type:
            return jsonify({'error': 'Missing cropType'}), 400
        if not farmer_id:
            return jsonify({'error': 'Missing farmerId'}), 400

        # Run prediction
        model = get_model_for_crop(crop_type)
        image_bytes = file.read()
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        results = model.predict(image)
        detections = results[0]

        prediction_list = []
        for box in detections.boxes:
            cls_id = int(box.cls)
            conf = float(box.conf)
            label = detections.names[cls_id]
            confidence_pct = round(conf * 100, 2)
            prediction_list.append({'label': label, 'confidence': confidence_pct})

        if prediction_list:
            top_pred = prediction_list[0]
            disease_name = top_pred['label']
            confidence = top_pred['confidence']
        else:
            disease_name = 'Healthy Crop'
            confidence = 100.0

        # Persist detection
        detection_id = str(uuid.uuid4())
        uploads_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'detections')
        os.makedirs(uploads_dir, exist_ok=True)
        filename = f"{detection_id}.jpg"
        save_path = os.path.join(uploads_dir, filename)
        image.save(save_path, format='JPEG')

        # Construct URL for the saved image
        image_url = url_for('static', filename=f"uploads/detections/{filename}", _external=True)

        db = SessionLocal()
        try:
            latitude = float(lat_raw) if lat_raw is not None else None
            longitude = float(lng_raw) if lng_raw is not None else None

            det = Detection(
                detection_id=detection_id,
                farmer_id=farmer_id,
                land_id=land_id,
                disease_id=None,  # mapping to Diseases table can be added if available
                image_ref=image_url,
                confidence_score=confidence,
                status='pending',
                latitude=latitude,
                longitude=longitude,
                alert_generated='no',
            )
            db.add(det)
            db.commit()

            # --- Geo-based outbreak detection (inline, minimal) ---
            if disease_name != 'Healthy Crop' and latitude is not None and longitude is not None:
                # Simple haversine distance in km
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

                two_weeks_ago = datetime.datetime.utcnow() - datetime.timedelta(days=14)
                recent = db.query(Detection).filter(
                    Detection.disease_id == det.disease_id,
                    Detection.timestamp >= two_weeks_ago,
                    Detection.latitude.isnot(None),
                    Detection.longitude.isnot(None),
                ).all()

                nearby = [
                    d for d in recent
                    if _haversine_km(latitude, longitude, d.latitude, d.longitude) <= 10.0
                ]

                if len(nearby) >= 3:
                    alert_id = str(uuid.uuid4())
                    alert = OutbreakAlert(
                        alert_id=alert_id,
                        disease_id=det.disease_id or 'unknown',
                        status='pending',
                        center_lat=latitude,
                        center_lng=longitude,
                        radius_km=10.0,
                    )
                    db.add(alert)
                    for d in nearby:
                        d.alert_generated = 'pending'
                    det.alert_generated = 'pending'
                    db.commit()
        finally:
            db.close()

        # Try to enrich with guidance from DB (normalize names to handle underscores/hyphens/case)
        db = SessionLocal()
        try:
            norm_crop = crop_type.strip().lower()
            norm_disease = disease_name.strip().lower().replace('_', ' ').replace('-', ' ')
            guidance = db.query(DiseaseGuidance).filter(
                func.lower(DiseaseGuidance.crop) == norm_crop,
                func.replace(func.replace(func.lower(DiseaseGuidance.name), '_', ' '), '-', ' ') == norm_disease
            ).first()
        finally:
            db.close()

        # Map guidance fields to UI fields
        treatment = None
        symptoms_list = None
        prevention_list = None
        if guidance:
            treatment_parts = []
            if guidance.chemical_control:
                treatment_parts.append(guidance.chemical_control)
            if guidance.brands:
                treatment_parts.append(f"e.g., {guidance.brands}")
            treatment = ' — '.join(treatment_parts) if treatment_parts else None
            if guidance.symptoms:
                symptoms_list = [s.strip() for s in guidance.symptoms.replace(' and ', ';').replace(',', ';').split(';') if s.strip()]
            if guidance.cultural_controls:
                prevention_list = [s.strip() for s in guidance.cultural_controls.replace(' and ', ';').replace(',', ';').split(';') if s.strip()]

        severity = 'High' if confidence > 80 else ('Medium' if confidence > 50 else 'Low')
        return jsonify({
            'detectionId': detection_id,
            'cropType': crop_type,
            'disease': disease_name,
            'confidence': confidence,
            'severity': severity,
            'imageUrl': image_url,
            'treatment': treatment or 'Follow integrated management: monitor regularly; use resistant varieties; apply labeled products as needed.',
            'symptoms': symptoms_list or ['Lesions or discoloration detected on leaves'],
            'prevention': prevention_list or ['Use resistant crop variety', 'Avoid overwatering', 'Balanced fertilization'],
            'latitude': latitude,
            'longitude': longitude,
        }), 201

    except Exception as e:
        print('❌ Error creating detection:', str(e))
        return jsonify({'error': 'Failed to create detection'}), 500


@farmer_bp.route('/detections/recent', methods=['GET'])
def recent_detections():
    farmer_id = request.args.get('farmerId')
    if not farmer_id:
        return jsonify({'error': 'Missing farmerId'}), 400
    db = SessionLocal()
    try:
        rows = db.query(Detection).filter(Detection.farmer_id == farmer_id).order_by(Detection.timestamp.desc()).limit(10).all()
        data = [{
            'id': r.detection_id,
            'name': 'Unknown Disease',
            'severity': 'high' if (r.confidence_score or 0) > 80 else ('medium' if (r.confidence_score or 0) > 50 else 'low'),
            'treatment': '',
            'imageUrl': r.image_ref,
            'detectedAt': r.timestamp.isoformat() if r.timestamp else None,
        } for r in rows]
        return jsonify({'detections': data})
    except Exception as e:
        print('❌ Error fetching recent detections:', str(e))
        return jsonify({'error': 'Failed to fetch detections', 'details': str(e)}), 500
    finally:
        db.close()


@farmer_bp.route('/stats/health', methods=['GET'])
def crop_health_stats():
    """Get crop health statistics for farmer dashboard"""
    farmer_id = request.args.get('farmerId')
    if not farmer_id:
        return jsonify({'error': 'Missing farmerId'}), 400
    
    db = SessionLocal()
    try:
        # Get all detections for the farmer
        detections = db.query(Detection).filter(Detection.farmer_id == farmer_id).all()
        
        total = len(detections)
        if total == 0:
            return jsonify({
                'healthy': 100,
                'atRisk': 0,
                'diseased': 0,
                'totalScans': 0
            })
        
        # Categorize by confidence score
        healthy = 0
        at_risk = 0
        diseased = 0
        
        for det in detections:
            conf = det.confidence_score or 0
            if conf == 0 or conf < 50:
                healthy += 1
            elif conf < 80:
                at_risk += 1
            else:
                diseased += 1
        
        return jsonify({
            'healthy': round((healthy / total) * 100, 1),
            'atRisk': round((at_risk / total) * 100, 1),
            'diseased': round((diseased / total) * 100, 1),
            'totalScans': total
        })
    except Exception as e:
        print('❌ Error fetching crop health stats:', str(e))
        return jsonify({'error': 'Failed to fetch stats', 'details': str(e)}), 500
    finally:
        db.close()


@farmer_bp.route('/stats/disease-incidence', methods=['GET'])
def disease_incidence():
    """Get disease incidence by crop type"""
    farmer_id = request.args.get('farmerId')
    if not farmer_id:
        return jsonify({'error': 'Missing farmerId'}), 400
    
    db = SessionLocal()
    try:
        # Get detections grouped by crop type (we'll need to add crop_type to Detection model or parse from disease_id)
        # For now, return mock data based on common crops
        detections = db.query(Detection).filter(
            Detection.farmer_id == farmer_id,
            Detection.confidence_score > 60  # Only count real diseases
        ).all()
        
        # Count by crop type (simplified - in production, store crop_type in Detection)
        crop_counts = {
            'Wheat': 0,
            'Rice': 0,
            'Cotton': 0,
            'Corn': 0
        }
        
        # This is simplified - in real implementation, store crop_type with each detection
        for det in detections:
            # For now, increment randomly or based on pattern
            # In production: use det.crop_type
            crop_counts['Wheat'] += 1  # Placeholder
        
        total = len(detections)
        if total == 0:
            return jsonify({
                'wheat': 0,
                'rice': 0,
                'cotton': 0,
                'corn': 0
            })
        
        return jsonify({
            'wheat': crop_counts.get('Wheat', 0),
            'rice': crop_counts.get('Rice', 0),
            'cotton': crop_counts.get('Cotton', 0),
            'corn': crop_counts.get('Corn', 0)
        })
    finally:
        db.close()


