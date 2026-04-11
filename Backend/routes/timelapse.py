"""
TimeLapse Routes for Smart TimeLapse Feature

Handles photo uploads, AI disease detection, weather integration, and predictions
"""
import os
import uuid
import datetime
import io
import numpy as np
from flask import Blueprint, request, jsonify, current_app
from PIL import Image
import cv2
import requests
from sqlalchemy import func, desc
from sqlalchemy.orm import joinedload

try:
    from ..db import SessionLocal
    from ..models import TimelapseEntry, Crop
    from ..schemas.user import User
    from ..core.yolo import get_model_for_crop
    from ..config import get_weather_api_key
except ImportError:
    from db import SessionLocal
    from models import TimelapseEntry, Crop
    from schemas.user import User
    from core.yolo import get_model_for_crop
    from config import get_weather_api_key

timelapse_bp = Blueprint('timelapse', __name__, url_prefix='/api/timelapse')

# Treatment suggestions mapping
TREATMENT_SUGGESTIONS = {
    'rust': 'Apply fungicide spray (e.g., Propiconazole)',
    'leaf spot': 'Remove affected leaves and apply copper-based fungicide',
    'blight': 'Apply systemic fungicide and improve air circulation',
    'powdery mildew': 'Apply sulfur-based fungicide and reduce humidity',
    'healthy': 'Maintain proper irrigation and fertilizer balance'
}

def get_user_from_token():
    """
    Extract user_id from JWT token in Authorization header.
    Returns user_id or None if invalid/missing or session revoked (logout-all).
    """
    try:
        from ..routes.auth import get_auth_user
    except ImportError:
        from routes.auth import get_auth_user
    user, err = get_auth_user()
    if err or not user:
        return None
    return user.user_id

def fetch_weather_data(latitude: float, longitude: float) -> dict:
    """
    Fetch current weather data from OpenWeatherMap API.
    Returns dict with temp, humidity, or None values on error.
    """
    api_key = get_weather_api_key()
    if not api_key or api_key == 'your_open_weather_api_key' or api_key.strip() == '':
        print("⚠️ Weather API key not configured - using default values")
        # Return default weather values for Pakistan (typical agricultural region)
        return {'temp': 25.0, 'humidity': 60.0}  # Default fallback values
    
    try:
        url = f"https://api.openweathermap.org/data/2.5/weather"
        params = {
            'lat': latitude,
            'lon': longitude,
            'appid': api_key,
            'units': 'metric'
        }
        print(f"🌤️ Calling OpenWeatherMap API: lat={latitude}, lon={longitude}")
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            temp = data.get('main', {}).get('temp')
            humidity = data.get('main', {}).get('humidity')
            print(f"✅ Weather fetched: temp={temp}°C, humidity={humidity}%")
            return {
                'temp': temp,
                'humidity': humidity
            }
        else:
            print(f"⚠️ Weather API returned status {response.status_code}: {response.text[:200]}")
            # Return default values on API error
            return {'temp': 25.0, 'humidity': 60.0}
    except requests.exceptions.Timeout:
        print("⚠️ Weather API timeout - using default values")
        return {'temp': 25.0, 'humidity': 60.0}
    except Exception as e:
        print(f"⚠️ Weather API error: {e}")
        import traceback
        traceback.print_exc()
        # Return default values on error
        return {'temp': 25.0, 'humidity': 60.0}

def detect_disease_with_yolo(image_bytes: bytes, crop_type: str) -> dict:
    """
    Run YOLO model inference on image to detect disease.
    Returns dict with disease name, confidence, and severity mapping.
    """
    try:
        # Load YOLO model for crop type
        model = get_model_for_crop(crop_type)
        
        # Convert bytes to PIL Image
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        
        # Run prediction
        results = model.predict(image)
        detections = results[0]
        
        # Extract top prediction
        if len(detections.boxes) > 0:
            top_box = detections.boxes[0]
            cls_id = int(top_box.cls)
            confidence = float(top_box.conf)
            disease_name = detections.names[cls_id]
            
            # Map confidence to severity score (0-3)
            if confidence > 0.8:
                severity_score = 3  # Severe
                severity = 'Severe'
            elif confidence > 0.5:
                severity_score = 2  # Moderate
                severity = 'Moderate'
            elif confidence > 0.2:
                severity_score = 1  # Mild
                severity = 'Mild'
            else:
                severity_score = 0  # None
                severity = 'None'
            
            return {
                'disease': disease_name,
                'confidence': confidence,
                'severity': severity,
                'severity_score': severity_score
            }
        else:
            # No disease detected - healthy crop
            return {
                'disease': 'Healthy Crop',
                'confidence': 1.0,
                'severity': 'None',
                'severity_score': 0
            }
    except Exception as e:
        print(f"❌ Disease detection error: {e}")
        return {
            'disease': None,
            'confidence': 0.0,
            'severity': 'None',
            'severity_score': 0
        }

def highlight_disease_spots(image_bytes: bytes, detection_results: dict) -> bytes:
    """
    Use OpenCV to highlight detected disease spots on image.
    Returns highlighted image as bytes.
    """
    try:
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return image_bytes  # Return original if decode fails
        
        # If we have bounding boxes from YOLO, draw circles
        # For now, if severity is high, add a general overlay
        if detection_results.get('severity_score', 0) >= 2:
            # Add red overlay on detected regions (simplified - in production, use actual bbox)
            h, w = img.shape[:2]
            overlay = img.copy()
            cv2.rectangle(overlay, (w//4, h//4), (3*w//4, 3*h//4), (0, 0, 255), 3)
            cv2.addWeighted(overlay, 0.3, img, 0.7, 0, img)
        
        # Encode back to bytes
        _, encoded_img = cv2.imencode('.jpg', img)
        return encoded_img.tobytes()
    except Exception as e:
        print(f"⚠️ OpenCV highlighting error: {e}")
        return image_bytes  # Return original on error

@timelapse_bp.route('/upload', methods=['POST'])
def upload_timelapse():
    """
    Upload timelapse photo(s) with AI disease detection and weather integration.
    Accepts: multipart/form-data with 'file' (or 'files[]' for multiple), 'crop_id', 'notes'
    Returns: JSON with detection results and created entries
    """
    try:
        print("\n📥 Incoming POST /api/timelapse/upload")
        
        # Get user from token
        user_id = get_user_from_token()
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Get form data
        crop_id = request.form.get('crop_id')
        notes = request.form.get('notes', '').strip()
        
        if not crop_id:
            return jsonify({'error': 'Missing crop_id'}), 400
        
        db = SessionLocal()
        try:
            # Verify crop belongs to user
            crop = db.query(Crop).filter(
                Crop.id == int(crop_id),
                Crop.farmer_id == user_id
            ).first()
            
            if not crop:
                return jsonify({'error': 'Crop not found or access denied'}), 404
            
            # Get user location for weather (prefer crop location, fallback to user location)
            user = db.query(User).filter(User.user_id == user_id).first()
            latitude = crop.latitude if crop.latitude else (user.latitude if user else None)
            longitude = crop.longitude if crop.longitude else (user.longitude if user else None)
            
            # If still no location, try to use default location (Islamabad, Pakistan as fallback)
            if not latitude or not longitude:
                print("⚠️ No location found for user or crop, using default location (Islamabad)")
                latitude = 33.6844  # Islamabad, Pakistan
                longitude = 73.0479
            
            # Handle single or multiple files
            files = []
            if 'file' in request.files:
                files.append(request.files['file'])
            elif 'files[]' in request.files:
                files = request.files.getlist('files[]')
            else:
                return jsonify({'error': 'No file provided'}), 400
            
            # Optional per-image capture dates (ISO format) for timelapse ordering
            dates_raw = request.form.getlist('dates[]')
            
            # Limit to 3 files max
            files = files[:3]
            
            created_entries = []
            detection_summary = None
            
            for file_index, file in enumerate(files):
                if not file or file.filename == '':
                    continue
                
                # Validate file size (5MB max)
                file.seek(0, os.SEEK_END)
                file_size = file.tell()
                file.seek(0)
                if file_size > 5 * 1024 * 1024:
                    return jsonify({'error': f'File {file.filename} exceeds 5MB limit'}), 400
                
                # Read image bytes
                image_bytes = file.read()
                
                # Validate image format
                try:
                    img = Image.open(io.BytesIO(image_bytes))
                    img.verify()
                except Exception:
                    return jsonify({'error': 'Invalid image format (JPEG/PNG required)'}), 400
                
                # Resize image for processing (224x224 for model)
                img = Image.open(io.BytesIO(image_bytes))
                img_resized = img.resize((224, 224), Image.Resampling.LANCZOS)
                img_bytes_io = io.BytesIO()
                img_resized.save(img_bytes_io, format='JPEG', quality=95)
                img_bytes_resized = img_bytes_io.getvalue()
                
                # Run AI disease detection
                detection = detect_disease_with_yolo(img_bytes_resized, crop.crop_type)
                
                # Fetch weather data (ALWAYS fetch - uses defaults if API fails)
                print(f"🌤️ Fetching weather for lat={latitude}, lon={longitude}")
                weather = fetch_weather_data(latitude, longitude)
                print(f"✅ Weather data saved: temp={weather.get('temp')}, humidity={weather.get('humidity')}")
                
                # Generate highlighted image with OpenCV
                highlighted_bytes = highlight_disease_spots(image_bytes, detection)
                
                # Save original photo
                photo_filename = f"timelapse_{uuid.uuid4().hex[:12]}.jpg"
                photo_path = os.path.join(current_app.config['UPLOAD_FOLDER'], 'timelapse', photo_filename)
                os.makedirs(os.path.dirname(photo_path), exist_ok=True)
                with open(photo_path, 'wb') as f:
                    f.write(image_bytes)
                photo_url = f"/static/uploads/timelapse/{photo_filename}"
                
                # Save highlighted photo
                highlighted_filename = f"timelapse_highlighted_{uuid.uuid4().hex[:12]}.jpg"
                highlighted_path = os.path.join(current_app.config['UPLOAD_FOLDER'], 'timelapse', highlighted_filename)
                with open(highlighted_path, 'wb') as f:
                    f.write(highlighted_bytes)
                highlighted_photo_url = f"/static/uploads/timelapse/{highlighted_filename}"
                
                # Auto-add treatment suggestion if severity is high
                treatment_note = ""
                if detection['severity_score'] >= 2:
                    disease_lower = detection['disease'].lower()
                    for key, suggestion in TREATMENT_SUGGESTIONS.items():
                        if key in disease_lower:
                            treatment_note = f"\n💊 Suggested: {suggestion}"
                            break
                
                # Use per-image capture date if provided (user input from upload screen)
                entry_date = datetime.datetime.now()
                if file_index < len(dates_raw) and dates_raw[file_index]:
                    raw = (dates_raw[file_index] or '').strip()
                    try:
                        if len(raw) >= 10:
                            # Prefer date-only YYYY-MM-DD to avoid timezone shifts
                            date_part = raw[:10]
                            entry_date = datetime.datetime.strptime(date_part, '%Y-%m-%d')
                        else:
                            entry_date = datetime.datetime.fromisoformat(
                                raw.replace('Z', '+00:00')
                            )
                            if entry_date.tzinfo:
                                entry_date = entry_date.replace(tzinfo=None)
                    except (ValueError, TypeError):
                        pass
                
                # Create timelapse entry
                entry = TimelapseEntry(
                    crop_id=crop.id,
                    date=entry_date,
                    photo_url=photo_url,
                    highlighted_photo_url=highlighted_photo_url,
                    detected_disease=detection['disease'],
                    severity=detection['severity'],
                    severity_score=detection['severity_score'],
                    weather_temp=weather['temp'],
                    weather_humidity=weather['humidity'],
                    notes=(notes + treatment_note).strip() if notes or treatment_note else None,
                    ai_confidence=detection['confidence']
                )
                
                db.add(entry)
                db.flush()  # Get entry.id
                
                created_entries.append({
                    'id': entry.id,
                    'photo_url': photo_url,
                    'highlighted_photo_url': highlighted_photo_url,
                    'date': entry.date.isoformat(),
                    'detected_disease': entry.detected_disease,
                    'severity': entry.severity,
                    'severity_score': entry.severity_score,
                    'confidence': entry.ai_confidence,
                    'weather': {
                        'temp': entry.weather_temp,
                        'humidity': entry.weather_humidity
                    }
                })
                
                # Use first detection as summary
                if not detection_summary:
                    detection_summary = {
                        'disease': detection['disease'],
                        'severity': detection['severity'],
                        'confidence': round(detection['confidence'] * 100, 2),
                        'weather': weather
                    }
            
            db.commit()
            
            return jsonify({
                'success': True,
                'entries': created_entries,
                'detection': detection_summary,
                'message': f'Successfully uploaded {len(created_entries)} photo(s)'
            }), 201
            
        finally:
            db.close()
            
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        print(f"❌ Upload error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Internal server error'}), 500

@timelapse_bp.route('/crops/<int:crop_id>', methods=['DELETE'])
def delete_crop(crop_id: int):
    """
    Delete a crop for the authenticated user.
    Only the owner can delete their own crop.
    Cascades to delete all associated timelapse entries.
    """
    try:
        user_id = get_user_from_token()
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        db = SessionLocal()
        try:
            # Verify crop belongs to user
            crop = db.query(Crop).filter(
                Crop.id == crop_id,
                Crop.farmer_id == user_id
            ).first()
            
            if not crop:
                db.rollback()
                return jsonify({'error': 'Crop not found or access denied'}), 404
            
            crop_name = crop.name
            
            # First, delete all associated timelapse entries manually (to ensure cascade works)
            # This handles cases where cascade might not be properly configured in the database
            timelapse_entries = db.query(TimelapseEntry).filter(
                TimelapseEntry.crop_id == crop_id
            ).all()
            
            for entry in timelapse_entries:
                # Optionally delete associated image files
                try:
                    if entry.photo_url and entry.photo_url.startswith('/static/uploads'):
                        photo_path = os.path.join(current_app.config.get('UPLOAD_FOLDER', 'static/uploads'), 
                                                 entry.photo_url.replace('/static/uploads/', ''))
                        if os.path.exists(photo_path):
                            os.remove(photo_path)
                    if entry.highlighted_photo_url and entry.highlighted_photo_url.startswith('/static/uploads'):
                        highlighted_path = os.path.join(current_app.config.get('UPLOAD_FOLDER', 'static/uploads'),
                                                        entry.highlighted_photo_url.replace('/static/uploads/', ''))
                        if os.path.exists(highlighted_path):
                            os.remove(highlighted_path)
                except Exception as file_error:
                    print(f"⚠️ Could not delete image file: {file_error}")
                    # Continue with deletion even if file deletion fails
            
            # Delete the crop (cascade should handle timelapse entries, but we deleted them above for safety)
            db.delete(crop)
            db.commit()
            
            print(f"✅ Crop {crop_id} ({crop_name}) deleted successfully")
            
            return jsonify({
                'success': True,
                'message': f'Crop "{crop_name}" deleted successfully'
            }), 200
            
        except Exception as db_error:
            db.rollback()
            print(f"❌ Database error during crop deletion: {db_error}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': f'Failed to delete crop: {str(db_error)}'}), 500
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Delete crop error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@timelapse_bp.route('/<int:crop_id>', methods=['GET'])
def get_timelapse(crop_id: int):
    """
    Get all timelapse entries for a specific crop, ordered by date (newest first).
    Includes statistics: average severity, trend, etc.
    """
    try:
        user_id = get_user_from_token()
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        db = SessionLocal()
        try:
            # Verify crop belongs to user
            crop = db.query(Crop).filter(
                Crop.id == crop_id,
                Crop.farmer_id == user_id
            ).first()
            
            if not crop:
                return jsonify({'error': 'Crop not found or access denied'}), 404
            
            # Get all entries ordered by date (newest first)
            entries = db.query(TimelapseEntry).filter(
                TimelapseEntry.crop_id == crop_id
            ).order_by(desc(TimelapseEntry.date)).all()
            
            # Update entries missing weather data with defaults
            updated_count = 0
            for entry in entries:
                if entry.weather_temp is None or entry.weather_humidity is None:
                    # Get location for weather fetch
                    latitude = crop.latitude if crop.latitude else None
                    longitude = crop.longitude if crop.longitude else None
                    if not latitude or not longitude:
                        user = db.query(User).filter(User.user_id == user_id).first()
                        latitude = user.latitude if user else None
                        longitude = user.longitude if user else None
                    if not latitude or not longitude:
                        latitude = 33.6844  # Islamabad default
                        longitude = 73.0479
                    
                    weather = fetch_weather_data(latitude, longitude)
                    entry.weather_temp = weather.get('temp')
                    entry.weather_humidity = weather.get('humidity')
                    updated_count += 1
            
            if updated_count > 0:
                db.commit()
                print(f"✅ Updated {updated_count} entries with weather data")
            
            # Calculate statistics from scanned images
            if entries:
                avg_severity = db.query(func.avg(TimelapseEntry.severity_score)).filter(
                    TimelapseEntry.crop_id == crop_id
                ).scalar() or 0
                
                # Trend: compare first (earliest date) vs latest (newest date) by user-input date
                trend = 'stable'
                if len(entries) >= 2:
                    # entries are newest first: entries[0]=latest, entries[-1]=first by date
                    latest_score = entries[0].severity_score or 0
                    first_score = entries[-1].severity_score or 0
                    if latest_score > first_score:
                        trend = 'worsening'
                    elif latest_score < first_score:
                        trend = 'improving'
                
                # Averages from scanned images
                temps = [e.weather_temp for e in entries if e.weather_temp is not None]
                humids = [e.weather_humidity for e in entries if e.weather_humidity is not None]
                confs = [e.ai_confidence for e in entries if e.ai_confidence is not None]
                avg_temp = round(sum(temps) / len(temps), 1) if temps else None
                avg_humidity = round(sum(humids) / len(humids), 1) if humids else None
                avg_ai_confidence = round(sum(confs) / len(confs), 4) if confs else None  # 0-1
                # Top disease: most frequent
                disease_counts = {}
                for e in entries:
                    d = (e.detected_disease or 'Healthy').strip() or 'Healthy'
                    disease_counts[d] = disease_counts.get(d, 0) + 1
                top_disease = max(disease_counts, key=disease_counts.get) if disease_counts else 'None'
            else:
                avg_severity = 0
                trend = 'stable'
                avg_temp = None
                avg_humidity = None
                avg_ai_confidence = None
                top_disease = 'None'
            
            entries_data = [{
                'id': e.id,
                'date': e.date.isoformat(),
                'photo_url': e.photo_url,
                'highlighted_photo_url': e.highlighted_photo_url,
                'detected_disease': e.detected_disease,
                'severity': e.severity,
                'severity_score': e.severity_score,
                'weather_temp': e.weather_temp,
                'weather_humidity': e.weather_humidity,
                'notes': e.notes,
                'ai_confidence': e.ai_confidence
            } for e in entries]
            
            return jsonify({
                'crop_id': crop_id,
                'crop_name': crop.name,
                'crop_type': crop.crop_type,
                'entries': entries_data,
                'stats': {
                    'total_entries': len(entries),
                    'avg_severity_score': round(float(avg_severity), 2),
                    'trend': trend,
                    'avg_temp': avg_temp,
                    'avg_humidity': avg_humidity,
                    'avg_ai_confidence': avg_ai_confidence,
                    'top_disease': top_disease,
                }
            }), 200
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Get timelapse error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@timelapse_bp.route('/predict/<int:crop_id>', methods=['GET'])
def predict_timelapse(crop_id: int):
    """
    Predict future disease severity based on historical data and weather forecast.
    Uses LinearRegression from scikit-learn.
    """
    try:
        user_id = get_user_from_token()
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        db = SessionLocal()
        try:
            # Verify crop belongs to user
            crop = db.query(Crop).filter(
                Crop.id == crop_id,
                Crop.farmer_id == user_id
            ).first()
            
            if not crop:
                return jsonify({'error': 'Crop not found or access denied'}), 404
            
            # Get historical entries
            entries = db.query(TimelapseEntry).filter(
                TimelapseEntry.crop_id == crop_id
            ).order_by(TimelapseEntry.date).all()
            
            if len(entries) < 2:
                return jsonify({
                    'predicted_severity': 'None',
                    'score': 0,
                    'message': 'Insufficient data for prediction (need at least 2 entries)'
                }), 200
            
            # Prepare data for prediction
            try:
                from sklearn.linear_model import LinearRegression
                import pandas as pd
                
                # Build dataframe
                data = []
                for e in entries:
                    if e.weather_humidity is not None and e.severity_score is not None:
                        data.append({
                            'humidity': e.weather_humidity,
                            'severity_score': e.severity_score
                        })
                
                if len(data) < 2:
                    return jsonify({
                        'predicted_severity': 'None',
                        'score': 0,
                        'message': 'Insufficient weather data for prediction'
                    }), 200
                
                df = pd.DataFrame(data)
                X = df[['humidity']].values
                y = df['severity_score'].values
                
                # Train model
                model = LinearRegression()
                model.fit(X, y)
                
                # Get user location for forecast
                user = db.query(User).filter(User.user_id == user_id).first()
                if user and user.latitude and user.longitude:
                    # Fetch 5-day forecast (simplified - use current humidity + 10% for next week)
                    weather = fetch_weather_data(user.latitude, user.longitude)
                    future_humidity = (weather['humidity'] or 50) + 10  # Estimate
                else:
                    # Use average humidity from entries
                    future_humidity = df['humidity'].mean() + 10
                
                # Predict
                pred_score = model.predict([[future_humidity]])[0]
                pred_score = max(0, min(3, pred_score))  # Clamp to 0-3
                
                # Map to severity string
                severity_map = {0: 'None', 1: 'Mild', 2: 'Moderate', 3: 'Severe'}
                predicted_severity = severity_map.get(int(round(pred_score)), 'None')
                
                return jsonify({
                    'predicted_severity': predicted_severity,
                    'score': round(float(pred_score), 2),
                    'future_humidity': round(float(future_humidity), 2),
                    'message': f'Predicted severity: {predicted_severity} (score: {pred_score:.2f})'
                }), 200
                
            except ImportError:
                return jsonify({
                    'predicted_severity': 'None',
                    'score': 0,
                    'message': 'Prediction requires scikit-learn and pandas (install: pip install scikit-learn pandas)'
                }), 200
            except Exception as e:
                print(f"⚠️ Prediction error: {e}")
                return jsonify({
                    'predicted_severity': 'None',
                    'score': 0,
                    'message': f'Prediction failed: {str(e)}'
                }), 200
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Predict error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@timelapse_bp.route('/crops', methods=['GET'])
def get_user_crops():
    """
    Get all crops for the authenticated user.
    Used by frontend to populate crop selection dropdown.
    """
    try:
        user_id = get_user_from_token()
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        db = SessionLocal()
        try:
            crops = db.query(Crop).filter(Crop.farmer_id == user_id).order_by(desc(Crop.created_at)).all()
            
            crops_data = [{
                'id': c.id,
                'name': c.name,
                'crop_type': c.crop_type,
                'start_date': c.start_date.isoformat() if c.start_date else None,
                'location': c.location,
                'latitude': c.latitude,
                'longitude': c.longitude
            } for c in crops]
            
            return jsonify({'crops': crops_data}), 200
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Get crops error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@timelapse_bp.route('/crops', methods=['POST'])
def create_crop():
    """
    Create a new crop for the authenticated user.
    Accepts: JSON with name, crop_type, location (optional), latitude/longitude (optional)
    """
    try:
        user_id = get_user_from_token()
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        data = request.get_json() or {}
        name = data.get('name', '').strip()
        crop_type = data.get('crop_type', '').strip().lower()
        location = data.get('location', '').strip() or None
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        
        if not name or not crop_type:
            return jsonify({'error': 'name and crop_type are required'}), 400
        
        if crop_type not in ['wheat', 'rice', 'cotton']:
            return jsonify({'error': 'crop_type must be wheat, rice, or cotton'}), 400
        
        db = SessionLocal()
        try:
            crop = Crop(
                farmer_id=user_id,
                name=name,
                crop_type=crop_type,
                location=location,
                latitude=float(latitude) if latitude else None,
                longitude=float(longitude) if longitude else None
            )
            
            db.add(crop)
            db.commit()
            
            return jsonify({
                'id': crop.id,
                'name': crop.name,
                'crop_type': crop.crop_type,
                'start_date': crop.start_date.isoformat() if crop.start_date else None,
                'location': crop.location,
                'latitude': crop.latitude,
                'longitude': crop.longitude
            }), 201
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Create crop error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

