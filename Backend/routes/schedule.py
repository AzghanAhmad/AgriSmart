import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify
try:
    from ..db import SessionLocal
    from ..schemas.schedule import Schedule, ScheduleProgress
    from ..core.schedule_generator import generate_schedule
    from ..core.weather import get_weather_forecast
except ImportError:
    from db import SessionLocal
    from schemas.schedule import Schedule, ScheduleProgress
    from core.schedule_generator import generate_schedule
    from core.weather import get_weather_forecast

schedule_bp = Blueprint('schedule', __name__, url_prefix='/api/farmer/schedule')

@schedule_bp.route('/generate', methods=['POST'])
def generate_farming_schedule():
    """Generate personalized farming schedule for a week"""
    try:
        data = request.get_json() or {}
        farmer_id = data.get('farmerId') or request.args.get('farmerId')
        crop_type_raw = data.get('cropType', '')
        location_raw = data.get('location', '')
        lat = data.get('latitude')
        lon = data.get('longitude')
        week_number = data.get('weekNumber', 'week1')
        disease_name = data.get('diseaseName')  # Get disease name if provided
        
        if not farmer_id:
            return jsonify({'error': 'Missing farmerId'}), 400
        
        # Validate and normalize crop_type
        if isinstance(crop_type_raw, dict):
            crop_type = crop_type_raw.get('name', 'wheat') or 'wheat'
        elif isinstance(crop_type_raw, str):
            crop_type = crop_type_raw.strip().lower()
        else:
            crop_type = 'wheat'  # Default fallback
        
        if not crop_type:
            return jsonify({'error': 'Missing cropType'}), 400
        
        # Validate and normalize location
        if isinstance(location_raw, dict):
            location = location_raw.get('name', 'Islamabad') or 'Islamabad'
        elif isinstance(location_raw, str):
            location = location_raw.strip()
        else:
            location = 'Islamabad'  # Default fallback
        
        # Ensure disease_name is a string if provided
        if disease_name and not isinstance(disease_name, str):
            if isinstance(disease_name, dict):
                disease_name = disease_name.get('name') or disease_name.get('disease')
            else:
                disease_name = str(disease_name) if disease_name else None
        
        # If disease_name not provided, try to get from recent detections
        if not disease_name:
            db = SessionLocal()
            try:
                from ..schemas.detection import Detection
            except ImportError:
                from schemas.detection import Detection
            
            try:
                from sqlalchemy import or_, func

                ct = (crop_type or "").strip().lower()
                # Prefer same crop type first
                recent_detection = (
                    db.query(Detection)
                    .filter(Detection.farmer_id == farmer_id)
                    .filter(func.lower(Detection.crop_type) == ct)
                    .order_by(Detection.timestamp.desc())
                    .first()
                )
                if not recent_detection:
                    # Legacy rows with missing crop_type
                    recent_detection = (
                        db.query(Detection)
                        .filter(Detection.farmer_id == farmer_id)
                        .filter(
                            or_(
                                Detection.crop_type.is_(None),
                                Detection.crop_type == "",
                            )
                        )
                        .order_by(Detection.timestamp.desc())
                        .first()
                    )
                if recent_detection and recent_detection.disease_name:
                    disease_name = recent_detection.disease_name
                # Still nothing: any latest detection with a stored name
                if not disease_name:
                    any_named = (
                        db.query(Detection)
                        .filter(Detection.farmer_id == farmer_id)
                        .filter(Detection.disease_name.isnot(None))
                        .filter(Detection.disease_name != "")
                        .order_by(Detection.timestamp.desc())
                        .first()
                    )
                    if any_named:
                        disease_name = any_named.disease_name
            finally:
                db.close()
        
        # Get previous week progress if week_number > 1
        previous_progress = None
        if week_number != 'week1':
            db = SessionLocal()
            try:
                prev_week = f"week{int(week_number.replace('week', '')) - 1}"
                prev_schedule = db.query(Schedule).filter(
                    Schedule.farmer_id == farmer_id,
                    Schedule.period == prev_week
                ).order_by(Schedule.timestamp.desc()).first()
                
                if prev_schedule:
                    prev_progress = db.query(ScheduleProgress).filter(
                        ScheduleProgress.schedule_id == prev_schedule.schedule_id
                    ).first()
                    if prev_progress:
                        previous_progress = {
                            'completion_rate': float(prev_progress.completion_rate or 0),
                            'notes': prev_progress.notes
                        }
            finally:
                db.close()
        
        # Convert lat/lon to float if provided
        lat_float = float(lat) if lat else None
        lon_float = float(lon) if lon else None
        
        # Generate schedule
        tasks = generate_schedule(
            farmer_id=farmer_id,
            crop_type=crop_type,
            location=location,
            lat=lat_float,
            lon=lon_float,
            previous_week_progress=previous_progress,
            disease_name=disease_name
        )
        
        # Save schedule to database
        schedule_id = str(uuid.uuid4())
        db = SessionLocal()
        try:
            schedule = Schedule(
                schedule_id=schedule_id,
                farmer_id=farmer_id,
                cultivation_id=None,  # Can be linked later
                period=week_number,
                tasks=tasks,
                generated_by='ai'
            )
            db.add(schedule)
            db.commit()
        finally:
            db.close()
        
        return jsonify({
            'scheduleId': schedule_id,
            'weekNumber': week_number,
            'tasks': tasks,
            'totalTasks': len(tasks),
            'generatedAt': datetime.now().isoformat()
        }), 201
        
    except Exception as e:
        print(f"❌ Error generating schedule: {str(e)}")
        return jsonify({'error': 'Failed to generate schedule'}), 500

@schedule_bp.route('/current', methods=['GET'])
def get_current_schedule():
    """Get current week's schedule for farmer"""
    farmer_id = request.args.get('farmerId')
    week_number = request.args.get('weekNumber', 'week1')
    
    if not farmer_id:
        return jsonify({'error': 'Missing farmerId'}), 400
    
    db = SessionLocal()
    try:
        schedule = db.query(Schedule).filter(
            Schedule.farmer_id == farmer_id,
            Schedule.period == week_number
        ).order_by(Schedule.timestamp.desc()).first()
        
        if not schedule:
            return jsonify({'error': 'Schedule not found'}), 404
        
        return jsonify({
            'scheduleId': schedule.schedule_id,
            'weekNumber': schedule.period,
            'tasks': schedule.tasks or [],
            'generatedAt': schedule.timestamp.isoformat() if schedule.timestamp else None
        })
    finally:
        db.close()

@schedule_bp.route('/progress', methods=['POST'])
def update_progress():
    """Update progress for a week's schedule"""
    try:
        data = request.get_json() or {}
        schedule_id = data.get('scheduleId')
        week_number = data.get('weekNumber')
        completion_rate = data.get('completionRate', '0')
        notes = data.get('notes', '')
        
        if not schedule_id or not week_number:
            return jsonify({'error': 'Missing scheduleId or weekNumber'}), 400
        
        db = SessionLocal()
        try:
            # Check if progress exists
            progress = db.query(ScheduleProgress).filter(
                ScheduleProgress.schedule_id == schedule_id,
                ScheduleProgress.week_number == week_number
            ).first()
            
            if progress:
                progress.completion_rate = str(completion_rate)
                progress.notes = notes
            else:
                progress_id = str(uuid.uuid4())
                progress = ScheduleProgress(
                    progress_id=progress_id,
                    schedule_id=schedule_id,
                    week_number=week_number,
                    completion_rate=str(completion_rate),
                    notes=notes
                )
                db.add(progress)
            
            db.commit()
            return jsonify({'message': 'Progress updated successfully'}), 200
        finally:
            db.close()
    except Exception as e:
        print(f"❌ Error updating progress: {str(e)}")
        return jsonify({'error': 'Failed to update progress'}), 500

@schedule_bp.route('/weather', methods=['GET'])
def get_weather_for_schedule():
    """Get weather forecast for schedule generation"""
    lat = request.args.get('lat')
    lon = request.args.get('lon')
    
    if not lat or not lon:
        return jsonify({'error': 'Missing lat or lon'}), 400
    
    try:
        lat_float = float(lat)
        lon_float = float(lon)
        weather_data = get_weather_forecast(lat_float, lon_float, 7)
        
        if not weather_data:
            return jsonify({'error': 'Weather data unavailable'}), 503
        
        return jsonify(weather_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

