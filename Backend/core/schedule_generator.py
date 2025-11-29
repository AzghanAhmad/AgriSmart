from datetime import datetime, timedelta
from typing import Dict, List, Optional
try:
    from ..db import SessionLocal
    from ..schemas.detection import Detection
except ImportError:
    from db import SessionLocal
    from schemas.detection import Detection

def generate_schedule(
    farmer_id: str,
    crop_type: str,
    location: str,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    previous_week_progress: Optional[Dict] = None
) -> List[Dict]:
    """
    Generate personalized farming schedule combining:
    1. Crop disease status
    2. Cure guidance from detections
    3. Weather forecast
    4. Location/land type
    """
    tasks = []
    today = datetime.now().date()
    
    # 1. Get recent disease detections
    db = SessionLocal()
    try:
        recent_detections = db.query(Detection).filter(
            Detection.farmer_id == farmer_id
        ).order_by(Detection.timestamp.desc()).limit(5).all()
        
        active_diseases = []
        for det in recent_detections:
            if det.status == 'pending' or (det.confidence_score and det.confidence_score > 50):
                active_diseases.append({
                    'disease': 'Unknown Disease',  # Would map to actual disease name
                    'confidence': det.confidence_score or 0,
                    'severity': 'high' if (det.confidence_score or 0) > 80 else 'medium'
                })
    finally:
        db.close()
    
    # 2. Generate tasks from disease status and cure guidance
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
                'source': 'disease_detection'
            })
    
    # 3. Weather-based tasks (if weather API is available)
    if lat and lon:
        try:
            from .weather import get_weather_forecast, get_weather_recommendations
        except ImportError:
            from core.weather import get_weather_forecast, get_weather_recommendations
        weather_data = get_weather_forecast(lat, lon, 7)
        if weather_data:
            weather_recs = get_weather_recommendations(weather_data)
            for rec in weather_recs:
                rec_date = datetime.fromisoformat(rec['date']).date()
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
                            'source': 'weather_forecast'
                        })
    
    # 4. Location/land type based tasks
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
            'source': 'location_analysis'
        })
    
    # 5. Standard crop maintenance tasks
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
            'source': 'crop_schedule'
        })
    
    # Sort by priority and date
    priority_order = {'high': 3, 'medium': 2, 'low': 1}
    tasks.sort(key=lambda x: (
        -priority_order.get(x['priority'], 0),
        x['dueDate']
    ))
    
    return tasks[:14]  # Limit to 2 weeks

def get_location_based_tasks(location: str, crop_type: str) -> List[Dict]:
    """Generate tasks based on location/land type"""
    tasks = []
    
    location_lower = location.lower()
    
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

