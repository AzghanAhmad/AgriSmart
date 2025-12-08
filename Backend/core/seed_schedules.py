import uuid
from typing import List, Dict
from datetime import date, timedelta

try:
    from ..db import SessionLocal
    from ..schemas.schedule import DiseaseSchedule
except ImportError:
    try:
        from db import SessionLocal
        from schemas.schedule import DiseaseSchedule
    except ImportError:
        # If DiseaseSchedule doesn't exist yet, we'll handle it in the function
        SessionLocal = None
        DiseaseSchedule = None


# 7-day personalized farming schedules for Islamabad location
# Each schedule considers: location (Islamabad), crop type, disease, and temperature ranges
SEED_SCHEDULES: List[Dict] = [
    # ========== WHEAT DISEASES ==========
    
    # Wheat - Aphid
    {
        'crop': 'wheat',
        'disease': 'Aphid',
        'location': 'Islamabad',
        'temperature_range': {'min': 15, 'max': 30},
        'day_plans': [
            {
                'day': 1,
                'tasks': [
                    {'title': 'Inspect wheat field for aphid infestation', 'description': 'Check underside of leaves for aphid colonies. Look for curling leaves and honeydew.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Assess natural enemy population', 'description': 'Count ladybird beetles and other beneficial insects. Avoid spraying if beneficials present.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Check weather conditions', 'description': 'Monitor temperature (15-30°C ideal for aphids). Note humidity levels.', 'priority': 'medium', 'category': 'weather_advisory'},
                ]
            },
            {
                'day': 2,
                'tasks': [
                    {'title': 'Apply neonicotinoid insecticide if threshold exceeded', 'description': 'If aphid count > 50 per tiller, apply Confidor (Imidacloprid) at 200ml/acre. Spot treatment preferred.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Remove weed hosts', 'description': 'Clear weeds around field that serve as aphid hosts, especially grasses.', 'priority': 'medium', 'category': 'location_specific'},
                    {'title': 'Adjust irrigation', 'description': 'Maintain adequate soil moisture. Avoid water stress which attracts aphids.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 3,
                'tasks': [
                    {'title': 'Monitor treatment effectiveness', 'description': 'Re-inspect treated areas. Check for aphid mortality and beneficial insect survival.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Apply balanced nitrogen fertilizer', 'description': 'Avoid excessive nitrogen which promotes aphid reproduction. Apply balanced NPK.', 'priority': 'medium', 'category': 'crop_maintenance'},
                    {'title': 'Field sanitation', 'description': 'Remove crop residues and volunteer wheat plants that harbor aphids.', 'priority': 'low', 'category': 'location_specific'},
                ]
            },
            {
                'day': 4,
                'tasks': [
                    {'title': 'Second spray if needed', 'description': 'If aphid population persists, apply Karate (Lambda-cyhalothrin) at 150ml/acre. Rotate chemistry.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Promote beneficial insects', 'description': 'Avoid broad-spectrum insecticides. Plant flowering borders to attract ladybirds.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Check soil moisture', 'description': 'Islamabad soil requires consistent moisture. Test soil at 6-inch depth.', 'priority': 'medium', 'category': 'location_specific'},
                ]
            },
            {
                'day': 5,
                'tasks': [
                    {'title': 'Final assessment of aphid control', 'description': 'Count aphids per tiller. Threshold: <10 aphids per tiller acceptable.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Monitor for secondary pests', 'description': 'Check for sooty mold growth on honeydew. Monitor for other sucking pests.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Weed control', 'description': 'Remove remaining weeds. Apply post-emergence herbicide if needed.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 6,
                'tasks': [
                    {'title': 'Record treatment results', 'description': 'Document aphid counts, treatments applied, and crop response. Keep records for future reference.', 'priority': 'low', 'category': 'crop_maintenance'},
                    {'title': 'Plan preventive measures', 'description': 'For next season: use resistant varieties, early planting, and biological control.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Fertilizer top-dressing', 'description': 'Apply second dose of nitrogen fertilizer if crop is in tillering stage.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 7,
                'tasks': [
                    {'title': 'Weekly field inspection', 'description': 'Complete field walk. Check all areas for aphid resurgence or new infestations.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Prepare for next week', 'description': 'Review weather forecast. Plan irrigation and fertilizer schedule for upcoming week.', 'priority': 'medium', 'category': 'weather_advisory'},
                    {'title': 'Maintain field hygiene', 'description': 'Keep field borders clean. Remove any remaining crop debris.', 'priority': 'low', 'category': 'location_specific'},
                ]
            }
        ]
    },
    
    # Wheat - Black Rust (Stem rust)
    {
        'crop': 'wheat',
        'disease': 'Black Rust (Stem rust)',
        'location': 'Islamabad',
        'temperature_range': {'min': 18, 'max': 25},
        'day_plans': [
            {
                'day': 1,
                'tasks': [
                    {'title': 'Identify rust pustules on stems', 'description': 'Look for reddish-brown pustules on stems and leaf sheaths. Check lower plant parts first.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Assess disease severity', 'description': 'Count infected tillers. If >10% affected, immediate action required.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Check weather conditions', 'description': 'Stem rust thrives at 18-25°C with high humidity. Monitor dew formation.', 'priority': 'high', 'category': 'weather_advisory'},
                ]
            },
            {
                'day': 2,
                'tasks': [
                    {'title': 'Apply Tilt (Propiconazole) fungicide', 'description': 'Spray Tilt at 500ml/acre. Ensure thorough coverage of stems and lower leaves.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Remove volunteer wheat', 'description': 'Eliminate volunteer wheat plants that serve as rust reservoirs.', 'priority': 'high', 'category': 'location_specific'},
                    {'title': 'Improve air circulation', 'description': 'Reduce plant density if too high. Prune if necessary to improve airflow.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 3,
                'tasks': [
                    {'title': 'Monitor fungicide effectiveness', 'description': 'Check for new pustule formation. Existing pustules should stop spreading.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Adjust irrigation timing', 'description': 'Water early morning to allow leaves to dry quickly. Avoid evening irrigation.', 'priority': 'high', 'category': 'weather_advisory'},
                    {'title': 'Apply balanced fertilizer', 'description': 'Avoid excessive nitrogen. Apply balanced NPK to strengthen plants.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 4,
                'tasks': [
                    {'title': 'Second fungicide application if needed', 'description': 'If disease continues spreading, apply second spray with Tebuconazole at 400ml/acre.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Field sanitation', 'description': 'Remove and destroy severely infected plants. Burn or bury away from field.', 'priority': 'high', 'category': 'location_specific'},
                    {'title': 'Monitor neighboring fields', 'description': 'Check adjacent fields for rust. Coordinate with neighbors for area-wide control.', 'priority': 'medium', 'category': 'disease_management'},
                ]
            },
            {
                'day': 5,
                'tasks': [
                    {'title': 'Assess crop recovery', 'description': 'Evaluate plant health. Check for new tiller development and overall vigor.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Plan resistant varieties for next season', 'description': 'Research rust-resistant wheat varieties suitable for Islamabad climate.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Soil health check', 'description': 'Test soil pH and nutrients. Maintain optimal conditions for wheat growth.', 'priority': 'medium', 'category': 'location_specific'},
                ]
            },
            {
                'day': 6,
                'tasks': [
                    {'title': 'Final disease assessment', 'description': 'Count remaining rust pustules. Document disease progression and treatment results.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Prepare seed treatment plan', 'description': 'For next season: plan seed treatment with systemic fungicides to prevent early infection.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Fertilizer application', 'description': 'Apply second dose of nitrogen if crop is in booting stage.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 7,
                'tasks': [
                    {'title': 'Weekly field monitoring', 'description': 'Complete field inspection. Check for any new rust outbreaks or other diseases.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Weather forecast review', 'description': 'Check 7-day forecast. Plan protective sprays if rain expected.', 'priority': 'medium', 'category': 'weather_advisory'},
                    {'title': 'Record keeping', 'description': 'Document all treatments, dates, and results for future reference.', 'priority': 'low', 'category': 'crop_maintenance'},
                ]
            }
        ]
    },
    
    # Wheat - Brown Rust (Leaf rust)
    {
        'crop': 'wheat',
        'disease': 'Brown Rust (Leaf rust)',
        'location': 'Islamabad',
        'temperature_range': {'min': 15, 'max': 22},
        'day_plans': [
            {
                'day': 1,
                'tasks': [
                    {'title': 'Identify orange-brown pustules on leaves', 'description': 'Check upper leaf surfaces for small orange-brown pustules arranged in rows.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Assess infection percentage', 'description': 'Estimate percentage of leaf area affected. >5% requires treatment.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Monitor temperature', 'description': 'Leaf rust optimal at 15-22°C. Check current and forecasted temperatures.', 'priority': 'medium', 'category': 'weather_advisory'},
                ]
            },
            {
                'day': 2,
                'tasks': [
                    {'title': 'Apply Tilt (Propiconazole) fungicide', 'description': 'Spray Tilt at 500ml/acre. Cover all leaf surfaces thoroughly.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Remove volunteer wheat', 'description': 'Clear volunteer wheat plants that harbor rust spores.', 'priority': 'high', 'category': 'location_specific'},
                    {'title': 'Balance nitrogen application', 'description': 'Avoid excessive nitrogen which increases susceptibility. Apply balanced fertilizer.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 3,
                'tasks': [
                    {'title': 'Monitor treatment progress', 'description': 'Check for new pustule formation. Existing lesions should stop expanding.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Improve field drainage', 'description': 'Ensure proper drainage to reduce humidity. Clear drainage channels.', 'priority': 'medium', 'category': 'location_specific'},
                    {'title': 'Irrigation management', 'description': 'Water in early morning. Allow leaves to dry before evening.', 'priority': 'high', 'category': 'weather_advisory'},
                ]
            },
            {
                'day': 4,
                'tasks': [
                    {'title': 'Apply Amistar (Azoxystrobin) if needed', 'description': 'If disease persists, apply Amistar at 400ml/acre. Rotate fungicide chemistry.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Field inspection', 'description': 'Walk entire field. Check for disease hotspots and spread patterns.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Remove infected leaves', 'description': 'Prune severely infected lower leaves if practical. Dispose properly.', 'priority': 'low', 'category': 'disease_management'},
                ]
            },
            {
                'day': 5,
                'tasks': [
                    {'title': 'Assess crop response', 'description': 'Evaluate plant health and new growth. Check for disease-free new leaves.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Plan resistant varieties', 'description': 'Research leaf rust-resistant varieties for next planting season.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Soil testing', 'description': 'Test soil for pH and nutrient levels. Maintain optimal conditions.', 'priority': 'medium', 'category': 'location_specific'},
                ]
            },
            {
                'day': 6,
                'tasks': [
                    {'title': 'Final disease check', 'description': 'Count remaining pustules. Document disease severity and treatment effectiveness.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Prepare preventive plan', 'description': 'Plan seed treatment and early season monitoring for next crop.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Fertilizer top-dressing', 'description': 'Apply second nitrogen dose if crop is in flag leaf stage.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 7,
                'tasks': [
                    {'title': 'Weekly field assessment', 'description': 'Complete field walk. Monitor for rust resurgence or other diseases.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Weather forecast check', 'description': 'Review 7-day forecast. Plan protective sprays if conditions favor rust.', 'priority': 'medium', 'category': 'weather_advisory'},
                    {'title': 'Maintain records', 'description': 'Document all observations, treatments, and outcomes.', 'priority': 'low', 'category': 'crop_maintenance'},
                ]
            }
        ]
    },
    
    # Wheat - Yellow Rust (Stripe rust)
    {
        'crop': 'wheat',
        'disease': 'Yellow Rust (Stripe rust)',
        'location': 'Islamabad',
        'temperature_range': {'min': 10, 'max': 18},
        'day_plans': [
            {
                'day': 1,
                'tasks': [
                    {'title': 'Identify yellow stripe pustules', 'description': 'Look for yellow stripes of pustules along leaf veins. Check upper leaves first.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Assess disease severity', 'description': 'Estimate percentage of leaf area with yellow stripes. >3% requires treatment.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Check temperature conditions', 'description': 'Yellow rust prefers cool temperatures (10-18°C). Monitor current conditions.', 'priority': 'high', 'category': 'weather_advisory'},
                ]
            },
            {
                'day': 2,
                'tasks': [
                    {'title': 'Apply Tilt (Propiconazole) fungicide', 'description': 'Spray Tilt at 500ml/acre immediately. Yellow rust spreads rapidly.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Remove volunteer wheat', 'description': 'Eliminate all volunteer wheat plants immediately.', 'priority': 'high', 'category': 'location_specific'},
                    {'title': 'Avoid late irrigation', 'description': 'Reduce irrigation frequency. Yellow rust thrives in moist conditions.', 'priority': 'high', 'category': 'weather_advisory'},
                ]
            },
            {
                'day': 3,
                'tasks': [
                    {'title': 'Monitor treatment effectiveness', 'description': 'Check for new stripe formation. Existing stripes should stop expanding.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Apply Tebuconazole if needed', 'description': 'If disease continues, apply Tebuconazole at 400ml/acre as second spray.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Improve air circulation', 'description': 'Reduce plant density if too high. Improve field ventilation.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 4,
                'tasks': [
                    {'title': 'Field-wide inspection', 'description': 'Walk entire field. Check all areas for yellow rust spread.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Remove severely infected plants', 'description': 'Remove and destroy plants with >50% leaf area affected.', 'priority': 'high', 'category': 'location_specific'},
                    {'title': 'Balance fertilizer', 'description': 'Apply balanced NPK. Avoid excessive nitrogen.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 5,
                'tasks': [
                    {'title': 'Assess crop recovery', 'description': 'Evaluate new leaf growth. Check for disease-free new leaves.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Plan resistant varieties', 'description': 'Research yellow rust-resistant varieties for Islamabad conditions.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Monitor weather', 'description': 'Watch for temperature changes. Yellow rust slows above 18°C.', 'priority': 'medium', 'category': 'weather_advisory'},
                ]
            },
            {
                'day': 6,
                'tasks': [
                    {'title': 'Final disease assessment', 'description': 'Count remaining yellow stripes. Document disease progression.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Prepare next season plan', 'description': 'Plan seed treatment and early monitoring for next crop.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Fertilizer application', 'description': 'Apply second nitrogen dose if crop is in booting stage.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 7,
                'tasks': [
                    {'title': 'Weekly monitoring', 'description': 'Complete field inspection. Check for rust resurgence.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Weather forecast review', 'description': 'Check forecast. Plan protective sprays if cool, wet conditions expected.', 'priority': 'medium', 'category': 'weather_advisory'},
                    {'title': 'Record keeping', 'description': 'Document all treatments and results for future reference.', 'priority': 'low', 'category': 'crop_maintenance'},
                ]
            }
        ]
    },
    
    # Wheat - Powdery Mildew
    {
        'crop': 'wheat',
        'disease': 'Powdery mildew',
        'location': 'Islamabad',
        'temperature_range': {'min': 15, 'max': 22},
        'day_plans': [
            {
                'day': 1,
                'tasks': [
                    {'title': 'Identify white powdery growth', 'description': 'Check upper leaf surfaces for white powdery fungal growth.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Assess infection level', 'description': 'Estimate percentage of leaf area covered. >10% requires treatment.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Check humidity levels', 'description': 'Powdery mildew thrives in moderate humidity (60-80%). Monitor conditions.', 'priority': 'medium', 'category': 'weather_advisory'},
                ]
            },
            {
                'day': 2,
                'tasks': [
                    {'title': 'Apply sulfur dust or Tilt', 'description': 'Apply sulfur dust at 2kg/acre or Tilt (Propiconazole) at 500ml/acre.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Reduce plant density', 'description': 'Thin dense canopies to improve air circulation and reduce humidity.', 'priority': 'medium', 'category': 'crop_maintenance'},
                    {'title': 'Avoid excessive nitrogen', 'description': 'Reduce nitrogen application. High N promotes dense growth and mildew.', 'priority': 'high', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 3,
                'tasks': [
                    {'title': 'Monitor treatment progress', 'description': 'Check for new powdery growth. Existing growth should stop spreading.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Improve field ventilation', 'description': 'Ensure proper spacing between plants. Remove excess tillers if needed.', 'priority': 'medium', 'category': 'crop_maintenance'},
                    {'title': 'Irrigation timing', 'description': 'Water early morning. Allow leaves to dry quickly.', 'priority': 'medium', 'category': 'weather_advisory'},
                ]
            },
            {
                'day': 4,
                'tasks': [
                    {'title': 'Second application if needed', 'description': 'If mildew persists, apply second spray with Propiconazole.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Remove severely infected leaves', 'description': 'Prune and remove leaves with >50% powdery coverage.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Field inspection', 'description': 'Walk field to identify disease hotspots.', 'priority': 'high', 'category': 'disease_management'},
                ]
            },
            {
                'day': 5,
                'tasks': [
                    {'title': 'Assess crop response', 'description': 'Evaluate new leaf growth. Check for disease-free new leaves.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Plan resistant varieties', 'description': 'Research powdery mildew-resistant varieties for next season.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Soil health maintenance', 'description': 'Maintain optimal soil pH and nutrients for wheat growth.', 'priority': 'medium', 'category': 'location_specific'},
                ]
            },
            {
                'day': 6,
                'tasks': [
                    {'title': 'Final disease check', 'description': 'Count remaining powdery patches. Document treatment effectiveness.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Prepare preventive measures', 'description': 'Plan for next season: resistant varieties, proper spacing, balanced nutrition.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Fertilizer application', 'description': 'Apply balanced fertilizer if crop is in critical growth stage.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 7,
                'tasks': [
                    {'title': 'Weekly field assessment', 'description': 'Complete field walk. Monitor for mildew resurgence.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Weather forecast', 'description': 'Check forecast. Plan protective sprays if conditions favor mildew.', 'priority': 'medium', 'category': 'weather_advisory'},
                    {'title': 'Maintain records', 'description': 'Document all observations and treatments.', 'priority': 'low', 'category': 'crop_maintenance'},
                ]
            }
        ]
    },
    
    # ========== RICE DISEASES ==========
    
    # Rice - Rice Blast
    {
        'crop': 'rice',
        'disease': 'Rice Blast',
        'location': 'Islamabad',
        'temperature_range': {'min': 20, 'max': 28},
        'day_plans': [
            {
                'day': 1,
                'tasks': [
                    {'title': 'Identify diamond-shaped lesions', 'description': 'Check leaves for diamond-shaped lesions with gray centers and dark borders.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Assess disease severity', 'description': 'Count lesions per leaf. >5 lesions per leaf requires immediate treatment.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Monitor temperature and humidity', 'description': 'Blast thrives at 20-28°C with high humidity. Check current conditions.', 'priority': 'high', 'category': 'weather_advisory'},
                ]
            },
            {
                'day': 2,
                'tasks': [
                    {'title': 'Apply Tilt (Propiconazole) or Tricyclazole', 'description': 'Spray Tilt at 500ml/acre or Tricyclazole at 300ml/acre. Critical timing is essential.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Improve water management', 'description': 'Drain field temporarily to reduce humidity. Maintain 2-3cm water level.', 'priority': 'high', 'category': 'crop_maintenance'},
                    {'title': 'Reduce nitrogen application', 'description': 'Stop nitrogen application immediately. Excessive N worsens blast.', 'priority': 'high', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 3,
                'tasks': [
                    {'title': 'Monitor treatment effectiveness', 'description': 'Check for new lesion formation. Existing lesions should stop expanding.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Apply Amistar Top if needed', 'description': 'If disease continues, apply Amistar Top (Azoxystrobin + Difenoconazole) at 400ml/acre.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Field drainage check', 'description': 'Ensure proper drainage. Clear blocked channels.', 'priority': 'medium', 'category': 'location_specific'},
                ]
            },
            {
                'day': 4,
                'tasks': [
                    {'title': 'Remove severely infected plants', 'description': 'Remove and destroy plants with >30% leaf area affected.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Monitor for neck blast', 'description': 'Check panicles for neck blast symptoms. Critical for yield protection.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Water level management', 'description': 'Maintain optimal water depth (2-3cm). Avoid deep flooding.', 'priority': 'high', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 5,
                'tasks': [
                    {'title': 'Assess crop recovery', 'description': 'Evaluate new leaf growth and overall plant health.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Plan resistant varieties', 'description': 'Research blast-resistant varieties suitable for Islamabad conditions.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Soil health check', 'description': 'Test soil pH. Maintain slightly acidic conditions (pH 5.5-6.5) for rice.', 'priority': 'medium', 'category': 'location_specific'},
                ]
            },
            {
                'day': 6,
                'tasks': [
                    {'title': 'Final disease assessment', 'description': 'Count remaining lesions. Document disease progression and treatment results.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Prepare preventive plan', 'description': 'Plan seed treatment and early season monitoring for next crop.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Fertilizer application', 'description': 'Apply potassium fertilizer to strengthen plants. Avoid nitrogen.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 7,
                'tasks': [
                    {'title': 'Weekly field monitoring', 'description': 'Complete field inspection. Check for blast resurgence or neck blast.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Weather forecast review', 'description': 'Check 7-day forecast. Plan protective sprays if conditions favor blast.', 'priority': 'medium', 'category': 'weather_advisory'},
                    {'title': 'Record keeping', 'description': 'Document all treatments, dates, and outcomes.', 'priority': 'low', 'category': 'crop_maintenance'},
                ]
            }
        ]
    },
    
    # Rice - Brown Spot
    {
        'crop': 'rice',
        'disease': 'Brown Spot',
        'location': 'Islamabad',
        'temperature_range': {'min': 20, 'max': 30},
        'day_plans': [
            {
                'day': 1,
                'tasks': [
                    {'title': 'Identify brown lesions on leaves', 'description': 'Check leaves for circular to oval brown spots with yellow halos.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Assess infection level', 'description': 'Count spots per leaf. >10 spots per leaf indicates severe infection.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Check soil nutrition', 'description': 'Brown spot often indicates nutrient deficiency, especially silicon.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 2,
                'tasks': [
                    {'title': 'Apply Dithane (Mancozeb) fungicide', 'description': 'Spray Dithane at 1kg/acre. Ensure thorough coverage.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Apply silicon fertilizer', 'description': 'Apply silicon-based fertilizer at 50kg/acre. Silicon strengthens rice plants.', 'priority': 'high', 'category': 'crop_maintenance'},
                    {'title': 'Improve field drainage', 'description': 'Ensure proper drainage. Well-drained nurseries reduce brown spot.', 'priority': 'medium', 'category': 'location_specific'},
                ]
            },
            {
                'day': 3,
                'tasks': [
                    {'title': 'Monitor treatment progress', 'description': 'Check for new spot formation. Existing spots should stop expanding.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Apply Bavistin if needed', 'description': 'If disease persists, apply Bavistin (Carbendazim) at 500g/acre.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Balanced fertilization', 'description': 'Apply balanced NPK fertilizer. Avoid excessive nitrogen.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 4,
                'tasks': [
                    {'title': 'Field inspection', 'description': 'Walk entire field. Identify disease hotspots and spread patterns.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Remove infected leaves', 'description': 'Prune severely infected lower leaves if practical.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Water management', 'description': 'Maintain optimal water levels. Avoid water stress.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 5,
                'tasks': [
                    {'title': 'Assess crop response', 'description': 'Evaluate new leaf growth. Check for disease-free new leaves.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Plan seed treatment', 'description': 'For next season: treat seeds with fungicide to prevent early infection.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Soil testing', 'description': 'Test soil for silicon and other nutrients. Maintain optimal levels.', 'priority': 'medium', 'category': 'location_specific'},
                ]
            },
            {
                'day': 6,
                'tasks': [
                    {'title': 'Final disease check', 'description': 'Count remaining spots. Document disease severity and treatment results.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Prepare preventive measures', 'description': 'Plan for next season: seed treatment, balanced nutrition, proper drainage.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Fertilizer top-dressing', 'description': 'Apply second dose of silicon if needed.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 7,
                'tasks': [
                    {'title': 'Weekly field assessment', 'description': 'Complete field walk. Monitor for brown spot resurgence.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Weather forecast', 'description': 'Check forecast. Plan protective sprays if conditions favor disease.', 'priority': 'medium', 'category': 'weather_advisory'},
                    {'title': 'Maintain records', 'description': 'Document all observations and treatments.', 'priority': 'low', 'category': 'crop_maintenance'},
                ]
            }
        ]
    },
    
    # Rice - Sheath Blight
    {
        'crop': 'rice',
        'disease': 'Sheath Blight',
        'location': 'Islamabad',
        'temperature_range': {'min': 25, 'max': 32},
        'day_plans': [
            {
                'day': 1,
                'tasks': [
                    {'title': 'Identify lesions on sheath', 'description': 'Check leaf sheaths near water line for oval lesions with gray centers.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Assess disease severity', 'description': 'Count infected tillers. >20% affected requires treatment.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Check plant density', 'description': 'High plant density promotes sheath blight. Assess spacing.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 2,
                'tasks': [
                    {'title': 'Apply Amistar Top fungicide', 'description': 'Spray Amistar Top (Azoxystrobin + Difenoconazole) at 400ml/acre.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Reduce plant density', 'description': 'Thin dense stands if possible. Improve air circulation.', 'priority': 'high', 'category': 'crop_maintenance'},
                    {'title': 'Reduce nitrogen application', 'description': 'Stop excessive nitrogen. High N increases susceptibility.', 'priority': 'high', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 3,
                'tasks': [
                    {'title': 'Monitor treatment effectiveness', 'description': 'Check for new lesion formation. Existing lesions should stop spreading.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Apply Tilt if needed', 'description': 'If disease continues, apply Tilt (Propiconazole) at 500ml/acre.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Water level adjustment', 'description': 'Drain field slightly to reduce humidity around sheaths.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 4,
                'tasks': [
                    {'title': 'Field-wide inspection', 'description': 'Walk entire field. Check all areas for sheath blight spread.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Remove severely infected tillers', 'description': 'Remove and destroy tillers with >50% sheath affected.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Biological control', 'description': 'Apply Trichoderma-based biopesticide if available.', 'priority': 'low', 'category': 'disease_management'},
                ]
            },
            {
                'day': 5,
                'tasks': [
                    {'title': 'Assess crop recovery', 'description': 'Evaluate new growth. Check for disease-free new tillers.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Plan resistant varieties', 'description': 'Research sheath blight-resistant varieties for next season.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Soil health maintenance', 'description': 'Maintain optimal soil conditions for rice growth.', 'priority': 'medium', 'category': 'location_specific'},
                ]
            },
            {
                'day': 6,
                'tasks': [
                    {'title': 'Final disease assessment', 'description': 'Count remaining lesions. Document treatment effectiveness.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Prepare preventive plan', 'description': 'Plan for next season: proper spacing, balanced nutrition, clean seed.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Fertilizer application', 'description': 'Apply balanced fertilizer if crop is in critical growth stage.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 7,
                'tasks': [
                    {'title': 'Weekly monitoring', 'description': 'Complete field inspection. Check for sheath blight resurgence.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Weather forecast review', 'description': 'Check forecast. Plan protective sprays if conditions favor disease.', 'priority': 'medium', 'category': 'weather_advisory'},
                    {'title': 'Record keeping', 'description': 'Document all treatments and results.', 'priority': 'low', 'category': 'crop_maintenance'},
                ]
            }
        ]
    },
    
    # Rice - Bacterial Blight
    {
        'crop': 'rice',
        'disease': 'Bacterial Blight',
        'location': 'Islamabad',
        'temperature_range': {'min': 25, 'max': 30},
        'day_plans': [
            {
                'day': 1,
                'tasks': [
                    {'title': 'Identify water-soaked streaks', 'description': 'Check leaves for water-soaked streaks that turn yellow and then brown.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Assess infection level', 'description': 'Count infected leaves. Bacterial blight spreads rapidly.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Check for wounds', 'description': 'Bacteria enter through wounds. Check for insect damage or mechanical injury.', 'priority': 'medium', 'category': 'disease_management'},
                ]
            },
            {
                'day': 2,
                'tasks': [
                    {'title': 'Apply copper-based bactericide', 'description': 'Spray copper oxychloride at 2kg/acre. Protective spray only.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Remove infected plants', 'description': 'Remove and destroy severely infected plants immediately.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Avoid overhead irrigation', 'description': 'Use flood irrigation instead of overhead. Reduces bacterial spread.', 'priority': 'high', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 3,
                'tasks': [
                    {'title': 'Monitor disease spread', 'description': 'Check for new infections. Bacterial blight spreads through water.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Field sanitation', 'description': 'Remove all infected plant debris. Clean tools and equipment.', 'priority': 'high', 'category': 'location_specific'},
                    {'title': 'Control insect vectors', 'description': 'Apply insecticide to control leafhoppers that spread bacteria.', 'priority': 'medium', 'category': 'disease_management'},
                ]
            },
            {
                'day': 4,
                'tasks': [
                    {'title': 'Second copper spray', 'description': 'Apply second copper spray if disease continues spreading.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Improve field drainage', 'description': 'Ensure proper drainage to prevent water stagnation.', 'priority': 'high', 'category': 'location_specific'},
                    {'title': 'Balanced fertilization', 'description': 'Apply balanced NPK. Avoid excessive nitrogen.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 5,
                'tasks': [
                    {'title': 'Assess crop response', 'description': 'Evaluate new growth. Check for disease-free new leaves.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Plan resistant varieties', 'description': 'Research bacterial blight-resistant varieties for next season.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Seed treatment plan', 'description': 'For next season: treat seeds with hot water or bactericide.', 'priority': 'low', 'category': 'disease_management'},
                ]
            },
            {
                'day': 6,
                'tasks': [
                    {'title': 'Final disease check', 'description': 'Count remaining infected leaves. Document disease progression.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Prepare preventive measures', 'description': 'Plan for next season: resistant varieties, clean seed, proper irrigation.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Fertilizer application', 'description': 'Apply balanced fertilizer if crop is in critical growth stage.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 7,
                'tasks': [
                    {'title': 'Weekly field assessment', 'description': 'Complete field inspection. Monitor for bacterial blight resurgence.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Weather forecast', 'description': 'Check forecast. Plan protective sprays if conditions favor disease.', 'priority': 'medium', 'category': 'weather_advisory'},
                    {'title': 'Maintain records', 'description': 'Document all observations and treatments.', 'priority': 'low', 'category': 'crop_maintenance'},
                ]
            }
        ]
    },
    
    # ========== COTTON DISEASES ==========
    
    # Cotton - Cotton Leaf Curl Virus
    {
        'crop': 'cotton',
        'disease': 'Curl virus (Cotton Leaf Curl Virus)',
        'location': 'Islamabad',
        'temperature_range': {'min': 25, 'max': 35},
        'day_plans': [
            {
                'day': 1,
                'tasks': [
                    {'title': 'Identify leaf curling symptoms', 'description': 'Check for upward curling leaves, vein thickening, and stunted growth.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Assess infection level', 'description': 'Count infected plants. CLCV spreads rapidly via whiteflies.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Check whitefly population', 'description': 'Monitor whitefly numbers. High population indicates high risk.', 'priority': 'high', 'category': 'disease_management'},
                ]
            },
            {
                'day': 2,
                'tasks': [
                    {'title': 'Remove infected plants immediately', 'description': 'Rogue and destroy all infected plants. No cure available.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Control whitefly vectors', 'description': 'Apply Confidor (Imidacloprid) at 200ml/acre to control whiteflies.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Install yellow sticky traps', 'description': 'Place yellow sticky traps at 10m intervals to monitor whiteflies.', 'priority': 'medium', 'category': 'disease_management'},
                ]
            },
            {
                'day': 3,
                'tasks': [
                    {'title': 'Monitor whitefly control', 'description': 'Check sticky traps and plant counts. Assess insecticide effectiveness.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Apply Actara if needed', 'description': 'If whiteflies persist, apply Actara (Thiamethoxam) at 150ml/acre.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Remove alternate hosts', 'description': 'Clear weeds and alternate hosts that harbor whiteflies and virus.', 'priority': 'high', 'category': 'location_specific'},
                ]
            },
            {
                'day': 4,
                'tasks': [
                    {'title': 'Field-wide inspection', 'description': 'Walk entire field. Identify and remove any newly infected plants.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Apply neem oil', 'description': 'Spray neem oil at 2% concentration as repellent for whiteflies.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Improve plant nutrition', 'description': 'Apply balanced fertilizer to strengthen remaining healthy plants.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 5,
                'tasks': [
                    {'title': 'Assess remaining crop health', 'description': 'Evaluate healthy plants. Check for new infections.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Plan resistant varieties', 'description': 'Research CLCV-resistant varieties for next season.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Soil health maintenance', 'description': 'Maintain optimal soil conditions for cotton growth.', 'priority': 'medium', 'category': 'location_specific'},
                ]
            },
            {
                'day': 6,
                'tasks': [
                    {'title': 'Final disease assessment', 'description': 'Count remaining infected plants. Document disease spread.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Prepare preventive plan', 'description': 'Plan for next season: resistant varieties, early whitefly control, clean seed.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Fertilizer application', 'description': 'Apply balanced NPK fertilizer to support healthy plant growth.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 7,
                'tasks': [
                    {'title': 'Weekly monitoring', 'description': 'Complete field inspection. Check for new CLCV infections.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Whitefly monitoring', 'description': 'Continue monitoring whitefly population. Maintain control measures.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Record keeping', 'description': 'Document all observations, removals, and control measures.', 'priority': 'low', 'category': 'crop_maintenance'},
                ]
            }
        ]
    },
    
    # Cotton - Fusarium Wilt
    {
        'crop': 'cotton',
        'disease': 'Fusarium wilt',
        'location': 'Islamabad',
        'temperature_range': {'min': 25, 'max': 32},
        'day_plans': [
            {
                'day': 1,
                'tasks': [
                    {'title': 'Identify wilting symptoms', 'description': 'Check for yellowing, wilting, and vascular discoloration in stems.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Assess infection level', 'description': 'Count wilting plants. Fusarium wilt is soil-borne and persistent.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Check soil conditions', 'description': 'Test soil pH and drainage. Fusarium thrives in poorly drained soils.', 'priority': 'medium', 'category': 'location_specific'},
                ]
            },
            {
                'day': 2,
                'tasks': [
                    {'title': 'Remove infected plants', 'description': 'Remove and destroy all wilting plants immediately.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Improve field drainage', 'description': 'Ensure proper drainage. Fusarium thrives in waterlogged conditions.', 'priority': 'high', 'category': 'location_specific'},
                    {'title': 'Apply Bavistin (seed treatment for next season)', 'description': 'Plan seed treatment with Bavistin (Carbendazim) for next crop.', 'priority': 'low', 'category': 'disease_management'},
                ]
            },
            {
                'day': 3,
                'tasks': [
                    {'title': 'Monitor for new infections', 'description': 'Check for newly wilting plants. Remove immediately.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Soil solarization planning', 'description': 'Plan soil solarization for next season to reduce Fusarium inoculum.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Improve plant nutrition', 'description': 'Apply balanced fertilizer to strengthen remaining healthy plants.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 4,
                'tasks': [
                    {'title': 'Field-wide inspection', 'description': 'Walk entire field. Identify all infected areas.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Mark infected areas', 'description': 'Mark areas with high infection for future crop rotation planning.', 'priority': 'medium', 'category': 'location_specific'},
                    {'title': 'Irrigation management', 'description': 'Avoid over-irrigation. Maintain optimal soil moisture.', 'priority': 'high', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 5,
                'tasks': [
                    {'title': 'Assess remaining crop', 'description': 'Evaluate healthy plants. Check for new wilting symptoms.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Plan crop rotation', 'description': 'Plan rotation away from cotton for 3-4 years in infected areas.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Research resistant varieties', 'description': 'Research Fusarium wilt-resistant cotton varieties.', 'priority': 'low', 'category': 'disease_management'},
                ]
            },
            {
                'day': 6,
                'tasks': [
                    {'title': 'Final disease assessment', 'description': 'Count remaining infected plants. Document disease spread.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Prepare soil management plan', 'description': 'Plan for next season: crop rotation, resistant varieties, soil solarization.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Fertilizer application', 'description': 'Apply balanced NPK fertilizer to support healthy plant growth.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 7,
                'tasks': [
                    {'title': 'Weekly monitoring', 'description': 'Complete field inspection. Check for new Fusarium wilt cases.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Soil health assessment', 'description': 'Evaluate soil conditions. Plan improvements for next season.', 'priority': 'medium', 'category': 'location_specific'},
                    {'title': 'Record keeping', 'description': 'Document all observations and management practices.', 'priority': 'low', 'category': 'crop_maintenance'},
                ]
            }
        ]
    },
    
    # Cotton - Powdery Mildew
    {
        'crop': 'cotton',
        'disease': 'Powdery mildew',
        'location': 'Islamabad',
        'temperature_range': {'min': 20, 'max': 28},
        'day_plans': [
            {
                'day': 1,
                'tasks': [
                    {'title': 'Identify white powdery patches', 'description': 'Check upper leaf surfaces for white powdery fungal growth.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Assess infection level', 'description': 'Estimate percentage of leaf area covered. >10% requires treatment.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Check humidity levels', 'description': 'Powdery mildew thrives in moderate humidity. Monitor conditions.', 'priority': 'medium', 'category': 'weather_advisory'},
                ]
            },
            {
                'day': 2,
                'tasks': [
                    {'title': 'Apply sulfur dust or Tilt', 'description': 'Apply sulfur dust at 2kg/acre or Tilt (Propiconazole) at 500ml/acre.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Improve plant spacing', 'description': 'Ensure proper spacing between plants to improve air circulation.', 'priority': 'medium', 'category': 'crop_maintenance'},
                    {'title': 'Remove affected leaves', 'description': 'Prune and remove severely infected lower leaves.', 'priority': 'low', 'category': 'disease_management'},
                ]
            },
            {
                'day': 3,
                'tasks': [
                    {'title': 'Monitor treatment progress', 'description': 'Check for new powdery growth. Existing growth should stop spreading.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Second application if needed', 'description': 'If mildew persists, apply second spray with Propiconazole.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Irrigation timing', 'description': 'Water early morning. Allow leaves to dry quickly.', 'priority': 'medium', 'category': 'weather_advisory'},
                ]
            },
            {
                'day': 4,
                'tasks': [
                    {'title': 'Field inspection', 'description': 'Walk field to identify disease hotspots and spread patterns.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Improve field ventilation', 'description': 'Remove excess vegetation to improve air flow.', 'priority': 'medium', 'category': 'crop_maintenance'},
                    {'title': 'Balanced fertilization', 'description': 'Apply balanced NPK. Avoid excessive nitrogen.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 5,
                'tasks': [
                    {'title': 'Assess crop response', 'description': 'Evaluate new leaf growth. Check for disease-free new leaves.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Plan resistant varieties', 'description': 'Research powdery mildew-resistant varieties for next season.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Soil health maintenance', 'description': 'Maintain optimal soil conditions for cotton growth.', 'priority': 'medium', 'category': 'location_specific'},
                ]
            },
            {
                'day': 6,
                'tasks': [
                    {'title': 'Final disease check', 'description': 'Count remaining powdery patches. Document treatment effectiveness.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Prepare preventive measures', 'description': 'Plan for next season: resistant varieties, proper spacing, balanced nutrition.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Fertilizer application', 'description': 'Apply balanced fertilizer if crop is in critical growth stage.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 7,
                'tasks': [
                    {'title': 'Weekly field assessment', 'description': 'Complete field walk. Monitor for mildew resurgence.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Weather forecast', 'description': 'Check forecast. Plan protective sprays if conditions favor mildew.', 'priority': 'medium', 'category': 'weather_advisory'},
                    {'title': 'Maintain records', 'description': 'Document all observations and treatments.', 'priority': 'low', 'category': 'crop_maintenance'},
                ]
            }
        ]
    },
    
    # Cotton - Target Spot
    {
        'crop': 'cotton',
        'disease': 'Target spot',
        'location': 'Islamabad',
        'temperature_range': {'min': 25, 'max': 30},
        'day_plans': [
            {
                'day': 1,
                'tasks': [
                    {'title': 'Identify circular spots with rings', 'description': 'Check leaves and bolls for circular spots with concentric rings.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Assess infection level', 'description': 'Count spots per leaf. >5 spots per leaf indicates severe infection.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Check crop debris', 'description': 'Target spot overwinters in crop debris. Check field cleanliness.', 'priority': 'medium', 'category': 'location_specific'},
                ]
            },
            {
                'day': 2,
                'tasks': [
                    {'title': 'Apply Tilt (Propiconazole) fungicide', 'description': 'Spray Tilt at 500ml/acre. Ensure thorough coverage.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Remove crop debris', 'description': 'Clear all crop residues and debris from field.', 'priority': 'high', 'category': 'location_specific'},
                    {'title': 'Improve air circulation', 'description': 'Ensure proper plant spacing to improve air flow.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 3,
                'tasks': [
                    {'title': 'Monitor treatment effectiveness', 'description': 'Check for new spot formation. Existing spots should stop expanding.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Apply Amistar Top if needed', 'description': 'If disease persists, apply Amistar Top at 400ml/acre.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Field inspection', 'description': 'Walk field to identify disease hotspots.', 'priority': 'high', 'category': 'disease_management'},
                ]
            },
            {
                'day': 4,
                'tasks': [
                    {'title': 'Remove severely infected leaves', 'description': 'Prune and remove leaves with >50% spot coverage.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Balanced fertilization', 'description': 'Apply balanced NPK fertilizer. Avoid excessive nitrogen.', 'priority': 'medium', 'category': 'crop_maintenance'},
                    {'title': 'Irrigation management', 'description': 'Avoid overhead irrigation. Use drip or flood irrigation.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 5,
                'tasks': [
                    {'title': 'Assess crop response', 'description': 'Evaluate new growth. Check for disease-free new leaves.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Plan crop rotation', 'description': 'Plan rotation away from cotton for next season in infected areas.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Soil health maintenance', 'description': 'Maintain optimal soil conditions for cotton growth.', 'priority': 'medium', 'category': 'location_specific'},
                ]
            },
            {
                'day': 6,
                'tasks': [
                    {'title': 'Final disease check', 'description': 'Count remaining spots. Document treatment effectiveness.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Prepare preventive plan', 'description': 'Plan for next season: crop rotation, debris removal, proper spacing.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Fertilizer application', 'description': 'Apply balanced fertilizer if crop is in critical growth stage.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 7,
                'tasks': [
                    {'title': 'Weekly field assessment', 'description': 'Complete field walk. Monitor for target spot resurgence.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Weather forecast', 'description': 'Check forecast. Plan protective sprays if conditions favor disease.', 'priority': 'medium', 'category': 'weather_advisory'},
                    {'title': 'Maintain records', 'description': 'Document all observations and treatments.', 'priority': 'low', 'category': 'crop_maintenance'},
                ]
            }
        ]
    },
]


def seed_schedules_if_needed():
    """Seed disease-specific schedules into database"""
    # Import here to avoid circular imports
    try:
        from ..db import SessionLocal
        from ..schemas.schedule import DiseaseSchedule
    except ImportError:
        try:
            from db import SessionLocal
            from schemas.schedule import DiseaseSchedule
        except ImportError:
            print("⚠️ DiseaseSchedule schema not found. Skipping schedule seeding.")
            return
    
    if not SessionLocal or not DiseaseSchedule:
        print("⚠️ DiseaseSchedule schema not available. Skipping schedule seeding.")
        return
    
    db = SessionLocal()
    try:
        seeded_count = 0
        for schedule_data in SEED_SCHEDULES:
            existing = db.query(DiseaseSchedule).filter(
                DiseaseSchedule.crop == schedule_data['crop'].lower(),
                DiseaseSchedule.disease == schedule_data['disease'],
                DiseaseSchedule.location == schedule_data['location']
            ).first()
            
            if existing:
                continue
            
            schedule = DiseaseSchedule(
                schedule_id=str(uuid.uuid4()),
                crop=schedule_data['crop'].lower(),
                disease=schedule_data['disease'],
                location=schedule_data['location'],
                temperature_min=schedule_data['temperature_range']['min'],
                temperature_max=schedule_data['temperature_range']['max'],
                day_plans=schedule_data['day_plans']
            )
            db.add(schedule)
            seeded_count += 1
        
        db.commit()
        print(f"✅ Seeded {seeded_count} disease schedules")
    except Exception as e:
        print(f"❌ Error seeding schedules: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

