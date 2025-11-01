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
    from ..core.preprocessing import preprocess_from_bytes
except ImportError:
    # Fallback when running as a script: python Backend/app.py
    from db import SessionLocal
    from schemas.detection import Detection
    from schemas.guidance import DiseaseGuidance
    from core.yolo import get_model_for_crop
    from core.preprocessing import preprocess_from_bytes

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

        # Get image bytes and preprocess according to crop type
        image_bytes = file.read()
        print(f"🔧 Preprocessing {crop_type} image before model inference...")
        
        # Preprocess image using crop-specific preprocessing pipeline
        preprocessed_array = preprocess_from_bytes(image_bytes, crop_type)
        
        if preprocessed_array is None:
            return jsonify({'error': 'Failed to preprocess image'}), 400
        
        # Convert preprocessed numpy array (BGR) to PIL Image (RGB) for YOLO
        import cv2
        preprocessed_rgb = cv2.cvtColor(preprocessed_array, cv2.COLOR_BGR2RGB)
        preprocessed_image = Image.fromarray(preprocessed_rgb)
        
        # Also save original image for storage
        original_image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        
        # Run prediction with preprocessed image
        print(f"🔍 Running inference on preprocessed {crop_type} image...")
        model = get_model_for_crop(crop_type)
        results = model.predict(preprocessed_image)
        detections = results[0]

        prediction_list = []
        for box in detections.boxes:
            cls_id = int(box.cls)
            conf = float(box.conf)
            label = detections.names[cls_id]
            prediction_list.append({'label': label, 'confidence': round(conf * 100, 2)})

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
        # Save original image (not preprocessed) for storage
        original_image.save(save_path, format='JPEG')

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


