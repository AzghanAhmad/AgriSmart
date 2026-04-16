import os
import uuid
import datetime
import math
import io
from flask import Blueprint, request, jsonify, current_app, url_for, send_file
from PIL import Image
from sqlalchemy import func
import io
try:
    from ..db import SessionLocal
    from ..schemas.detection import Detection, OutbreakAlert
    from ..schemas.guidance import DiseaseGuidance
    from ..core.yolo import get_model_for_crop
    from ..core.outbreak_config import (
        cluster_sensitivity_percent,
        should_raise_outbreak_alert,
        OUTBREAK_ADMIN_ALERT_MIN_PCT,
    )
except ImportError:
    # Fallback when running as a script: python Backend/app.py
    from db import SessionLocal
    from schemas.detection import Detection, OutbreakAlert
    from schemas.guidance import DiseaseGuidance
    from core.yolo import get_model_for_crop
    from core.outbreak_config import (
        cluster_sensitivity_percent,
        should_raise_outbreak_alert,
        OUTBREAK_ADMIN_ALERT_MIN_PCT,
    )

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
                disease_id=None,  # placeholder for future disease table linkage
                disease_name=disease_name,
                crop_type=crop_type,  # Store crop type for schedule generation
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
                print(f"🔍 Checking for outbreak: {disease_name} at ({latitude}, {longitude})")
                
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
                    Detection.disease_name == disease_name,
                    Detection.timestamp >= two_weeks_ago,
                    Detection.latitude.isnot(None),
                    Detection.longitude.isnot(None),
                ).all()
                
                print(f"📊 Found {len(recent)} recent detections of {disease_name}")

                nearby = [
                    d for d in recent
                    if _haversine_km(latitude, longitude, d.latitude, d.longitude) <= 10.0
                ]
                
                sensitivity_pct = cluster_sensitivity_percent(len(nearby))
                print(
                    f"📍 {len(nearby)} reports in 10km → regional sensitivity {sensitivity_pct:.1f}% "
                    f"(admin threshold {OUTBREAK_ADMIN_ALERT_MIN_PCT}%)"
                )

                if should_raise_outbreak_alert(len(nearby)):
                    # Check if there's already a pending/approved alert for this disease in this area
                    existing_alert = db.query(OutbreakAlert).filter(
                        OutbreakAlert.disease_name == disease_name,
                        OutbreakAlert.status.in_(['pending', 'approved']),
                    ).first()
                    
                    if existing_alert:
                        # Check if existing alert is nearby (within 15km)
                        dist_to_existing = _haversine_km(
                            latitude, longitude, 
                            existing_alert.center_lat, existing_alert.center_lng
                        )
                        if dist_to_existing <= 15.0:
                            print(f"⚠️ Alert already exists for {disease_name} nearby (ID: {existing_alert.alert_id})")
                            # Just update the detection's alert status
                            det.alert_generated = 'pending'
                            db.commit()
                        else:
                            # Create new alert for different location
                            alert_id = str(uuid.uuid4())
                            alert = OutbreakAlert(
                                alert_id=alert_id,
                                disease_id=det.disease_id or disease_name,  # Use disease_name as fallback
                                disease_name=disease_name,
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
                            print(f"🚨 NEW OUTBREAK ALERT CREATED: {alert_id} for {disease_name}")
                    else:
                        # No existing alert - create new one
                        alert_id = str(uuid.uuid4())
                        alert = OutbreakAlert(
                            alert_id=alert_id,
                            disease_id=det.disease_id or disease_name,  # Use disease_name as fallback
                            disease_name=disease_name,
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
                        print(f"🚨 NEW OUTBREAK ALERT CREATED: {alert_id} for {disease_name}")
                else:
                    print(
                        f"ℹ️ Below admin-review sensitivity threshold "
                        f"({OUTBREAK_ADMIN_ALERT_MIN_PCT}%): {sensitivity_pct:.1f}% with {len(nearby)} reports"
                    )
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
        rows = db.query(Detection).filter(Detection.farmer_id == farmer_id).order_by(Detection.timestamp.desc()).limit(20).all()
        data = [{
            'id': r.detection_id,
            'name': getattr(r, 'disease_name', None) or r.disease_id or 'Unknown Disease',
            # Alias for clients that expect camelCase (e.g. farming schedule)
            'diseaseName': getattr(r, 'disease_name', None) or r.disease_id or 'Unknown Disease',
            'severity': 'high' if (r.confidence_score or 0) > 80 else ('medium' if (r.confidence_score or 0) > 50 else 'low'),
            'treatment': '',
            'imageUrl': r.image_ref,
            'detectedAt': r.timestamp.isoformat() if r.timestamp else None,
            'confidence': r.confidence_score or 0,
            'cropType': getattr(r, 'crop_type', 'wheat'),  # Default to wheat if not stored
            'latitude': getattr(r, 'latitude', None),
            'longitude': getattr(r, 'longitude', None),
        } for r in rows]
        return jsonify({'detections': data})
    except Exception as e:
        print('❌ Error fetching recent detections:', str(e))
        return jsonify({'error': 'Failed to fetch detections', 'details': str(e)}), 500
    finally:
        db.close()


@farmer_bp.route('/detections/<detection_id>', methods=['DELETE'])
def delete_detection(detection_id):
    """Remove a detection owned by the given farmer (DB row + local image file if present)."""
    farmer_id = request.args.get('farmerId')
    if not farmer_id:
        return jsonify({'error': 'Missing farmerId'}), 400
    db = SessionLocal()
    try:
        det = (
            db.query(Detection)
            .filter(Detection.detection_id == detection_id, Detection.farmer_id == farmer_id)
            .first()
        )
        if not det:
            return jsonify({'error': 'Not found'}), 404
        image_ref = det.image_ref or ''
        db.delete(det)
        db.commit()
        try:
            if image_ref and 'detections/' in image_ref:
                filename = image_ref.split('detections/')[-1].split('?')[0].strip()
                if filename and filename.endswith(('.jpg', '.jpeg', '.png', '.webp')):
                    path = os.path.join(current_app.config['UPLOAD_FOLDER'], 'detections', filename)
                    if os.path.isfile(path):
                        os.remove(path)
        except Exception as ex:
            print('⚠️ Could not remove detection image file:', ex)
        return jsonify({'ok': True}), 200
    except Exception as e:
        db.rollback()
        print('❌ Error deleting detection:', str(e))
        return jsonify({'error': 'Failed to delete detection', 'details': str(e)}), 500
    finally:
        db.close()


@farmer_bp.route('/detections/<detection_id>', methods=['GET'])
def get_detection_detail(detection_id):
    """Return one detection with guidance details for cure guidance screens."""
    farmer_id = request.args.get('farmerId')
    if not farmer_id:
        return jsonify({'error': 'Missing farmerId'}), 400
    db = SessionLocal()
    try:
        det = (
            db.query(Detection)
            .filter(Detection.detection_id == detection_id, Detection.farmer_id == farmer_id)
            .first()
        )
        if not det:
            return jsonify({'error': 'Scan not found'}), 404

        disease_name = getattr(det, 'disease_name', None) or 'Unknown Disease'
        crop_type = (getattr(det, 'crop_type', None) or '').strip().lower()
        confidence = float(getattr(det, 'confidence_score', 0) or 0)
        severity = 'high' if confidence > 80 else ('medium' if confidence > 50 else 'low')

        treatment = None
        symptoms_list = None
        prevention_list = None
        safety_tips = [
            'Wear gloves, mask, and eye protection before spraying.',
            'Do not spray in strong wind or direct midday heat.',
            'Keep children and animals away from treated area.',
        ]

        if crop_type and disease_name and 'healthy' not in disease_name.lower():
            norm_disease = disease_name.strip().lower().replace('_', ' ').replace('-', ' ')
            guidance = db.query(DiseaseGuidance).filter(
                func.lower(DiseaseGuidance.crop) == crop_type,
                func.replace(func.replace(func.lower(DiseaseGuidance.name), '_', ' '), '-', ' ') == norm_disease
            ).first()
            if guidance:
                treatment_parts = []
                if guidance.chemical_control:
                    treatment_parts.append(guidance.chemical_control)
                if guidance.brands:
                    treatment_parts.append(f"Recommended: {guidance.brands}")
                treatment = ' — '.join(treatment_parts) if treatment_parts else None
                if guidance.symptoms:
                    symptoms_list = [s.strip() for s in guidance.symptoms.replace(' and ', ';').replace(',', ';').split(';') if s.strip()]
                if guidance.cultural_controls:
                    prevention_list = [s.strip() for s in guidance.cultural_controls.replace(' and ', ';').replace(',', ';').split(';') if s.strip()]

        return jsonify({
            'id': det.detection_id,
            'cropType': crop_type or 'wheat',
            'diseaseName': disease_name,
            'imageUrl': det.image_ref,
            'detectedAt': det.timestamp.isoformat() if det.timestamp else None,
            'confidence': confidence,
            'severity': severity,
            'treatment': treatment or 'Follow integrated disease management and monitor crop daily.',
            'steps': [
                'Inspect affected area and remove heavily infected leaves/parts.',
                'Apply recommended treatment dose uniformly.',
                'Re-check crop after 48-72 hours and repeat only if needed.',
            ],
            'prevention': prevention_list or ['Use resistant seeds', 'Avoid overwatering', 'Keep field hygiene'],
            'safetyTips': safety_tips,
            'symptoms': symptoms_list or [],
        })
    except Exception as e:
        print('❌ Error getting detection detail:', str(e))
        return jsonify({'error': 'Failed to load scan detail', 'details': str(e)}), 500
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
                'healthy': 0,
                'atRisk': 0,
                'diseased': 0,
                'totalScans': 0,
                'healthyCount': 0,
                'atRiskCount': 0,
                'diseasedCount': 0,
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
            'totalScans': total,
            # Same buckets as counts (for clients that prefer raw counts for pie slices)
            'healthyCount': healthy,
            'atRiskCount': at_risk,
            'diseasedCount': diseased,
        })
    except Exception as e:
        print('❌ Error fetching crop health stats:', str(e))
        return jsonify({'error': 'Failed to fetch stats', 'details': str(e)}), 500
    finally:
        db.close()


def _classify_confidence_bucket(conf):
    """Match crop_health_stats: healthy / at_risk / diseased by model confidence."""
    c = conf or 0
    if c == 0 or c < 50:
        return 'healthy'
    if c < 80:
        return 'at_risk'
    return 'diseased'


@farmer_bp.route('/stats/yield-trend', methods=['GET'])
def yield_trend_stats():
    """
    Time series from disease scans (Detection rows) for the farmer dashboard chart.
    range=week → last 7 calendar days; range=month → last 30 calendar days.
    Two series (0–100%): healthProgress = % of scans that day classified healthy;
    needsAttention = % classified at-risk or diseased (attention needed).
    """
    from datetime import datetime, timedelta
    from collections import defaultdict

    farmer_id = request.args.get('farmerId')
    range_key = (request.args.get('range') or 'week').lower()
    if not farmer_id:
        return jsonify({'error': 'Missing farmerId'}), 400
    if range_key not in ('week', 'month'):
        return jsonify({'error': 'Invalid range; use week or month'}), 400

    db = SessionLocal()
    try:
        today = datetime.utcnow().date()
        if range_key == 'week':
            n_days = 7
            start_date = today - timedelta(days=6)
        else:
            n_days = 30
            start_date = today - timedelta(days=29)

        start_dt = datetime.combine(start_date, datetime.min.time())
        end_dt = datetime.combine(today + timedelta(days=1), datetime.min.time())

        dets = (
            db.query(Detection)
            .filter(
                Detection.farmer_id == farmer_id,
                Detection.timestamp >= start_dt,
                Detection.timestamp < end_dt,
            )
            .all()
        )

        buckets = defaultdict(list)
        for det in dets:
            if det.timestamp is None:
                continue
            ds = det.timestamp.date() if isinstance(det.timestamp, datetime) else det.timestamp
            buckets[ds].append(det)

        labels = []
        health_progress = []
        needs_attention = []

        for i in range(n_days):
            d = start_date + timedelta(days=i)
            if range_key == 'week':
                labels.append(d.strftime('%a'))
            else:
                labels.append(d.strftime('%m/%d'))

            day_dets = buckets.get(d, [])
            tot = len(day_dets)
            if tot == 0:
                health_progress.append(0.0)
                needs_attention.append(0.0)
                continue
            h = ar = dis = 0
            for det in day_dets:
                b = _classify_confidence_bucket(det.confidence_score)
                if b == 'healthy':
                    h += 1
                elif b == 'at_risk':
                    ar += 1
                else:
                    dis += 1
            health_progress.append(round((h / tot) * 100, 1))
            needs_attention.append(round(((ar + dis) / tot) * 100, 1))

        return jsonify({
            'range': range_key,
            'labels': labels,
            'healthProgress': health_progress,
            'needsAttention': needs_attention,
        })
    except Exception as e:
        print('❌ Error fetching yield trend stats:', str(e))
        return jsonify({'error': 'Failed to fetch yield trend', 'details': str(e)}), 500
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
        detections = db.query(Detection).filter(
            Detection.farmer_id == farmer_id,
            Detection.confidence_score > 60,
        ).all()

        counts = {
            'wheat': 0,
            'rice': 0,
            'cotton': 0,
            'corn': 0,
        }
        aliases = {
            'wheat': 'wheat',
            'rice': 'rice',
            'cotton': 'cotton',
            'corn': 'corn',
            'maize': 'corn',
        }

        for det in detections:
            # Skip healthy scans; incidence should reflect disease cases only.
            disease_name = ((det.disease_name or '') if hasattr(det, 'disease_name') else '').strip().lower()
            if (
                disease_name == '' or
                'healthy' in disease_name or
                disease_name == 'no disease'
            ):
                continue

            raw = ((det.crop_type or '') if hasattr(det, 'crop_type') else '').strip().lower()
            if not raw:
                continue
            normalized = aliases.get(raw)
            if normalized:
                counts[normalized] += 1

        return jsonify(counts)
    finally:
        db.close()


def _timelapse_crop_model():
    try:
        from ..models import Crop
        return Crop
    except ImportError:
        try:
            from models import Crop
            return Crop
        except ImportError:
            return None


@farmer_bp.route('/stats/profile', methods=['GET'])
def farmer_profile_stats():
    """
    Summary for profile/home overview cards.
    Uses user-edited farm overview fields when available, with data-derived fallback.
    """
    farmer_id = request.args.get('farmerId')
    if not farmer_id:
        return jsonify({'error': 'Missing farmerId'}), 400

    db = SessionLocal()
    try:
        try:
            from ..schemas.user import User
        except ImportError:
            from schemas.user import User

        user_row = db.query(User).filter(User.user_id == farmer_id).first()
        detections = db.query(Detection).filter(Detection.farmer_id == farmer_id).all()
        total = len(detections)

        health_score_percent = None
        if total > 0:
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
            health_score_percent = round((healthy / total) * 100, 0)

        crop_set = set()
        for det in detections:
            ct = (det.crop_type or '').strip().lower()
            if ct:
                crop_set.add(ct)

        CropModel = _timelapse_crop_model()
        if CropModel is not None:
            try:
                for row in db.query(CropModel).filter(CropModel.farmer_id == farmer_id).all():
                    ct = (row.crop_type or '').strip().lower()
                    if ct:
                        crop_set.add(ct)
            except Exception as ex:
                print('⚠️ profile stats timelapse crops:', ex)

        crop_types_count = len(crop_set) if crop_set else None

        acres_farmed = getattr(user_row, 'farm_acres', None) if user_row else None
        if acres_farmed is not None:
            try:
                acres_farmed = float(acres_farmed)
            except Exception:
                acres_farmed = None

        crop_types_final = (
            getattr(user_row, 'farm_crop_types', None)
            if user_row and getattr(user_row, 'farm_crop_types', None) is not None
            else crop_types_count
        )
        health_score_final = (
            getattr(user_row, 'farm_health_score', None)
            if user_row and getattr(user_row, 'farm_health_score', None) is not None
            else health_score_percent
        )
        monthly_revenue = getattr(user_row, 'farm_monthly_revenue', None) if user_row else None

        return jsonify({
            'acresFarmed': acres_farmed,
            'cropTypesCount': crop_types_final,
            'healthScorePercent': health_score_final,
            'monthlyRevenue': monthly_revenue,
            'totalScans': total,
        })
    except Exception as e:
        print('❌ Error fetching profile stats:', str(e))
        return jsonify({'error': 'Failed to fetch profile stats', 'details': str(e)}), 500
    finally:
        db.close()


@farmer_bp.route('/export-data', methods=['GET'])
def export_farmer_data_pdf():
    """Authenticated PDF export: crop scans + timelapse improvement entries."""
    try:
        from ..routes.auth import get_auth_user
    except ImportError:
        from routes.auth import get_auth_user
    try:
        from ..models import Crop, TimelapseEntry
    except ImportError:
        from models import Crop, TimelapseEntry

    auth_user, err = get_auth_user()
    if err:
        return err
    uid = auth_user.user_id

    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

    db = SessionLocal()
    try:
        detections = (
            db.query(Detection)
            .filter(Detection.farmer_id == uid)
            .order_by(Detection.timestamp.desc())
            .all()
        )
        crops = db.query(Crop).filter(Crop.farmer_id == uid).order_by(Crop.id).all()
        timelapse_rows = []
        for c in crops:
            entries = (
                db.query(TimelapseEntry)
                .filter(TimelapseEntry.crop_id == c.id)
                .order_by(TimelapseEntry.date.asc())
                .all()
            )
            for e in entries:
                timelapse_rows.append({
                    'crop': c.name,
                    'date': e.date,
                    'disease': e.detected_disease or '—',
                    'severity': e.severity or '—',
                    'score': e.severity_score,
                    'confidence': e.ai_confidence,
                    'temp': e.weather_temp,
                    'humidity': e.weather_humidity,
                })
    finally:
        db.close()

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=48, leftMargin=48, topMargin=48, bottomMargin=48)
    styles = getSampleStyleSheet()
    story = []
    story.append(Paragraph('AgriSmart — My data export', styles['Title']))
    story.append(Paragraph(
        f"Account: {auth_user.name} ({auth_user.email})<br/>Generated: {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
        styles['Normal'],
    ))
    story.append(Spacer(1, 0.2 * inch))

    story.append(Paragraph('<b>Crop scans (detections)</b>', styles['Heading2']))
    story.append(Spacer(1, 0.1 * inch))
    scan_data = [['Date', 'Crop', 'Disease / result', 'Confidence %', 'Lat', 'Lng']]
    for d in detections:
        ts = d.timestamp.strftime('%Y-%m-%d %H:%M') if d.timestamp else '—'
        scan_data.append([
            ts,
            (d.crop_type or '—')[:24],
            (d.disease_name or '—')[:40],
            str(round(d.confidence_score or 0, 1)),
            f"{d.latitude:.4f}" if d.latitude is not None else '—',
            f"{d.longitude:.4f}" if d.longitude is not None else '—',
        ])
    if len(scan_data) == 1:
        scan_data.append(['—', '—', 'No scans yet', '—', '—', '—'])
    t1 = Table(scan_data, repeatRows=1)
    t1.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#16A34A')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.25, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F0FDF4')]),
    ]))
    story.append(t1)
    story.append(Spacer(1, 0.2 * inch))

    story.append(Paragraph('<b>Time-lapse progress (improvements)</b>', styles['Heading2']))
    story.append(Paragraph(
        'Weekly entries show disease tracking and improvement over time for each crop.',
        styles['Normal'],
    ))
    story.append(Spacer(1, 0.1 * inch))
    tl_data = [['Date', 'Crop', 'Detected', 'Severity', 'AI conf.', 'Temp °C', 'Humidity %']]
    for row in timelapse_rows:
        dt = row['date'].strftime('%Y-%m-%d %H:%M') if row['date'] else '—'
        conf = f"{round(row['confidence'] * 100, 1)}" if row['confidence'] is not None else '—'
        tl_data.append([
            dt,
            (row['crop'] or '')[:20],
            (row['disease'] or '')[:28],
            str(row['severity']),
            conf,
            f"{row['temp']:.1f}" if row['temp'] is not None else '—',
            f"{row['humidity']:.0f}" if row['humidity'] is not None else '—',
        ])
    if len(tl_data) == 1:
        tl_data.append(['—', '—', 'No timelapse entries yet', '—', '—', '—', '—'])
    t2 = Table(tl_data, repeatRows=1)
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#15803D')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.25, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#ECFDF5')]),
    ]))
    story.append(t2)

    doc.build(story)
    buffer.seek(0)
    return send_file(
        buffer,
        mimetype='application/pdf',
        as_attachment=True,
        download_name='agrismart-my-data-export.pdf',
    )


