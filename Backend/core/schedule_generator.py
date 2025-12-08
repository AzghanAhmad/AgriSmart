from datetime import datetime, timedelta
from typing import Dict, List, Optional
try:
    from ..db import SessionLocal
    from ..schemas.detection import Detection
    from ..schemas.guidance import DiseaseGuidance
except ImportError:
    from db import SessionLocal
    from schemas.detection import Detection
    from schemas.guidance import DiseaseGuidance

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



def generate_schedule_from_detection(
    farmer_id: str,
    detection_id: str,
    crop_type: str,
    disease: str,
    location: str,
    lat: Optional[float] = None,
    lon: Optional[float] = None
) -> List[Dict]:
    """
    Generate personalized farming schedule based on specific detection.
    Considers: 1) Location, 2) Weather (temperature), 3) Crop type, 4) Disease
    """
    tasks = []
    today = datetime.now().date()
    
    # 1. Get disease-specific guidance from database
    db = SessionLocal()
    try:
        norm_crop = crop_type.strip().lower()
        norm_disease = disease.strip().lower().replace('_', ' ').replace('-', ' ')
        
        guidance = db.query(DiseaseGuidance).filter(
            DiseaseGuidance.crop == norm_crop
        ).filter(
            DiseaseGuidance.name.ilike(f'%{norm_disease}%')
        ).first()
        
        if guidance:
            # Create high-priority disease management tasks
            if guidance.chemical_control:
                tasks.append({
                    'id': f"disease-treatment-1",
                    'title': f"Apply treatment for {disease}",
                    'description': f"{guidance.chemical_control}. {guidance.brands if guidance.brands else ''}",
                    'dueDate': today.isoformat(),
                    'priority': 'high',
                    'category': 'disease_management',
                    'completed': False,
                    'source': 'disease_detection'
                })
            
            if guidance.cultural_controls:
                tasks.append({
                    'id': f"disease-prevention-1",
                    'title': f"Preventive measures for {disease}",
                    'description': guidance.cultural_controls,
                    'dueDate': (today + timedelta(days=1)).isoformat(),
                    'priority': 'high',
                    'category': 'disease_management',
                    'completed': False,
                    'source': 'disease_detection'
                })
            
            # Add monitoring task
            tasks.append({
                'id': f"disease-monitor-1",
                'title': f"Monitor {crop_type} for {disease} symptoms",
                'description': f"Check for: {guidance.symptoms if guidance.symptoms else 'disease progression'}",
                'dueDate': (today + timedelta(days=3)).isoformat(),
                'priority': 'medium',
                'category': 'disease_management',
                'completed': False,
                'source': 'disease_detection'
            })
    finally:
        db.close()
    
    # 2. Weather-based tasks (check temperature)
    if lat and lon:
        try:
            from .weather import get_weather_forecast, get_weather_recommendations
        except ImportError:
            from core.weather import get_weather_forecast, get_weather_recommendations
        
        weather_data = get_weather_forecast(lat, lon, 7)
        if weather_data and weather_data.get('forecast'):
            # Get temperature-specific recommendations
            for i, day in enumerate(weather_data['forecast'][:7]):
                temp_avg = (day['temp_min'] + day['temp_max']) / 2
                day_date = datetime.fromisoformat(day['date']).date()
                
                # Temperature-based irrigation tasks
                if temp_avg > 35:
                    tasks.append({
                        'id': f"weather-irrigation-{i}",
                        'title': "Increase irrigation due to high temperature",
                        'description': f"Temperature: {temp_avg:.1f}°C. Increase watering frequency for {crop_type}. Check soil moisture regularly.",
                        'dueDate': day_date.isoformat(),
                        'priority': 'high',
                        'category': 'weather_advisory',
                        'completed': False,
                        'source': 'weather_forecast'
                    })
                elif temp_avg < 10:
                    tasks.append({
                        'id': f"weather-frost-{i}",
                        'title': "Protect crops from cold temperature",
                        'description': f"Temperature: {temp_avg:.1f}°C. Protect {crop_type} from frost damage. Consider covering or mulching.",
                        'dueDate': day_date.isoformat(),
                        'priority': 'high',
                        'category': 'weather_advisory',
                        'completed': False,
                        'source': 'weather_forecast'
                    })
                
                # Precipitation-based tasks
                if day['precipitation'] > 5:
                    tasks.append({
                        'id': f"weather-rain-{i}",
                        'title': "Heavy rain expected - adjust irrigation",
                        'description': f"Expected rainfall: {day['precipitation']:.1f}mm. Skip irrigation and ensure proper drainage.",
                        'dueDate': day_date.isoformat(),
                        'priority': 'medium',
                        'category': 'weather_advisory',
                        'completed': False,
                        'source': 'weather_forecast'
                    })
    
    # 3. Location-specific tasks
    location_tasks = get_location_based_tasks(location, crop_type)
    for i, loc_task in enumerate(location_tasks[:3]):  # Limit to 3 location tasks
        task_date = today + timedelta(days=(i + 2))
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
    
    # 4. Crop-specific maintenance tasks
    crop_tasks = get_crop_specific_tasks(crop_type, disease)
    for i, crop_task in enumerate(crop_tasks[:4]):  # Limit to 4 crop tasks
        task_date = today + timedelta(days=(i + 1))
        tasks.append({
            'id': f"crop-maintenance-{i}",
            'title': crop_task['title'],
            'description': crop_task['description'],
            'dueDate': task_date.isoformat(),
            'priority': crop_task.get('priority', 'medium'),
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
    
    # Limit to 14 tasks (2 weeks)
    return tasks[:14]


def get_crop_specific_tasks(crop_type: str, disease: str) -> List[Dict]:
    """Generate crop-specific maintenance tasks considering the disease"""
    tasks = []
    crop_lower = crop_type.lower()
    
    if crop_lower == 'wheat':
        tasks.extend([
            {
                'title': 'Inspect wheat field for disease spread',
                'description': f'Check neighboring plants for {disease} symptoms. Early detection prevents spread.',
                'priority': 'high'
            },
            {
                'title': 'Adjust nitrogen fertilizer application',
                'description': 'Excessive nitrogen can worsen some diseases. Apply balanced NPK fertilizer.',
                'priority': 'medium'
            },
            {
                'title': 'Ensure proper field drainage',
                'description': 'Poor drainage can promote disease. Check and clear drainage channels.',
                'priority': 'medium'
            },
            {
                'title': 'Remove infected plant debris',
                'description': 'Clean up fallen leaves and infected plant parts to reduce disease inoculum.',
                'priority': 'high'
            }
        ])
    elif crop_lower == 'rice':
        tasks.extend([
            {
                'title': 'Monitor water levels in rice field',
                'description': f'Maintain optimal water depth. Some diseases thrive in stagnant water.',
                'priority': 'high'
            },
            {
                'title': 'Check for pest vectors',
                'description': f'Some pests spread {disease}. Monitor and control pest populations.',
                'priority': 'high'
            },
            {
                'title': 'Apply silicon-based fertilizer',
                'description': 'Silicon strengthens rice plants against diseases. Apply as per recommendations.',
                'priority': 'medium'
            },
            {
                'title': 'Inspect field bunds and levees',
                'description': 'Maintain proper water management infrastructure to prevent disease spread.',
                'priority': 'low'
            }
        ])
    elif crop_lower == 'cotton':
        tasks.extend([
            {
                'title': 'Scout for bollworm and other pests',
                'description': f'Pests can worsen {disease} impact. Regular scouting is essential.',
                'priority': 'high'
            },
            {
                'title': 'Prune affected cotton branches',
                'description': 'Remove severely infected branches to prevent disease spread.',
                'priority': 'high'
            },
            {
                'title': 'Apply potassium-rich fertilizer',
                'description': 'Potassium improves disease resistance in cotton. Apply as needed.',
                'priority': 'medium'
            },
            {
                'title': 'Check irrigation system efficiency',
                'description': 'Proper irrigation prevents stress that makes cotton susceptible to diseases.',
                'priority': 'medium'
            }
        ])
    
    return tasks
