import os
import uuid
from flask import Blueprint, request, jsonify, current_app, url_for
from PIL import Image
from sqlalchemy import func
import io
try:
    from ..db import SessionLocal
    from ..schemas.detection import Detection
    from ..schemas.guidance import DiseaseGuidance
    from ..core.yolo import get_model_for_crop
except ImportError:
    # Fallback when running as a script: python Backend/app.py
    from db import SessionLocal
    from schemas.detection import Detection
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
            det = Detection(
                detection_id=detection_id,
                farmer_id=farmer_id,
                land_id=land_id,
                disease_id=None,  # mapping to Diseases table can be added if available
                image_ref=image_url,
                confidence_score=confidence,
                status='pending',
            )
            db.add(det)
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


