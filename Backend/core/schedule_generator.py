from datetime import datetime, timedelta, date
from typing import Dict, List, Optional
try:
    from ..db import SessionLocal
    from ..schemas.detection import Detection
    from ..schemas.guidance import DiseaseGuidance
    from ..schemas.schedule import DiseaseSchedule
except ImportError:
    from db import SessionLocal
    from schemas.detection import Detection
    from schemas.guidance import DiseaseGuidance
    from schemas.schedule import DiseaseSchedule

def generate_schedule(
    farmer_id: str,
    crop_type: str,
    location: str,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    previous_week_progress: Optional[Dict] = None,
    disease_name: Optional[str] = None
) -> List[Dict]:
    """
    Generate personalized farming schedule combining:
    1. Crop disease status (from seed schedules or Gemini API)
    2. Cure guidance from detections
    3. Weather forecast
    4. Location/land type
    
    Args:
        farmer_id: Farmer ID
        crop_type: Type of crop (wheat, rice, cotton)
        location: Location name (e.g., 'Islamabad')
        lat: Latitude
        lon: Longitude
        previous_week_progress: Previous week's progress data
        disease_name: Name of the disease (if known from detection)
    """
    tasks = []
    today = datetime.now().date()
    
    # Validate inputs
    if not crop_type or not isinstance(crop_type, str):
        print(f"⚠️ Invalid crop_type in generate_schedule: {crop_type}")
        crop_type = 'wheat'  # Default fallback
    if not location or not isinstance(location, str):
        print(f"⚠️ Invalid location in generate_schedule: {location}")
        location = 'Islamabad'  # Default fallback
    
    # Ensure crop_type and location are strings
    crop_type = str(crop_type).strip().lower()
    location = str(location).strip()
    
    # Get current temperature from weather API
    current_temp = None
    if lat and lon:
        try:
            from .weather import get_weather_forecast
        except ImportError:
            from core.weather import get_weather_forecast
        weather_data = get_weather_forecast(lat, lon, 1)
        if weather_data and weather_data.get('forecast'):
            current_temp = (weather_data['forecast'][0]['temp_min'] + weather_data['forecast'][0]['temp_max']) / 2
    
    # 1. Get disease-specific schedule from seed data or Gemini API
    disease_schedule = None
    if disease_name and isinstance(disease_name, str):
        disease_schedule = get_disease_schedule(crop_type, disease_name, location, current_temp)
    
    # If we have a disease schedule, use it as the base
    if disease_schedule:
        # Convert day plans to tasks
        for day_plan in disease_schedule:
            day_num = day_plan.get('day', 1)
            task_date = today + timedelta(days=day_num - 1)
            
            for task_idx, task in enumerate(day_plan.get('tasks', [])):
                tasks.append({
                    'id': f"disease-day{day_num}-{task_idx}",
                    'title': task.get('title', 'Task'),
                    'description': task.get('description', ''),
                    'dueDate': task_date.isoformat(),
                    'priority': task.get('priority', 'medium'),
                    'category': task.get('category', 'disease_management'),
                    'completed': False,
                    'source': 'disease_schedule',
                    'cropType': crop_type  # Add crop type to task
                })
    else:
        # Fallback: Get recent disease detections and generate basic schedule
        db = SessionLocal()
        try:
            recent_detections = db.query(Detection).filter(
                Detection.farmer_id == farmer_id
            ).order_by(Detection.timestamp.desc()).limit(5).all()
            
            active_diseases = []
            for det in recent_detections:
                if det.status == 'pending' or (det.confidence_score and det.confidence_score > 50):
                    disease_name_from_det = det.disease_name or 'Unknown Disease'
                    active_diseases.append({
                        'disease': disease_name_from_det,
                        'confidence': det.confidence_score or 0,
                        'severity': 'high' if (det.confidence_score or 0) > 80 else 'medium'
                    })
        finally:
            db.close()
        
        # Generate tasks from disease status
        if active_diseases:
            for i, disease in enumerate(active_diseases[:2]):  # Limit to 2 most critical
                task_date = today + timedelta(days=i)
            tasks.append({
                'id': f"disease-{i}",
                'title': f"Apply treatment for {disease['disease']}",
                'description': f"High priority: {disease['disease']} detected with {disease['confidence']:.0f}% confidence. Apply recommended fungicide/pesticide.",
                'dueDate': task_date.isoformat(),
                'priority': disease['severity'],
                'category': 'disease_management',
                'completed': False,
                'source': 'disease_detection',
                'cropType': crop_type  # Add crop type to task
            })
    
    # 2. Weather-based tasks (if weather API is available)
    if lat and lon:
        try:
            from .weather import get_weather_forecast, get_weather_recommendations, check_rain_in_next_hours
        except ImportError:
            from core.weather import get_weather_forecast, get_weather_recommendations, check_rain_in_next_hours
        
        # Check if rain is expected in 2-3 hours - add irrigation warning
        rain_expected = check_rain_in_next_hours(lat, lon, hours=3)
        if rain_expected:
            tasks.append({
                'id': f"irrigation-warning-{today.isoformat()}",
                'title': '⚠️ Do Not Water Crops',
                'description': 'Rain is expected within the next 2-3 hours. Do not water your crops as natural rainfall will provide sufficient moisture.',
                'dueDate': today.isoformat(),
                'priority': 'high',
                'category': 'weather_advisory',
                'completed': False,
                'source': 'weather_forecast',
                'cropType': crop_type
            })
        
        weather_data = get_weather_forecast(lat, lon, 7)
        if weather_data:
            weather_recs = get_weather_recommendations(weather_data)
            for rec in weather_recs:
                rec_date = date.fromisoformat(rec['date'])
                if rec_date >= today:
                    for idx, recommendation in enumerate(rec['recommendations']):
                        tasks.append({
                            'id': f"weather-{rec_date}-{idx}",
                            'title': recommendation.split(':')[0] if ':' in recommendation else 'Weather-based task',
                            'description': recommendation,
                            'dueDate': rec_date.isoformat(),
                            'priority': 'medium',
                            'category': 'weather_advisory',
                            'completed': False,
                            'source': 'weather_forecast',
                            'cropType': crop_type  # Add crop type to task
                        })
    
    # 3. Location/land type based tasks (only if not already in disease schedule)
    if not disease_schedule:
        location_tasks = get_location_based_tasks(location, crop_type)
        for i, loc_task in enumerate(location_tasks):
            task_date = today + timedelta(days=i % 7)
            tasks.append({
                'id': f"location-{i}",
                'title': loc_task['title'],
                'description': loc_task['description'],
                'dueDate': task_date.isoformat(),
                'priority': loc_task.get('priority', 'medium'),
                'category': 'location_specific',
                'completed': False,
                'source': 'location_analysis',
                'cropType': crop_type  # Add crop type to task
            })
    
    # 4. Standard crop maintenance tasks (only if not already in disease schedule)
    if not disease_schedule:
        maintenance_tasks = get_crop_maintenance_tasks(crop_type, previous_week_progress)
        for i, maint_task in enumerate(maintenance_tasks):
            task_date = today + timedelta(days=i % 7)
        tasks.append({
            'id': f"maintenance-{i}",
            'title': maint_task['title'],
            'description': maint_task['description'],
            'dueDate': task_date.isoformat(),
            'priority': maint_task.get('priority', 'low'),
            'category': 'maintenance',
            'completed': False,
            'source': 'crop_schedule',
            'cropType': crop_type  # Add crop type to task
        })
    
    # Sort by priority and date
    priority_order = {'high': 3, 'medium': 2, 'low': 1}
    tasks.sort(key=lambda x: (
        -priority_order.get(x['priority'], 0),
        x['dueDate']
    ))
    
    # Limit to 7 days (1 week)
    return tasks[:50]  # Allow more tasks since we have 7 days


def get_disease_schedule(
    crop_type: str,
    disease_name: str,
    location: str,
    temperature: Optional[float] = None
) -> Optional[List[Dict]]:
    """
    Get disease-specific 7-day schedule from seed data or Gemini API.
    
    Args:
        crop_type: Type of crop (wheat, rice, cotton)
        disease_name: Name of the disease
        location: Location name (e.g., 'Islamabad')
        temperature: Current temperature (optional)
    
    Returns:
        List of day plans with tasks, or None if not found
    """
    db = SessionLocal()
    try:
        # Normalize inputs - handle None and ensure strings
        if not crop_type or not isinstance(crop_type, str):
            print(f"⚠️ Invalid crop_type: {crop_type}")
            return None
        if not disease_name or not isinstance(disease_name, str):
            print(f"⚠️ Invalid disease_name: {disease_name}")
            return None
        if not location or not isinstance(location, str):
            print(f"⚠️ Invalid location: {location}")
            return None
        
        crop_lower = crop_type.strip().lower()
        disease_normalized = disease_name.strip().lower().replace('_', ' ').replace('-', ' ')
        location_normalized = location.strip()
        
        # Try to find exact match first
        schedule = db.query(DiseaseSchedule).filter(
            DiseaseSchedule.crop == crop_lower,
            DiseaseSchedule.location == location_normalized
        ).filter(
            DiseaseSchedule.disease.ilike(f'%{disease_normalized}%')
        ).first()
        
        if schedule:
            # Check temperature range if provided
            if temperature is not None:
                if schedule.temperature_min and schedule.temperature_max:
                    if schedule.temperature_min <= temperature <= schedule.temperature_max:
                        return schedule.day_plans
                    else:
                        print(f"⚠️ Temperature {temperature}°C outside range [{schedule.temperature_min}-{schedule.temperature_max}°C] for {disease_name}")
                        # Still return the schedule, but log warning
                        return schedule.day_plans
                else:
                    return schedule.day_plans
            else:
                return schedule.day_plans
        
        # If not found in seed data, try Gemini API
        print(f"📡 Disease '{disease_name}' not found in seed data. Using Gemini API...")
        try:
            from .gemini_schedule import generate_schedule_with_gemini
        except ImportError:
            from core.gemini_schedule import generate_schedule_with_gemini
        
        gemini_schedule = generate_schedule_with_gemini(
            crop_type=crop_type,
            disease=disease_name,
            location=location,
            temperature=temperature or 25.0
        )
        
        if gemini_schedule:
            return gemini_schedule
        else:
            print(f"⚠️ Could not generate schedule for {disease_name} using Gemini API")
            return None
            
    except Exception as e:
        print(f"❌ Error getting disease schedule: {str(e)}")
        import traceback
        traceback.print_exc()
        return None
    finally:
        db.close()

def get_location_based_tasks(location: str, crop_type: str) -> List[Dict]:
    """Generate tasks based on location/land type"""
    tasks = []
    
    # Handle None or invalid inputs
    if not location or not isinstance(location, str):
        location = ''
    if not crop_type or not isinstance(crop_type, str):
        crop_type = ''
    
    location_lower = location.lower() if location else ''
    
    # Punjab-specific recommendations
    if 'punjab' in location_lower:
        tasks.append({
            'title': 'Check soil pH levels',
            'description': 'Punjab soils often require pH balancing. Test soil and adjust if needed.',
            'priority': 'medium'
        })
        tasks.append({
            'title': 'Monitor water table',
            'description': 'Punjab has varying water tables. Ensure proper irrigation scheduling.',
            'priority': 'medium'
        })
    
    # Sindh-specific recommendations
    if 'sindh' in location_lower:
        tasks.append({
            'title': 'Salinity management',
            'description': 'Sindh regions may have salinity issues. Monitor soil salinity and apply gypsum if needed.',
            'priority': 'high'
        })
    
    # General location-based tasks
    tasks.append({
        'title': 'Field inspection',
        'description': f'Regular field inspection for {crop_type} in {location}. Check for pests, weeds, and overall crop health.',
        'priority': 'medium'
    })
    
    return tasks

def get_crop_maintenance_tasks(crop_type: str, previous_progress: Optional[Dict] = None) -> List[Dict]:
    """Generate standard maintenance tasks based on crop type and previous week progress"""
    tasks = []
    
    # Handle None or invalid inputs
    if not crop_type or not isinstance(crop_type, str):
        crop_type = 'wheat'  # Default fallback
    
    crop_lower = crop_type.lower()
    
    # Adjust based on previous week progress
    if previous_progress:
        completion_rate = previous_progress.get('completion_rate', 0)
        if completion_rate < 0.5:
            tasks.append({
                'title': 'Review and adjust schedule',
                'description': 'Previous week had low completion. Review tasks and adjust priorities.',
                'priority': 'high'
            })
    
    # Crop-specific tasks
    if crop_lower == 'wheat':
        tasks.extend([
            {
                'title': 'Irrigation check',
                'description': 'Wheat requires consistent moisture. Check irrigation system and water levels.',
                'priority': 'high'
            },
            {
                'title': 'Fertilizer application',
                'description': 'Apply nitrogen fertilizer as per growth stage. Monitor leaf color.',
                'priority': 'medium'
            },
            {
                'title': 'Weed control',
                'description': 'Monitor and control weeds. Apply herbicide if necessary.',
                'priority': 'medium'
            }
        ])
    elif crop_lower == 'rice':
        tasks.extend([
            {
                'title': 'Water level management',
                'description': 'Maintain proper water levels in rice fields. Check field bunds.',
                'priority': 'high'
            },
            {
                'title': 'Fertilizer top-dressing',
                'description': 'Apply top-dressing fertilizer. Split application recommended.',
                'priority': 'medium'
            },
            {
                'title': 'Pest monitoring',
                'description': 'Monitor for rice pests like stem borers and leaf folders.',
                'priority': 'high'
            }
        ])
    elif crop_lower == 'cotton':
        tasks.extend([
            {
                'title': 'Irrigation scheduling',
                'description': 'Cotton needs careful water management. Schedule irrigation based on growth stage.',
                'priority': 'high'
            },
            {
                'title': 'Pest control',
                'description': 'Monitor for bollworms and aphids. Apply pesticides if threshold is reached.',
                'priority': 'high'
            },
            {
                'title': 'Fertilizer application',
                'description': 'Apply balanced NPK fertilizer. Avoid excessive nitrogen.',
                'priority': 'medium'
            }
        ])
    
    return tasks
