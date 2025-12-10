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
# Islamabad Soil: Loamy soil with good drainage, moderate fertility, pH 7.0-8.0
# Each schedule considers: location (Islamabad), crop type, disease, and temperature ranges
SEED_SCHEDULES: List[Dict] = [
    # ========== WHEAT DISEASES - ISLAMABAD ==========
    
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
                    {'title': 'Check your wheat plants for tiny green bugs', 'description': 'Look under leaves for small green insects (aphids). Check if leaves are curling or sticky. Count how many you see on 10 plants.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Look for helpful insects', 'description': 'Count ladybird beetles (red/orange beetles) in your field. If you see many, do not spray yet - they eat aphids naturally.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Check if you need to water today', 'description': 'Put finger 2 inches deep in soil. If dry, water lightly. Islamabad loamy soil holds water well but check daily in 15-30°C weather.', 'priority': 'high', 'category': 'irrigation'},
                ]
            },
            {
                'day': 2,
                'tasks': [
                    {'title': 'Spray medicine if aphids are too many', 'description': 'If you counted more than 50 aphids on each plant, spray Confidor medicine (200ml per acre). Mix with water as written on bottle. Spray early morning or evening.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Remove weeds that attract aphids', 'description': 'Pull out grass weeds around your field. These weeds give home to aphids. Clean weeds help reduce aphid problems.', 'priority': 'medium', 'category': 'location_specific'},
                    {'title': 'Water your wheat if soil is dry', 'description': 'Check soil moisture. In Islamabad weather (15-30°C), water every 2-3 days. Do not let plants get thirsty - stressed plants attract more aphids.', 'priority': 'high', 'category': 'irrigation'},
                ]
            },
            {
                'day': 3,
                'tasks': [
                    {'title': 'Check if your spray worked', 'description': 'Look at the plants you sprayed yesterday. Count dead aphids. Check if ladybird beetles are still alive (good sign). If aphids still many, prepare for second spray.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Give balanced food to plants', 'description': 'Apply NPK fertilizer (not too much nitrogen). Too much nitrogen makes aphids multiply faster. Use balanced fertilizer for Islamabad loamy soil.', 'priority': 'medium', 'category': 'crop_maintenance'},
                    {'title': 'Water plants if temperature is high', 'description': 'If temperature above 25°C, water in evening. Islamabad soil drains well, so water slowly and deeply. Check soil moisture with finger test.', 'priority': 'medium', 'category': 'irrigation'},
                ]
            },
            {
                'day': 4,
                'tasks': [
                    {'title': 'Second spray if aphids still there', 'description': 'If aphids are still many, use different medicine - Karate (150ml per acre). Change medicine to avoid resistance. Spray when no wind.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Plant flowers to attract helpful insects', 'description': 'Plant marigold or mustard flowers around field borders. These attract ladybird beetles that eat aphids naturally.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Check soil moisture in Islamabad heat', 'description': 'Islamabad loamy soil needs regular water. Put stick 6 inches deep - if dry, water slowly. Good drainage means you can water without worry of waterlogging.', 'priority': 'medium', 'category': 'irrigation'},
                ]
            },
            {
                'day': 5,
                'tasks': [
                    {'title': 'Count aphids to see if treatment worked', 'description': 'Count aphids on 10 plants again. Good result: less than 10 aphids per plant. If still too many, plan another treatment.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Check for black mold on leaves', 'description': 'Look for black sticky stuff on leaves (sooty mold from aphid honeydew). Clean affected leaves. Check for other small insects.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Water based on weather and soil check', 'description': 'If temperature 20-25°C, water every 3 days. If above 25°C, water every 2 days. Islamabad soil holds moisture well but check daily.', 'priority': 'medium', 'category': 'irrigation'},
                ]
            },
            {
                'day': 6,
                'tasks': [
                    {'title': 'Write down what you did', 'description': 'Keep record: how many aphids you found, what medicine you used, how plants responded. This helps for next season planning.', 'priority': 'low', 'category': 'crop_maintenance'},
                    {'title': 'Plan for next season', 'description': 'For next year: buy wheat varieties that resist aphids, plant early, keep beneficial insects. Prevention is better than cure.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Give second dose of fertilizer', 'description': 'If wheat is making new shoots (tillering stage), give second fertilizer dose. Use balanced NPK suitable for Islamabad alkaline soil.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 7,
                'tasks': [
                    {'title': 'Walk through entire field', 'description': 'Check all parts of field for aphids coming back. Look for new colonies. Early detection helps quick treatment.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Plan next week based on weather', 'description': 'Check weather forecast. Plan watering and fertilizer for next week. Prepare for any weather changes.', 'priority': 'medium', 'category': 'weather_advisory'},
                    {'title': 'Clean field borders', 'description': 'Remove crop leftover and weeds from field edges. Clean field reduces pest hiding places. Keep field neat and tidy.', 'priority': 'low', 'category': 'location_specific'},
                ]
            }
        ]
    },

    # Wheat - Mite
    {
        'crop': 'wheat',
        'disease': 'Mite',
        'location': 'Islamabad',
        'temperature_range': {'min': 20, 'max': 35},
        'day_plans': [
            {
                'day': 1,
                'tasks': [
                    {'title': 'Look for tiny yellow spots on leaves', 'description': 'Check wheat leaves for small yellow dots (mite damage). Use magnifying glass if available. Mites are very tiny spider-like insects.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Check if plants are getting enough water', 'description': 'Mites love dry conditions. Check soil moisture - if dry, water immediately. Stressed plants attract more mites.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Remove weeds that host mites', 'description': 'Pull out weeds around field, especially grasses. These give home to mites before they attack wheat.', 'priority': 'medium', 'category': 'location_specific'},
                ]
            },
            {
                'day': 2,
                'tasks': [
                    {'title': 'Spray mite-killing medicine if needed', 'description': 'If leaves have many yellow spots, spray Abamectin medicine. Follow bottle instructions. Spray in evening when temperature is cooler.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Water plants well to reduce stress', 'description': 'Water deeply in morning or evening. Islamabad hot weather (20-35°C) makes plants thirsty. Well-watered plants resist mites better.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Check for predatory mites', 'description': 'Look for slightly bigger mites that move fast - these eat bad mites. If you see them, avoid spraying broad chemicals.', 'priority': 'medium', 'category': 'disease_management'},
                ]
            },
            {
                'day': 3,
                'tasks': [
                    {'title': 'Check if spray worked on mites', 'description': 'Look at sprayed plants. Yellow spots should not increase. Check if mites are dead (use magnifying glass if available).', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Increase watering in hot weather', 'description': 'If temperature above 30°C, water twice daily (morning and evening). Islamabad loamy soil drains well, so regular watering is safe.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Apply mulch to keep soil moist', 'description': 'Put wheat straw or grass around plants to keep soil cool and moist. This reduces water loss and mite problems.', 'priority': 'medium', 'category': 'location_specific'},
                ]
            },
            {
                'day': 4,
                'tasks': [
                    {'title': 'Second treatment if mites persist', 'description': 'If yellow spots still increasing, use different mite medicine (rotate chemicals). Spray in evening when cooler.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Check soil moisture twice daily', 'description': 'In hot Islamabad weather, check soil morning and evening. Water when top 2 inches are dry. Consistent moisture prevents mite outbreaks.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Create shade if possible', 'description': 'If very hot (above 32°C), create temporary shade with cloth or branches. Cooler plants resist mites better.', 'priority': 'low', 'category': 'weather_advisory'},
                ]
            },
            {
                'day': 5,
                'tasks': [
                    {'title': 'Count mite damage on leaves', 'description': 'Check 20 leaves randomly. Count yellow spots. Good control: no new spots appearing. Bad control: spots increasing.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Adjust watering based on temperature', 'description': 'Hot day (above 30°C): water twice. Moderate day (25-30°C): water once. Cool day (below 25°C): check soil first.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Remove badly damaged leaves', 'description': 'Cut off leaves with too many yellow spots. This reduces mite population and helps plant focus energy on healthy growth.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 6,
                'tasks': [
                    {'title': 'Record mite treatment results', 'description': 'Write down: what medicine used, how much damage reduced, weather conditions. This helps plan future treatments.', 'priority': 'low', 'category': 'crop_maintenance'},
                    {'title': 'Plan irrigation schedule for next week', 'description': 'Based on weather forecast, plan watering times. Hot weather needs more frequent watering to prevent mite problems.', 'priority': 'medium', 'category': 'irrigation'},
                    {'title': 'Apply fertilizer to strengthen plants', 'description': 'Give balanced NPK fertilizer. Strong plants resist mites better. Use fertilizer suitable for Islamabad alkaline soil.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 7,
                'tasks': [
                    {'title': 'Final check for mite control', 'description': 'Walk through field checking all plants. Look for new yellow spots or mite activity. Early detection prevents big problems.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Prepare for next week watering', 'description': 'Check irrigation system. Clean blocked pipes or sprinklers. Ensure good water supply for consistent moisture.', 'priority': 'medium', 'category': 'irrigation'},
                    {'title': 'Maintain field cleanliness', 'description': 'Remove weeds and crop debris. Clean field reduces mite hiding places and breeding sites.', 'priority': 'low', 'category': 'location_specific'},
                ]
            }
        ]
    },

    # Wheat - Black Rust (Stem rust)
    {
        'crop': 'wheat',
        'disease': 'Black Rust (Stem rust)',
        'location': 'Islamabad',
        'temperature_range': {'min': 18, 'max': 28},
        'day_plans': [
            {
                'day': 1,
                'tasks': [
                    {'title': 'Look for reddish-brown spots on stems', 'description': 'Check wheat stems and leaves for reddish-brown pustules (rust spots). These spread quickly in cool, moist weather.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Check if morning dew stays long', 'description': 'Rust loves moisture. If dew stays on plants till 9 AM, reduce watering frequency. Water early morning so plants dry quickly.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Remove volunteer wheat plants', 'description': 'Pull out any wild wheat growing around field. These carry rust disease and spread it to your crop.', 'priority': 'medium', 'category': 'location_specific'},
                ]
            },
            {
                'day': 2,
                'tasks': [
                    {'title': 'Spray fungicide immediately if rust found', 'description': 'If you see rust spots, spray Tilt (Propiconazole) medicine immediately. Mix as per bottle instructions. Spray when no dew on plants.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Water early morning only', 'description': 'Water at 6-7 AM so plants dry by 9 AM. Wet plants in evening help rust spread. Islamabad morning sun helps dry plants quickly.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Improve air circulation', 'description': 'Remove weeds between rows to improve air flow. Good air movement helps plants dry faster and reduces rust spread.', 'priority': 'medium', 'category': 'location_specific'},
                ]
            },
            {
                'day': 3,
                'tasks': [
                    {'title': 'Check if rust spots are spreading', 'description': 'Look at plants you sprayed. Rust spots should not be increasing. If still spreading, prepare for second spray with different medicine.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Reduce watering frequency', 'description': 'Water every 3-4 days instead of daily. Let soil surface dry between watering. This reduces humidity that rust needs to spread.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Apply potassium fertilizer', 'description': 'Give potassium-rich fertilizer to strengthen plant immunity. Strong plants resist rust better. Avoid too much nitrogen.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 4,
                'tasks': [
                    {'title': 'Second fungicide spray if needed', 'description': 'If rust still spreading, use different fungicide (rotate chemicals). Spray Amistar or other rust medicine. Follow label instructions.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Check soil moisture before watering', 'description': 'Put finger 3 inches deep in soil. Water only if dry. Islamabad loamy soil holds moisture well - avoid overwatering.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Remove infected plant parts', 'description': 'Cut off stems and leaves with many rust spots. Burn or bury these parts away from field. Do not compost infected material.', 'priority': 'medium', 'category': 'disease_management'},
                ]
            },
            {
                'day': 5,
                'tasks': [
                    {'title': 'Monitor rust control progress', 'description': 'Check 20 plants randomly. Count rust spots. Good control: no new spots. Poor control: spots still increasing.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Water based on weather conditions', 'description': 'Cloudy/humid day: do not water. Sunny/dry day: water early morning. Check weather forecast to plan watering.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Apply balanced nutrition', 'description': 'Give balanced NPK fertilizer. Avoid excess nitrogen which makes plants soft and rust-prone. Use fertilizer for alkaline Islamabad soil.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 6,
                'tasks': [
                    {'title': 'Document rust treatment results', 'description': 'Record: rust severity, medicines used, weather conditions, treatment success. This helps plan future rust management.', 'priority': 'low', 'category': 'crop_maintenance'},
                    {'title': 'Plan resistant varieties for next season', 'description': 'Ask agriculture officer about rust-resistant wheat varieties for Islamabad. Prevention is better than treatment.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Check irrigation system efficiency', 'description': 'Ensure sprinklers or pipes give even water distribution. Uneven watering creates wet spots where rust thrives.', 'priority': 'medium', 'category': 'irrigation'},
                ]
            },
            {
                'day': 7,
                'tasks': [
                    {'title': 'Final rust assessment', 'description': 'Walk through entire field checking rust control. Look for new infections. Plan next week treatment if needed.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Adjust watering schedule for next week', 'description': 'Based on weather forecast and rust status, plan watering frequency. Dry weather: water more. Humid weather: water less.', 'priority': 'medium', 'category': 'irrigation'},
                    {'title': 'Field sanitation', 'description': 'Remove all crop debris and weeds. Clean field reduces rust spores and prevents disease carryover to next season.', 'priority': 'low', 'category': 'location_specific'},
                ]
            }
        ]
    },

    # Wheat - Brown Rust (Leaf rust)
    {
        'crop': 'wheat',
        'disease': 'Brown Rust (Leaf rust)',
        'location': 'Islamabad',
        'temperature_range': {'min': 15, 'max': 25},
        'day_plans': [
            {
                'day': 1,
                'tasks': [
                    {'title': 'Check leaves for orange-brown spots', 'description': 'Look for small orange-brown pustules on wheat leaves. These are leaf rust spores. Check both upper and lower leaf surfaces.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Avoid evening watering', 'description': 'Do not water in evening. Wet leaves overnight help rust spread. Water early morning (6-7 AM) so leaves dry quickly in Islamabad sun.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Remove volunteer wheat around field', 'description': 'Pull out wild wheat plants growing near your field. These carry rust and spread it to healthy plants.', 'priority': 'medium', 'category': 'location_specific'},
                ]
            },
            {
                'day': 2,
                'tasks': [
                    {'title': 'Spray rust fungicide at first sign', 'description': 'If you see orange spots, spray Tilt fungicide immediately. Early treatment works best. Spray when leaves are dry, no wind.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Water at soil level, not on leaves', 'description': 'Use drip irrigation or water at base of plants. Avoid wetting leaves. Wet leaves help rust spores germinate and spread.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Increase plant spacing if possible', 'description': 'Remove some plants to improve air circulation. Better air flow helps leaves dry faster and reduces rust spread.', 'priority': 'medium', 'category': 'location_specific'},
                ]
            },
            {
                'day': 3,
                'tasks': [
                    {'title': 'Monitor spray effectiveness', 'description': 'Check sprayed plants for new rust spots. Good treatment: no new orange spots. Poor treatment: spots still appearing.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Reduce watering frequency', 'description': 'Water every 2-3 days instead of daily. Let soil surface dry between watering. This reduces humidity that rust needs.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Apply balanced fertilizer', 'description': 'Give balanced NPK fertilizer. Avoid too much nitrogen which makes plants soft and rust-prone. Use fertilizer for Islamabad alkaline soil.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 4,
                'tasks': [
                    {'title': 'Second spray if rust persists', 'description': 'If orange spots still increasing, use different fungicide (Amistar). Rotate chemicals to avoid resistance. Spray in dry conditions.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Check soil moisture before watering', 'description': 'Test soil with finger or stick. Water only when top 2 inches are dry. Islamabad loamy soil retains moisture well.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Remove infected leaves', 'description': 'Pick off leaves with many rust spots. Dispose away from field (burn or bury). This reduces spore source for new infections.', 'priority': 'medium', 'category': 'disease_management'},
                ]
            },
            {
                'day': 5,
                'tasks': [
                    {'title': 'Count rust spots to assess control', 'description': 'Check 20 leaves randomly. Count orange spots per leaf. Good control: less than 5 spots per leaf. Poor control: more than 10 spots.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Adjust watering based on weather', 'description': 'Sunny day: water early morning. Cloudy/humid day: skip watering. Check weather forecast to plan irrigation schedule.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Apply potassium to boost immunity', 'description': 'Give potassium-rich fertilizer to strengthen plant disease resistance. Strong plants fight rust better.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 6,
                'tasks': [
                    {'title': 'Record treatment outcomes', 'description': 'Write down: rust severity, fungicides used, weather during treatment, success rate. Keep records for future reference.', 'priority': 'low', 'category': 'crop_maintenance'},
                    {'title': 'Plan next season rust prevention', 'description': 'Ask about rust-resistant wheat varieties for Islamabad climate. Choose varieties suitable for local conditions.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Optimize irrigation system', 'description': 'Check if irrigation system can water at soil level without wetting leaves. Consider drip irrigation for rust-prone areas.', 'priority': 'medium', 'category': 'irrigation'},
                ]
            },
            {
                'day': 7,
                'tasks': [
                    {'title': 'Final rust evaluation', 'description': 'Walk through entire field checking rust control success. Look for any new infection spots. Plan next week actions.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Set watering schedule for next week', 'description': 'Based on weather forecast and rust status, plan irrigation frequency. Maintain balance: enough water but not too much humidity.', 'priority': 'medium', 'category': 'irrigation'},
                    {'title': 'Clean field of debris', 'description': 'Remove fallen leaves and crop residues. Clean field reduces rust spores and prevents disease buildup.', 'priority': 'low', 'category': 'location_specific'},
                ]
            }
        ]
    },

    # Wheat - Yellow Rust (Stripe rust)
    {
        'crop': 'wheat',
        'disease': 'Yellow Rust (Stripe rust)',
        'location': 'Islamabad',
        'temperature_range': {'min': 10, 'max': 20},
        'day_plans': [
            {
                'day': 1,
                'tasks': [
                    {'title': 'Look for yellow stripes on leaves', 'description': 'Check wheat leaves for yellow stripes running along leaf length. These are yellow rust pustules. Most common in cool weather.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Stop late evening watering', 'description': 'Do not water after 4 PM. Cool nights with wet plants help yellow rust spread rapidly. Water early morning only.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Check for cool, moist conditions', 'description': 'Yellow rust loves cool weather (10-20°C). If weather is cool and humid, be extra careful with watering and plant spacing.', 'priority': 'medium', 'category': 'weather_advisory'},
                ]
            },
            {
                'day': 2,
                'tasks': [
                    {'title': 'Spray fungicide immediately', 'description': 'Yellow rust spreads very fast. Spray Tilt or Amistar Top fungicide as soon as you see yellow stripes. Do not delay treatment.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Water only in early morning', 'description': 'Water at 6-7 AM so plants dry before evening. Islamabad morning sun helps dry plants quickly. Avoid any evening moisture.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Improve field drainage', 'description': 'Check if water stands anywhere in field. Make small channels to drain excess water. Standing water increases humidity and rust spread.', 'priority': 'medium', 'category': 'location_specific'},
                ]
            },
            {
                'day': 3,
                'tasks': [
                    {'title': 'Check if yellow stripes are spreading', 'description': 'Look at treated plants. Yellow stripes should not be increasing. If still spreading rapidly, prepare for emergency second spray.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Reduce watering frequency significantly', 'description': 'Water every 4-5 days only. Let soil dry well between watering. Yellow rust needs moisture - deny it by keeping field drier.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Remove infected plant parts', 'description': 'Cut off leaves with yellow stripes. Burn or bury these parts immediately. Do not leave infected material in or near field.', 'priority': 'medium', 'category': 'disease_management'},
                ]
            },
            {
                'day': 4,
                'tasks': [
                    {'title': 'Emergency second spray if needed', 'description': 'If yellow stripes still spreading, spray different fungicide immediately. Use Propiconazole or Azoxystrobin. Yellow rust can destroy crop quickly.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Check soil moisture carefully', 'description': 'Water only if soil is very dry (finger test 4 inches deep). In cool weather, plants need less water. Overwatering helps rust spread.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Create better air circulation', 'description': 'Remove weeds and thin out dense plant areas. Better air flow helps plants dry faster and reduces rust-friendly conditions.', 'priority': 'medium', 'category': 'location_specific'},
                ]
            },
            {
                'day': 5,
                'tasks': [
                    {'title': 'Assess yellow rust control', 'description': 'Check 30 plants randomly. Count yellow stripes. Good control: no new stripes. Emergency: stripes still increasing rapidly.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Minimal watering in cool weather', 'description': 'If temperature below 15°C, water very carefully. Cool + wet = perfect for yellow rust. Check weather forecast before watering.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Apply phosphorus and potassium', 'description': 'Give PK fertilizer (no nitrogen). Nitrogen makes plants soft and rust-prone. Strong plants with PK resist rust better.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 6,
                'tasks': [
                    {'title': 'Document yellow rust outbreak', 'description': 'Record: when first seen, weather conditions, treatments used, success rate. Yellow rust data helps plan future prevention.', 'priority': 'low', 'category': 'crop_maintenance'},
                    {'title': 'Plan resistant varieties for next year', 'description': 'Ask agriculture department about yellow rust-resistant wheat varieties for Islamabad. Some varieties resist this disease well.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Check irrigation timing', 'description': 'Review watering schedule. Plan to water only when necessary and only in early morning. Avoid any evening moisture.', 'priority': 'medium', 'category': 'irrigation'},
                ]
            },
            {
                'day': 7,
                'tasks': [
                    {'title': 'Final yellow rust check', 'description': 'Inspect entire field for yellow rust control. Look for any new infection areas. Yellow rust can restart quickly in cool weather.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Plan next week watering strategy', 'description': 'Check weather forecast. If cool weather continues, plan minimal watering. If warming up, can increase watering slightly.', 'priority': 'medium', 'category': 'irrigation'},
                    {'title': 'Field sanitation for rust control', 'description': 'Remove all infected plant debris. Clean field borders. Yellow rust spores can survive and restart infection.', 'priority': 'medium', 'category': 'location_specific'},
                ]
            }
        ]
    },

    # Wheat - Powdery Mildew
    {
        'crop': 'wheat',
        'disease': 'Powdery mildew',
        'location': 'Islamabad',
        'temperature_range': {'min': 16, 'max': 22},
        'day_plans': [
            {
                'day': 1,
                'tasks': [
                    {'title': 'Look for white powder on leaves', 'description': 'Check wheat leaves for white powdery coating, especially on upper leaf surface. This looks like flour dust on leaves.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Avoid overhead watering', 'description': 'Do not spray water on leaves. Water at soil level only. Wet leaves help powdery mildew spread in cool, humid conditions.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Check plant spacing', 'description': 'Look for crowded areas in field. Dense planting creates humid conditions that powdery mildew loves. Plan to thin out dense areas.', 'priority': 'medium', 'category': 'location_specific'},
                ]
            },
            {
                'day': 2,
                'tasks': [
                    {'title': 'Apply sulfur dust or spray', 'description': 'Dust sulfur powder on affected plants or spray sulfur solution. Sulfur is cheap and effective against powdery mildew. Apply in dry conditions.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Water early morning at soil level', 'description': 'Water at 6-7 AM directly at plant base. Avoid wetting leaves. Islamabad morning sun helps any accidental leaf moisture dry quickly.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Improve air circulation', 'description': 'Remove weeds between rows. Thin out overcrowded plants. Better air flow reduces humidity and helps control powdery mildew.', 'priority': 'medium', 'category': 'location_specific'},
                ]
            },
            {
                'day': 3,
                'tasks': [
                    {'title': 'Check sulfur treatment effectiveness', 'description': 'Look at treated plants. White powder should be reducing. If still spreading, prepare for fungicide spray as backup treatment.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Reduce watering frequency', 'description': 'Water every 3-4 days instead of daily. Powdery mildew likes humid conditions. Drier field helps control the disease.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Remove infected leaves', 'description': 'Pick off leaves with heavy white coating. Dispose away from field. This reduces spore source for new infections.', 'priority': 'medium', 'category': 'disease_management'},
                ]
            },
            {
                'day': 4,
                'tasks': [
                    {'title': 'Fungicide spray if sulfur not enough', 'description': 'If white powder still spreading, spray Tilt fungicide. Some powdery mildew strains resist sulfur. Use fungicide as second option.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Check soil moisture before watering', 'description': 'Test soil dryness with finger. Water only when top 3 inches are dry. Islamabad loamy soil holds moisture - avoid overwatering.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Create better field ventilation', 'description': 'Cut back any tall weeds or plants blocking wind flow. Good air movement helps leaves stay dry and reduces mildew spread.', 'priority': 'medium', 'category': 'location_specific'},
                ]
            },
            {
                'day': 5,
                'tasks': [
                    {'title': 'Assess powdery mildew control', 'description': 'Check 20 plants randomly. Count leaves with white powder. Good control: no new white coating. Poor control: powder still spreading.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Adjust watering based on humidity', 'description': 'Humid day: skip watering. Dry day: water at soil level only. Check weather - avoid watering before humid nights.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Apply balanced nutrition', 'description': 'Give balanced NPK fertilizer. Avoid excess nitrogen which makes plants soft and mildew-prone. Use fertilizer for Islamabad alkaline soil.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 6,
                'tasks': [
                    {'title': 'Record mildew treatment results', 'description': 'Write down: sulfur effectiveness, fungicide used, weather conditions, treatment success. This helps plan future mildew control.', 'priority': 'low', 'category': 'crop_maintenance'},
                    {'title': 'Plan resistant varieties for next season', 'description': 'Ask about powdery mildew-resistant wheat varieties for Islamabad climate. Prevention through resistant varieties is best.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Optimize irrigation method', 'description': 'Consider drip irrigation or furrow irrigation to avoid wetting leaves. Leaf-wetting irrigation helps powdery mildew spread.', 'priority': 'medium', 'category': 'irrigation'},
                ]
            },
            {
                'day': 7,
                'tasks': [
                    {'title': 'Final powdery mildew assessment', 'description': 'Walk through field checking mildew control. Look for any new white coating on leaves. Plan next week treatment if needed.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Plan next week irrigation strategy', 'description': 'Based on weather forecast, plan watering schedule. Humid weather: reduce watering. Dry weather: water at soil level only.', 'priority': 'medium', 'category': 'irrigation'},
                    {'title': 'Maintain field cleanliness', 'description': 'Remove crop debris and maintain good field hygiene. Clean field reduces mildew spores and prevents disease buildup.', 'priority': 'low', 'category': 'location_specific'},
                ]
            }
        ]
    },

    # Continue with more wheat diseases...
    # I'll add a few more key diseases to complete the wheat collection

    # Wheat - Fusarium Head Blight (Scab)
    {
        'crop': 'wheat',
        'disease': 'Fusarium Head Blight (Scab)',
        'location': 'Islamabad',
        'temperature_range': {'min': 20, 'max': 30},
        'day_plans': [
            {
                'day': 1,
                'tasks': [
                    {'title': 'Check wheat heads for bleached spikelets', 'description': 'Look at wheat heads (spikes) for white/bleached areas. These are signs of head blight. Also look for pink fungal growth.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Avoid watering during flowering', 'description': 'If wheat is flowering, avoid watering for 2-3 days. Wet conditions during flowering help head blight infection. Let plants be dry.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Remove corn/maize residues nearby', 'description': 'Head blight fungus lives on corn residues. Remove any corn stalks or debris near wheat field. This reduces infection source.', 'priority': 'medium', 'category': 'location_specific'},
                ]
            },
            {
                'day': 2,
                'tasks': [
                    {'title': 'Spray fungicide at early flowering', 'description': 'If wheat just started flowering, spray Amistar Top or Tebuconazole fungicide. Early treatment during flowering is most effective.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Water only if soil very dry', 'description': 'Check soil moisture 4 inches deep. Water only if very dry. During flowering period, keep field drier to prevent head blight.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Improve field drainage', 'description': 'Make sure no water stands in field. Create drainage channels if needed. Standing water increases humidity and head blight risk.', 'priority': 'medium', 'category': 'location_specific'},
                ]
            },
            {
                'day': 3,
                'tasks': [
                    {'title': 'Monitor for pink fungal growth', 'description': 'Check wheat heads for pink/orange fungal growth. This indicates active head blight infection. Mark infected areas for close monitoring.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Minimal watering during grain filling', 'description': 'If grains are forming, water very carefully. Too much moisture during grain filling increases mycotoxin production in infected heads.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Remove infected wheat heads', 'description': 'Cut off wheat heads with bleached areas or pink growth. Burn or bury these infected heads away from field immediately.', 'priority': 'medium', 'category': 'disease_management'},
                ]
            },
            {
                'day': 4,
                'tasks': [
                    {'title': 'Second fungicide spray if needed', 'description': 'If infection is spreading, apply second fungicide spray. Use different chemical (rotate). Focus on newly opened flowers.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Check soil moisture carefully', 'description': 'Test soil before watering. In Islamabad heat (20-30°C), plants need water but avoid excess during grain development.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Plan early harvest if severe', 'description': 'If many heads infected, plan to harvest early to reduce mycotoxin buildup. Consult agriculture officer about harvest timing.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 5,
                'tasks': [
                    {'title': 'Assess head blight severity', 'description': 'Check 50 wheat heads randomly. Count how many have bleached areas. Severe infection: more than 20% heads affected.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Reduce watering as harvest approaches', 'description': 'As grain matures, reduce watering frequency. Drier conditions before harvest reduce mycotoxin levels in grain.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Test grain for mycotoxins', 'description': 'If head blight was severe, get grain tested for mycotoxins before selling or consuming. Contaminated grain is dangerous.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 6,
                'tasks': [
                    {'title': 'Document head blight outbreak', 'description': 'Record: infection severity, weather during flowering, treatments used. This helps plan prevention for next season.', 'priority': 'low', 'category': 'crop_maintenance'},
                    {'title': 'Plan crop rotation', 'description': 'Plan to rotate away from wheat next season. Grow rice or cotton to break head blight disease cycle. Avoid corn after wheat.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Prepare for harvest', 'description': 'Check harvesting equipment. Plan to harvest infected areas separately from healthy areas to avoid contamination.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 7,
                'tasks': [
                    {'title': 'Final head blight evaluation', 'description': 'Assess overall crop damage from head blight. Decide which areas to harvest first and which grain to test for safety.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Stop irrigation before harvest', 'description': 'Stop watering 1-2 weeks before harvest. This helps grain dry properly and reduces mycotoxin risk in infected grain.', 'priority': 'medium', 'category': 'irrigation'},
                    {'title': 'Clean field of infected debris', 'description': 'Remove and burn all infected plant material. Do not leave infected residues in field as they carry disease to next crop.', 'priority': 'medium', 'category': 'location_specific'},
                ]
            }
        ]
    },

    # Wheat - Leaf Blight (Spot blotch)
    {
        'crop': 'wheat',
        'disease': 'Leaf Blight (Spot blotch)',
        'location': 'Islamabad',
        'temperature_range': {'min': 20, 'max': 28},
        'day_plans': [
            {
                'day': 1,
                'tasks': [
                    {'title': 'Look for dark brown spots on leaves', 'description': 'Check wheat leaves for dark brown oval spots. These spots may join together to form larger blighted areas on leaves.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Avoid overhead irrigation', 'description': 'Do not spray water on leaves. Water at soil level to keep leaves dry. Wet leaves help spot blotch spread rapidly.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Check for high humidity conditions', 'description': 'Spot blotch spreads fast in warm, humid weather. If humidity is high, be extra careful with watering and plant spacing.', 'priority': 'medium', 'category': 'weather_advisory'},
                ]
            },
            {
                'day': 2,
                'tasks': [
                    {'title': 'Spray fungicide at first spots', 'description': 'As soon as you see brown spots, spray Bavistin (Carbendazim) or Tilt fungicide. Early treatment prevents rapid spread.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Water early morning only', 'description': 'Water at 6-7 AM so leaves dry quickly in Islamabad sun. Avoid any evening watering that keeps leaves wet overnight.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Improve air circulation in field', 'description': 'Remove weeds between rows. Thin overcrowded areas. Better air flow helps leaves dry faster and reduces disease spread.', 'priority': 'medium', 'category': 'location_specific'},
                ]
            },
            {
                'day': 3,
                'tasks': [
                    {'title': 'Monitor spot spread on leaves', 'description': 'Check treated plants. Brown spots should not be increasing in size or number. If still spreading, prepare for second treatment.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Reduce watering frequency', 'description': 'Water every 2-3 days instead of daily. Let soil surface dry between watering. This reduces leaf wetness and disease spread.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Apply balanced fertilizer', 'description': 'Give balanced NPK fertilizer. Avoid excess nitrogen which makes plants soft and disease-prone. Strong plants resist spot blotch better.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 4,
                'tasks': [
                    {'title': 'Second fungicide if spots spreading', 'description': 'If brown spots still increasing, spray different fungicide (Dithane or Propiconazole). Rotate chemicals to avoid resistance.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Check soil moisture before watering', 'description': 'Test soil with finger 3 inches deep. Water only when dry. Islamabad loamy soil holds moisture well - avoid overwatering.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Remove badly infected leaves', 'description': 'Cut off leaves with many brown spots. Dispose away from field (burn or bury). This reduces spore source for new infections.', 'priority': 'medium', 'category': 'disease_management'},
                ]
            },
            {
                'day': 5,
                'tasks': [
                    {'title': 'Count spots to assess control', 'description': 'Check 20 leaves randomly. Count brown spots per leaf. Good control: no new spots. Poor control: spots still increasing.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Adjust watering based on weather', 'description': 'Hot sunny day: water early morning. Humid cloudy day: skip watering. Check weather forecast before watering.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Apply potassium for plant strength', 'description': 'Give potassium-rich fertilizer to boost plant immunity. Strong plants with good potassium resist leaf blight better.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 6,
                'tasks': [
                    {'title': 'Record leaf blight treatment', 'description': 'Write down: spot severity, fungicides used, weather conditions, treatment success. This helps plan future blight management.', 'priority': 'low', 'category': 'crop_maintenance'},
                    {'title': 'Plan tolerant varieties for next season', 'description': 'Ask agriculture officer about spot blotch-tolerant wheat varieties for Islamabad. Some varieties resist this disease better.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Check irrigation system efficiency', 'description': 'Ensure irrigation system waters at soil level without wetting leaves. Consider drip irrigation for disease-prone areas.', 'priority': 'medium', 'category': 'irrigation'},
                ]
            },
            {
                'day': 7,
                'tasks': [
                    {'title': 'Final leaf blight assessment', 'description': 'Walk through entire field checking blight control. Look for any new brown spots on leaves. Plan next week treatment if needed.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Plan next week watering schedule', 'description': 'Based on weather forecast and disease status, plan irrigation frequency. Balance plant water needs with disease prevention.', 'priority': 'medium', 'category': 'irrigation'},
                    {'title': 'Field sanitation for disease control', 'description': 'Remove infected plant debris and maintain field cleanliness. Clean field reduces disease spores and prevents buildup.', 'priority': 'low', 'category': 'location_specific'},
                ]
            }
        ]
    },

    # Wheat - Stem fly
    {
        'crop': 'wheat',
        'disease': 'Stem fly',
        'location': 'Islamabad',
        'temperature_range': {'min': 18, 'max': 25},
        'day_plans': [
            {
                'day': 1,
                'tasks': [
                    {'title': 'Look for white empty wheat heads', 'description': 'Check wheat heads for white/empty heads with no grains. This is sign of stem fly damage inside the stem.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Check for dead tillers', 'description': 'Look for wheat shoots that are dead or dying. Stem fly larvae eat inside stems causing tillers to die.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Water normally but check soil', 'description': 'Stem fly damage is already done inside plant. Water normally based on soil moisture. Check finger test 2 inches deep.', 'priority': 'medium', 'category': 'irrigation'},
                ]
            },
            {
                'day': 2,
                'tasks': [
                    {'title': 'Remove volunteer wheat plants', 'description': 'Pull out any wild wheat growing around field. These give home to stem fly for next season. Clean them now.', 'priority': 'high', 'category': 'location_specific'},
                    {'title': 'Cut and remove dead tillers', 'description': 'Cut off dead wheat shoots and remove from field. Burn or bury them. This reduces stem fly population for next season.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Water healthy plants well', 'description': 'Give good water to healthy plants so they can compensate for damaged tillers. Water early morning in Islamabad heat.', 'priority': 'medium', 'category': 'irrigation'},
                ]
            },
            {
                'day': 3,
                'tasks': [
                    {'title': 'Count damaged vs healthy tillers', 'description': 'Count how many tillers are damaged vs healthy. If more than 30% damaged, plan for next season prevention.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Apply extra fertilizer to healthy plants', 'description': 'Give extra NPK fertilizer to healthy tillers so they grow bigger and compensate for lost tillers.', 'priority': 'medium', 'category': 'crop_maintenance'},
                    {'title': 'Maintain good soil moisture', 'description': 'Keep soil moist but not waterlogged. Healthy plants need consistent water to recover from stem fly damage.', 'priority': 'medium', 'category': 'irrigation'},
                ]
            },
            {
                'day': 4,
                'tasks': [
                    {'title': 'Plan seed treatment for next season', 'description': 'Ask agriculture officer about seed treatment with Confidor or Actara for next planting. This prevents stem fly attack.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Deep plough field after harvest', 'description': 'Plan to plough field deeply after harvest to kill stem fly pupae in soil. This breaks their life cycle.', 'priority': 'low', 'category': 'location_specific'},
                    {'title': 'Water based on plant needs', 'description': 'Healthy plants may need more water to produce bigger heads. Check soil moisture and water when top 2 inches dry.', 'priority': 'medium', 'category': 'irrigation'},
                ]
            },
            {
                'day': 5,
                'tasks': [
                    {'title': 'Monitor healthy tiller growth', 'description': 'Check if healthy tillers are growing well and producing good heads. They should compensate for damaged ones.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Remove all crop residues', 'description': 'Clean field of all wheat stubble and residues. Stem fly overwinters in crop debris. Clean field prevents next season attack.', 'priority': 'medium', 'category': 'location_specific'},
                    {'title': 'Adjust watering for grain filling', 'description': 'If healthy heads are filling grains, ensure adequate water. Water every 2-3 days in Islamabad weather for good grain filling.', 'priority': 'medium', 'category': 'irrigation'},
                ]
            },
            {
                'day': 6,
                'tasks': [
                    {'title': 'Record stem fly damage level', 'description': 'Write down percentage of tillers damaged, field areas most affected. This helps plan prevention for next season.', 'priority': 'low', 'category': 'crop_maintenance'},
                    {'title': 'Plan timely sowing for next season', 'description': 'Ask about optimal sowing time for Islamabad. Early sowing helps avoid stem fly peak activity period.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Prepare for harvest of healthy crop', 'description': 'Plan to harvest healthy tillers first. Ensure good water supply until harvest for maximum grain weight.', 'priority': 'medium', 'category': 'irrigation'},
                ]
            },
            {
                'day': 7,
                'tasks': [
                    {'title': 'Final assessment of crop damage', 'description': 'Calculate total yield loss from stem fly. Plan compensation strategies and prevention for next season.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Plan field preparation for next crop', 'description': 'Plan deep ploughing and field cleaning to break stem fly life cycle. Good preparation prevents future problems.', 'priority': 'low', 'category': 'location_specific'},
                    {'title': 'Maintain irrigation until harvest', 'description': 'Continue proper watering schedule until harvest. Do not stress plants during grain maturation period.', 'priority': 'medium', 'category': 'irrigation'},
                ]
            }
        ]
    },

    # Wheat - Black point
    {
        'crop': 'wheat',
        'disease': 'Black point',
        'location': 'Islamabad',
        'temperature_range': {'min': 22, 'max': 32},
        'day_plans': [
            {
                'day': 1,
                'tasks': [
                    {'title': 'Check wheat grains for black spots', 'description': 'Look at wheat grains for dark spots at the pointed end (embryo end). This is black point disease affecting grain quality.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Reduce humidity around grain heads', 'description': 'Avoid overhead watering during grain filling. Water at soil level only to keep grain heads dry and reduce humidity.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Check for high humidity conditions', 'description': 'Black point develops in humid conditions during grain filling. Monitor weather and adjust watering accordingly.', 'priority': 'medium', 'category': 'weather_advisory'},
                ]
            },
            {
                'day': 2,
                'tasks': [
                    {'title': 'Improve air circulation around heads', 'description': 'Remove weeds and thin dense areas to improve air flow around wheat heads. Better air circulation reduces humidity.', 'priority': 'high', 'category': 'location_specific'},
                    {'title': 'Water early morning only', 'description': 'Water at 6-7 AM so any moisture dries quickly in Islamabad sun. Avoid evening watering that keeps humidity high overnight.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Monitor grain development stage', 'description': 'Check grain filling stage. Black point is most problematic during soft dough to hard dough stage of grain development.', 'priority': 'medium', 'category': 'disease_management'},
                ]
            },
            {
                'day': 3,
                'tasks': [
                    {'title': 'Avoid excessive nitrogen', 'description': 'Do not apply nitrogen fertilizer during grain filling. Excess nitrogen delays maturity and increases black point risk.', 'priority': 'medium', 'category': 'crop_maintenance'},
                    {'title': 'Reduce watering frequency', 'description': 'Water every 3-4 days instead of daily during grain filling. Less frequent watering reduces humidity around grain heads.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Plan for timely harvest', 'description': 'Prepare for harvest as soon as grains mature. Delayed harvest in humid conditions increases black point severity.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 4,
                'tasks': [
                    {'title': 'Check grain moisture content', 'description': 'Test grain moisture. Harvest when moisture is 12-14%. Higher moisture during harvest increases black point problems.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Water only if soil very dry', 'description': 'Check soil 4 inches deep. Water only if very dry. During grain maturation, minimize watering to reduce humidity.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Prepare drying facilities', 'description': 'Arrange for proper grain drying after harvest. Quick drying prevents black point from getting worse after harvest.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 5,
                'tasks': [
                    {'title': 'Monitor weather for harvest timing', 'description': 'Check weather forecast. Plan harvest during dry weather to avoid high humidity that worsens black point.', 'priority': 'high', 'category': 'weather_advisory'},
                    {'title': 'Stop irrigation before harvest', 'description': 'Stop watering 1-2 weeks before harvest. This allows grains to dry properly and reduces black point severity.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Test grain samples for black point', 'description': 'Take grain samples from different field areas. Check percentage of grains with black point to assess severity.', 'priority': 'medium', 'category': 'disease_management'},
                ]
            },
            {
                'day': 6,
                'tasks': [
                    {'title': 'Plan harvest schedule', 'description': 'Harvest fields with less black point first. Separate severely affected grain from good grain during harvest.', 'priority': 'medium', 'category': 'crop_maintenance'},
                    {'title': 'Ensure no irrigation before harvest', 'description': 'Confirm irrigation is stopped. Any watering close to harvest will increase grain moisture and worsen black point.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Prepare storage with good ventilation', 'description': 'Arrange storage with good air circulation. Proper ventilation prevents moisture buildup that worsens black point.', 'priority': 'low', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 7,
                'tasks': [
                    {'title': 'Final grain quality assessment', 'description': 'Check final grain quality and black point severity. Plan marketing strategy based on grain quality.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Document weather and irrigation records', 'description': 'Record weather conditions and watering schedule during grain filling. This helps prevent black point next season.', 'priority': 'low', 'category': 'crop_maintenance'},
                    {'title': 'Plan next season humidity management', 'description': 'Plan irrigation strategy for next season to minimize humidity during grain filling period.', 'priority': 'low', 'category': 'irrigation'},
                ]
            }
        ]
    },

    # Wheat - Common root rot
    {
        'crop': 'wheat',
        'disease': 'Common root rot',
        'location': 'Islamabad',
        'temperature_range': {'min': 15, 'max': 28},
        'day_plans': [
            {
                'day': 1,
                'tasks': [
                    {'title': 'Check plant roots for browning', 'description': 'Dig up few plants and check roots. Look for brown/black roots and crown rot. Healthy roots should be white/cream colored.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Look for poor tillering', 'description': 'Count tillers per plant. Root rot causes poor tillering. Healthy plants should have 4-6 tillers in good conditions.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Check soil drainage', 'description': 'Look for waterlogged areas. Poor drainage makes root rot worse. Islamabad loamy soil should drain well if not compacted.', 'priority': 'high', 'category': 'irrigation'},
                ]
            },
            {
                'day': 2,
                'tasks': [
                    {'title': 'Improve field drainage immediately', 'description': 'Make drainage channels to remove standing water. Root rot fungi thrive in waterlogged soil. Good drainage is critical.', 'priority': 'high', 'category': 'location_specific'},
                    {'title': 'Reduce watering frequency', 'description': 'Water less frequently but deeply. Let soil dry between watering. Constantly wet soil promotes root rot fungi.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Apply fungicide to soil if severe', 'description': 'If many plants affected, apply soil fungicide like Metalaxyl + Mancozeb. Follow label instructions for soil application.', 'priority': 'medium', 'category': 'disease_management'},
                ]
            },
            {
                'day': 3,
                'tasks': [
                    {'title': 'Check soil moisture before watering', 'description': 'Test soil 4 inches deep. Water only when soil is getting dry. Overwatering is main cause of root rot spread.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Remove badly affected plants', 'description': 'Pull out plants with severe root rot and burn them. This reduces fungal load in soil for remaining plants.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Apply balanced fertilizer', 'description': 'Give balanced NPK fertilizer to strengthen remaining healthy plants. Strong plants resist root rot better.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 4,
                'tasks': [
                    {'title': 'Monitor plant recovery', 'description': 'Check if remaining plants are showing new growth. Good drainage and reduced watering should help plant recovery.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Water only when necessary', 'description': 'Continue careful watering. Water early morning and let soil dry during day. Avoid evening watering completely.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Plan crop rotation for next season', 'description': 'Plan to grow different crop next season. Rotate away from wheat to break root rot disease cycle.', 'priority': 'low', 'category': 'disease_management'},
                ]
            },
            {
                'day': 5,
                'tasks': [
                    {'title': 'Assess root rot control', 'description': 'Dig up few more plants to check root health. Roots should be getting whiter and healthier with good drainage.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Maintain proper soil moisture', 'description': 'Keep soil moist but not wet. In Islamabad weather, check soil daily but water only when top 3 inches are dry.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Apply organic matter', 'description': 'Add compost or well-rotted manure to improve soil structure and drainage. Better soil structure prevents root rot.', 'priority': 'low', 'category': 'location_specific'},
                ]
            },
            {
                'day': 6,
                'tasks': [
                    {'title': 'Document root rot severity', 'description': 'Record which field areas had worst root rot. This helps plan drainage improvements and seed treatment for next season.', 'priority': 'low', 'category': 'crop_maintenance'},
                    {'title': 'Plan seed treatment for next planting', 'description': 'Ask about seed treatment with fungicides for next season. Treated seeds resist root rot better.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Check irrigation system efficiency', 'description': 'Ensure irrigation system gives even water distribution. Uneven watering creates wet spots where root rot develops.', 'priority': 'medium', 'category': 'irrigation'},
                ]
            },
            {
                'day': 7,
                'tasks': [
                    {'title': 'Final root health assessment', 'description': 'Check overall plant health and root recovery. Plan management strategy for rest of growing season.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Establish proper watering routine', 'description': 'Set regular watering schedule based on soil moisture, not calendar. Root rot prevention requires careful water management.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Plan field improvements', 'description': 'Plan drainage improvements and soil amendments for next season. Prevention is better than treatment for root rot.', 'priority': 'low', 'category': 'location_specific'},
                ]
            }
        ]
    },

    # Wheat - Head blast
    {
        'crop': 'wheat',
        'disease': 'Head blast',
        'location': 'Islamabad',
        'temperature_range': {'min': 20, 'max': 30},
        'day_plans': [
            {
                'day': 1,
                'tasks': [
                    {'title': 'Look for bleached wheat heads', 'description': 'Check wheat heads for premature whitening/bleaching. Head blast makes heads turn white before natural maturity.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Check for neck rot symptoms', 'description': 'Look at the neck area below wheat heads. Head blast often causes dark lesions on the neck area.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Avoid overhead watering', 'description': 'Do not spray water on wheat heads. Water at soil level only. Wet heads help head blast spread rapidly.', 'priority': 'high', 'category': 'irrigation'},
                ]
            },
            {
                'day': 2,
                'tasks': [
                    {'title': 'Spray fungicide immediately', 'description': 'If head blast confirmed, spray Amistar Top or Tilt fungicide immediately. Head blast spreads very fast and can destroy crop quickly.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Water early morning at soil level', 'description': 'Water at 6-7 AM directly at plant base. Avoid any moisture on wheat heads. Islamabad morning sun helps dry any accidental moisture.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Remove infected heads immediately', 'description': 'Cut off bleached/infected wheat heads and burn them immediately. This reduces spore source for further spread.', 'priority': 'high', 'category': 'disease_management'},
                ]
            },
            {
                'day': 3,
                'tasks': [
                    {'title': 'Monitor spray effectiveness', 'description': 'Check if new heads are getting infected. Head blast should stop spreading if treatment is effective.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Reduce watering frequency', 'description': 'Water every 3-4 days instead of daily. Head blast needs moisture to spread. Drier conditions help control the disease.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Avoid nitrogen fertilizer', 'description': 'Do not apply nitrogen during heading stage. Excess nitrogen makes plants soft and more susceptible to head blast.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 4,
                'tasks': [
                    {'title': 'Second fungicide spray if needed', 'description': 'If head blast still spreading, apply second spray with different fungicide. Use Propiconazole or Azoxystrobin.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Check soil moisture carefully', 'description': 'Test soil before watering. Water only when top 4 inches are dry. Minimize humidity around wheat heads.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Improve air circulation', 'description': 'Remove weeds and thin dense areas to improve air flow around wheat heads. Better ventilation reduces disease spread.', 'priority': 'medium', 'category': 'location_specific'},
                ]
            },
            {
                'day': 5,
                'tasks': [
                    {'title': 'Assess head blast damage', 'description': 'Count healthy vs infected heads. If more than 30% heads affected, consider early harvest of healthy areas.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Minimal watering approach', 'description': 'Water only if plants show severe stress. Head blast control requires keeping field as dry as possible.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Test grain for mycotoxins', 'description': 'If head blast was severe, get grain tested for mycotoxins before consumption. Infected grain may be contaminated.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 6,
                'tasks': [
                    {'title': 'Plan early harvest if severe', 'description': 'If many heads infected, plan to harvest healthy areas first. Early harvest prevents further spread and mycotoxin buildup.', 'priority': 'medium', 'category': 'crop_maintenance'},
                    {'title': 'Stop irrigation before harvest', 'description': 'Stop watering 1-2 weeks before harvest. This helps reduce mycotoxin levels in any infected grain.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Document outbreak conditions', 'description': 'Record weather conditions, nitrogen application, watering schedule. This helps prevent head blast next season.', 'priority': 'low', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 7,
                'tasks': [
                    {'title': 'Final head blast assessment', 'description': 'Evaluate total crop damage and plan harvest strategy. Separate infected grain from healthy grain during harvest.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Prepare for safe harvest', 'description': 'Plan to harvest infected areas separately. Do not mix infected grain with healthy grain for food use.', 'priority': 'medium', 'category': 'crop_maintenance'},
                    {'title': 'Plan prevention for next season', 'description': 'Plan resistant varieties and better nitrogen management for next season. Prevention is key for head blast control.', 'priority': 'low', 'category': 'disease_management'},
                ]
            }
        ]
    },

    # Wheat - Fusarium Foot Rot
    {
        'crop': 'wheat',
        'disease': 'Fusarium Foot Rot',
        'location': 'Islamabad',
        'temperature_range': {'min': 18, 'max': 28},
        'day_plans': [
            {
                'day': 1,
                'tasks': [
                    {'title': 'Check plant base for dark discoloration', 'description': 'Look at wheat plant base (crown/foot area) for dark brown/black discoloration. This is sign of Fusarium foot rot.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Look for stunted plant growth', 'description': 'Check if plants are shorter than normal and have fewer tillers. Foot rot affects plant growth and tillering.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Check for waterlogged conditions', 'description': 'Look for standing water or very wet soil. Waterlogging makes foot rot much worse. Check drainage immediately.', 'priority': 'high', 'category': 'irrigation'},
                ]
            },
            {
                'day': 2,
                'tasks': [
                    {'title': 'Improve drainage immediately', 'description': 'Make channels to drain standing water. Foot rot fungi thrive in waterlogged soil. Good drainage is most important treatment.', 'priority': 'high', 'category': 'location_specific'},
                    {'title': 'Reduce watering frequency drastically', 'description': 'Water much less frequently. Let soil dry well between watering. Wet soil conditions promote foot rot spread.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Apply soil fungicide if available', 'description': 'Apply Bavistin (Carbendazim) or Metalaxyl + Mancozeb to soil around affected plants. Follow label for soil application.', 'priority': 'medium', 'category': 'disease_management'},
                ]
            },
            {
                'day': 3,
                'tasks': [
                    {'title': 'Remove severely affected plants', 'description': 'Pull out plants with severe foot rot and burn them. This reduces fungal load in soil for remaining healthy plants.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Check soil moisture before any watering', 'description': 'Test soil 4-5 inches deep. Water only if very dry. Foot rot control requires keeping soil drier than normal.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Apply balanced fertilizer to healthy plants', 'description': 'Give NPK fertilizer to healthy plants to strengthen them. Strong plants resist foot rot better.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 4,
                'tasks': [
                    {'title': 'Monitor plant recovery', 'description': 'Check if remaining plants are showing new healthy growth. Good drainage should help stop foot rot spread.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Water only when plants stress', 'description': 'Water only when plants show wilting in hot Islamabad weather. Foot rot control requires minimal watering.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Plan crop rotation', 'description': 'Plan to grow different crop next season. Rotate away from wheat to break Fusarium foot rot disease cycle.', 'priority': 'low', 'category': 'disease_management'},
                ]
            },
            {
                'day': 5,
                'tasks': [
                    {'title': 'Assess foot rot control progress', 'description': 'Check plant bases again. Dark discoloration should not be spreading to new plants with good drainage.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Maintain careful watering', 'description': 'Continue minimal watering approach. In Islamabad heat, water early morning only when soil very dry.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Add organic matter to improve soil', 'description': 'Apply compost to improve soil structure and drainage. Better soil structure prevents waterlogging and foot rot.', 'priority': 'low', 'category': 'location_specific'},
                ]
            },
            {
                'day': 6,
                'tasks': [
                    {'title': 'Document foot rot severity', 'description': 'Record which field areas had worst foot rot. This helps plan drainage improvements for next season.', 'priority': 'low', 'category': 'crop_maintenance'},
                    {'title': 'Plan seed treatment for next season', 'description': 'Ask about seed treatment with Carbendazim or Metalaxyl for next planting. Treated seeds resist foot rot.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Check irrigation system for improvements', 'description': 'Plan irrigation system improvements to avoid waterlogging. Consider raised beds or better drainage.', 'priority': 'medium', 'category': 'irrigation'},
                ]
            },
            {
                'day': 7,
                'tasks': [
                    {'title': 'Final foot rot assessment', 'description': 'Evaluate overall plant health and foot rot control. Plan management for rest of growing season.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Establish proper drainage routine', 'description': 'Maintain good field drainage. Regular drainage maintenance prevents foot rot problems.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Plan field improvements for next season', 'description': 'Plan permanent drainage improvements and soil amendments. Prevention is best strategy for foot rot.', 'priority': 'low', 'category': 'location_specific'},
                ]
            }
        ]
    },

    # Wheat - Leaf blast
    {
        'crop': 'wheat',
        'disease': 'Leaf blast',
        'location': 'Islamabad',
        'temperature_range': {'min': 22, 'max': 30},
        'day_plans': [
            {
                'day': 1,
                'tasks': [
                    {'title': 'Look for diamond-shaped spots on leaves', 'description': 'Check wheat leaves for diamond-shaped lesions with gray centers and dark borders. These are typical leaf blast symptoms.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Check for leaf burning/blighting', 'description': 'Look for leaves that are burning/dying rapidly. Leaf blast can cause severe leaf blight in favorable conditions.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Avoid overhead watering immediately', 'description': 'Stop spraying water on leaves. Water at soil level only. Wet leaves help leaf blast spread very rapidly.', 'priority': 'high', 'category': 'irrigation'},
                ]
            },
            {
                'day': 2,
                'tasks': [
                    {'title': 'Spray fungicide at first symptoms', 'description': 'Spray Tilt (Propiconazole) or Amistar Top immediately. Leaf blast spreads very fast and early treatment is critical.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Water early morning at soil level', 'description': 'Water at 6-7 AM directly at plant base. Avoid any moisture on leaves. Islamabad sun helps dry any accidental leaf moisture.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Remove infected leaves immediately', 'description': 'Cut off leaves with diamond-shaped spots and burn them. This reduces spore source for further infection.', 'priority': 'high', 'category': 'disease_management'},
                ]
            },
            {
                'day': 3,
                'tasks': [
                    {'title': 'Monitor fungicide effectiveness', 'description': 'Check if new diamond spots are appearing. Good treatment should stop new lesion formation within 2-3 days.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Reduce watering frequency', 'description': 'Water every 3-4 days instead of daily. Leaf blast needs moisture to spread. Drier conditions help control disease.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Avoid excessive nitrogen', 'description': 'Do not apply nitrogen fertilizer now. Excess nitrogen makes plants soft and more susceptible to leaf blast.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 4,
                'tasks': [
                    {'title': 'Second spray if blast spreading', 'description': 'If diamond spots still appearing, spray different fungicide (Azoxystrobin). Rotate chemicals to avoid resistance.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Check soil moisture carefully', 'description': 'Test soil before watering. Water only when top 3 inches are dry. Minimize humidity around plants.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Improve field air circulation', 'description': 'Remove weeds and thin dense plant areas. Better air flow helps leaves dry faster and reduces blast spread.', 'priority': 'medium', 'category': 'location_specific'},
                ]
            },
            {
                'day': 5,
                'tasks': [
                    {'title': 'Count blast lesions to assess control', 'description': 'Check 20 leaves randomly. Count diamond spots per leaf. Good control: no new spots. Poor control: spots increasing.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Adjust watering based on weather', 'description': 'Hot sunny day: water early morning. Humid cloudy day: skip watering completely. Check weather before watering.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Apply potassium for plant strength', 'description': 'Give potassium-rich fertilizer to boost plant immunity. Strong plants with good potassium resist leaf blast better.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 6,
                'tasks': [
                    {'title': 'Document leaf blast outbreak', 'description': 'Record blast severity, weather conditions, nitrogen history. This helps prevent leaf blast in future seasons.', 'priority': 'low', 'category': 'crop_maintenance'},
                    {'title': 'Plan resistant varieties for next season', 'description': 'Ask agriculture officer about leaf blast-resistant wheat varieties for Islamabad climate.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Optimize irrigation method', 'description': 'Consider drip irrigation or furrow irrigation to avoid wetting leaves. Leaf-wetting irrigation promotes leaf blast.', 'priority': 'medium', 'category': 'irrigation'},
                ]
            },
            {
                'day': 7,
                'tasks': [
                    {'title': 'Final leaf blast evaluation', 'description': 'Assess overall leaf blast control and crop damage. Plan management strategy for rest of growing season.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Establish proper watering routine', 'description': 'Set watering schedule that keeps plants healthy but leaves dry. This prevents leaf blast recurrence.', 'priority': 'medium', 'category': 'irrigation'},
                    {'title': 'Plan field sanitation', 'description': 'Plan to remove all infected plant debris after harvest. Clean field prevents leaf blast carryover to next season.', 'priority': 'low', 'category': 'location_specific'},
                ]
            }
        ]
    },

    # Wheat - Septoria (Zymoseptoria)
    {
        'crop': 'wheat',
        'disease': 'Septoria (Zymoseptoria)',
        'location': 'Islamabad',
        'temperature_range': {'min': 18, 'max': 25},
        'day_plans': [
            {
                'day': 1,
                'tasks': [
                    {'title': 'Look for brown lesions with black dots', 'description': 'Check wheat leaves for irregular brown lesions with tiny black dots (pycnidia). These black dots are characteristic of Septoria.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Check lower leaves first', 'description': 'Septoria usually starts on lower leaves and moves up. Check bottom leaves of plants for early symptoms.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Avoid overhead irrigation', 'description': 'Do not spray water on leaves. Water at soil level to keep leaves dry. Wet leaves help Septoria spores spread.', 'priority': 'high', 'category': 'irrigation'},
                ]
            },
            {
                'day': 2,
                'tasks': [
                    {'title': 'Spray fungicide at early symptoms', 'description': 'Spray Amistar Top, Tilt, or Bavistin as soon as you see brown lesions with black dots. Early treatment is most effective.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Water early morning at soil level', 'description': 'Water at 6-7 AM directly at plant base. Avoid wetting leaves. Islamabad morning sun helps dry any accidental moisture.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Remove infected lower leaves', 'description': 'Cut off lower leaves with brown lesions and black dots. Dispose away from field to reduce spore source.', 'priority': 'medium', 'category': 'disease_management'},
                ]
            },
            {
                'day': 3,
                'tasks': [
                    {'title': 'Monitor disease progression', 'description': 'Check if Septoria is moving up to higher leaves. Good treatment should stop upward movement of disease.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Reduce watering frequency', 'description': 'Water every 3-4 days instead of daily. Septoria needs moisture to spread. Drier conditions help control disease.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Improve air circulation', 'description': 'Remove weeds between rows to improve air flow. Better ventilation helps leaves dry faster and reduces Septoria spread.', 'priority': 'medium', 'category': 'location_specific'},
                ]
            },
            {
                'day': 4,
                'tasks': [
                    {'title': 'Second fungicide if disease spreading', 'description': 'If brown lesions still appearing on upper leaves, spray different fungicide. Rotate between Azoxystrobin and Propiconazole.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Check soil moisture before watering', 'description': 'Test soil 3 inches deep. Water only when dry. Islamabad loamy soil holds moisture - avoid overwatering.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Apply balanced nutrition', 'description': 'Give balanced NPK fertilizer. Avoid excess nitrogen which makes plants soft and Septoria-prone.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 5,
                'tasks': [
                    {'title': 'Count lesions to assess control', 'description': 'Check 20 leaves randomly. Count brown lesions with black dots. Good control: no new lesions. Poor control: lesions increasing.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Adjust watering based on weather', 'description': 'Sunny day: water early morning. Cloudy/humid day: skip watering. Septoria spreads faster in humid conditions.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Remove crop residues from field', 'description': 'Clean up any old wheat debris in field. Septoria survives on crop residues and can reinfect new plants.', 'priority': 'medium', 'category': 'location_specific'},
                ]
            },
            {
                'day': 6,
                'tasks': [
                    {'title': 'Document Septoria treatment', 'description': 'Record disease severity, fungicides used, weather conditions. This helps plan Septoria management for next season.', 'priority': 'low', 'category': 'crop_maintenance'},
                    {'title': 'Plan crop rotation for next season', 'description': 'Plan to rotate away from wheat next season. Grow rice or cotton to break Septoria disease cycle.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Check irrigation system efficiency', 'description': 'Ensure irrigation waters at soil level without wetting leaves. Consider drip irrigation for Septoria-prone areas.', 'priority': 'medium', 'category': 'irrigation'},
                ]
            },
            {
                'day': 7,
                'tasks': [
                    {'title': 'Final Septoria assessment', 'description': 'Evaluate overall disease control and crop health. Plan management strategy for rest of growing season.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Plan next week watering schedule', 'description': 'Based on weather forecast and disease status, plan irrigation frequency. Balance plant needs with disease prevention.', 'priority': 'medium', 'category': 'irrigation'},
                    {'title': 'Maintain field cleanliness', 'description': 'Continue removing infected plant debris. Clean field reduces Septoria spores and prevents disease buildup.', 'priority': 'low', 'category': 'location_specific'},
                ]
            }
        ]
    },

    # Wheat - Smut
    {
        'crop': 'wheat',
        'disease': 'Smut',
        'location': 'Islamabad',
        'temperature_range': {'min': 16, 'max': 26},
        'day_plans': [
            {
                'day': 1,
                'tasks': [
                    {'title': 'Look for black powder in wheat heads', 'description': 'Check wheat heads for black powdery mass replacing grains. Smut turns grain into black spores with bad smell.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Check for rotten fish smell', 'description': 'Smut-infected heads have characteristic bad smell like rotten fish. This helps identify smut infection.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Normal watering for healthy plants', 'description': 'Smut infection happened at planting time. Continue normal watering for healthy plants based on soil moisture.', 'priority': 'medium', 'category': 'irrigation'},
                ]
            },
            {
                'day': 2,
                'tasks': [
                    {'title': 'Remove infected heads immediately', 'description': 'Cut off all wheat heads with black powder and burn them immediately. Do this before black spores spread to healthy plants.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Avoid working in field when windy', 'description': 'Do not work in field during windy weather. Wind spreads smut spores to healthy plants and contaminates soil.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Water healthy plants normally', 'description': 'Continue regular watering for healthy plants. Check soil moisture and water when top 2 inches are dry.', 'priority': 'medium', 'category': 'irrigation'},
                ]
            },
            {
                'day': 3,
                'tasks': [
                    {'title': 'Count infected vs healthy heads', 'description': 'Count how many heads are infected vs healthy. If more than 10% infected, plan better seed treatment for next season.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Clean tools and equipment', 'description': 'Clean all tools, boots, and equipment with disinfectant. Smut spores stick to equipment and spread disease.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Maintain good soil moisture', 'description': 'Keep soil adequately moist for healthy plants. In Islamabad weather, water every 2-3 days based on soil test.', 'priority': 'medium', 'category': 'irrigation'},
                ]
            },
            {
                'day': 4,
                'tasks': [
                    {'title': 'Plan certified seed for next season', 'description': 'Arrange to buy certified, smut-free seed for next planting. Never use seed from infected crop.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Mark infected field areas', 'description': 'Mark areas where smut was worst. These areas need extra soil treatment and better seed treatment next season.', 'priority': 'low', 'category': 'location_specific'},
                    {'title': 'Water based on plant needs', 'description': 'Healthy plants may need more water to compensate for lost infected heads. Check soil moisture regularly.', 'priority': 'medium', 'category': 'irrigation'},
                ]
            },
            {
                'day': 5,
                'tasks': [
                    {'title': 'Research seed treatment options', 'description': 'Ask agriculture officer about hot water treatment or fungicide seed treatment (Carboxin, Thiram) for next season.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Continue removing any new infected heads', 'description': 'Keep checking for any missed infected heads. Remove and burn them to prevent spore spread.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Adjust watering for grain filling', 'description': 'If healthy heads are filling grains, ensure adequate water. Water every 2-3 days for good grain development.', 'priority': 'medium', 'category': 'irrigation'},
                ]
            },
            {
                'day': 6,
                'tasks': [
                    {'title': 'Document smut severity', 'description': 'Record percentage of heads infected, field areas affected. This helps plan prevention strategies for next season.', 'priority': 'low', 'category': 'crop_maintenance'},
                    {'title': 'Plan soil treatment for next season', 'description': 'Consider soil solarization or fumigation for heavily infected areas. Smut spores can survive in soil.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Prepare for harvest of healthy crop', 'description': 'Plan to harvest healthy areas first. Ensure good water supply until harvest for maximum grain weight.', 'priority': 'medium', 'category': 'irrigation'},
                ]
            },
            {
                'day': 7,
                'tasks': [
                    {'title': 'Final smut assessment', 'description': 'Calculate total yield loss from smut. Plan comprehensive prevention strategy for next season.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Plan field sanitation', 'description': 'Plan thorough field cleaning after harvest. Remove all crop residues to reduce smut spore load in soil.', 'priority': 'low', 'category': 'location_specific'},
                    {'title': 'Maintain irrigation until harvest', 'description': 'Continue proper watering for healthy plants until harvest. Do not stress plants during grain maturation.', 'priority': 'medium', 'category': 'irrigation'},
                ]
            }
        ]
    },

    # Wheat - Tan spot
    {
        'crop': 'wheat',
        'disease': 'Tan spot',
        'location': 'Islamabad',
        'temperature_range': {'min': 18, 'max': 28},
        'day_plans': [
            {
                'day': 1,
                'tasks': [
                    {'title': 'Look for tan spots with yellow halos', 'description': 'Check wheat leaves for tan/brown necrotic spots surrounded by yellow halos. These are characteristic tan spot symptoms.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Check lower leaves first', 'description': 'Tan spot usually starts on lower leaves. Check bottom leaves of plants for early tan-colored lesions.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Avoid overhead watering', 'description': 'Do not spray water on leaves. Water at soil level to keep leaves dry. Wet leaves help tan spot spores spread.', 'priority': 'high', 'category': 'irrigation'},
                ]
            },
            {
                'day': 2,
                'tasks': [
                    {'title': 'Spray fungicide at first symptoms', 'description': 'Spray Tilt (Propiconazole) or Dithane (Mancozeb) as soon as you see tan spots with yellow halos. Early treatment works best.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Water early morning at soil level', 'description': 'Water at 6-7 AM directly at plant base. Avoid wetting leaves. Islamabad morning sun helps dry any accidental moisture.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Remove infected lower leaves', 'description': 'Cut off lower leaves with tan spots and dispose away from field. This reduces spore source for further infection.', 'priority': 'medium', 'category': 'disease_management'},
                ]
            },
            {
                'day': 3,
                'tasks': [
                    {'title': 'Monitor tan spot progression', 'description': 'Check if tan spots are moving up to higher leaves. Good treatment should stop upward disease movement.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Reduce watering frequency', 'description': 'Water every 3-4 days instead of daily. Tan spot needs moisture to spread. Drier conditions help control disease.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Clean up crop residues', 'description': 'Remove any old wheat stubble or debris in field. Tan spot survives on crop residues and can reinfect plants.', 'priority': 'medium', 'category': 'location_specific'},
                ]
            },
            {
                'day': 4,
                'tasks': [
                    {'title': 'Second fungicide if spots spreading', 'description': 'If tan spots still appearing on upper leaves, spray different fungicide. Rotate between Mancozeb and Triazoles.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Check soil moisture before watering', 'description': 'Test soil 3 inches deep. Water only when dry. Islamabad loamy soil holds moisture well - avoid overwatering.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Improve field air circulation', 'description': 'Remove weeds between rows to improve air flow. Better ventilation helps leaves dry faster and reduces tan spot spread.', 'priority': 'medium', 'category': 'location_specific'},
                ]
            },
            {
                'day': 5,
                'tasks': [
                    {'title': 'Count tan spots to assess control', 'description': 'Check 20 leaves randomly. Count tan spots with yellow halos. Good control: no new spots. Poor control: spots increasing.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Adjust watering based on weather', 'description': 'Sunny day: water early morning. Cloudy/humid day: skip watering. Tan spot spreads faster in humid conditions.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Apply balanced fertilizer', 'description': 'Give balanced NPK fertilizer to strengthen plants. Strong plants resist tan spot better than weak plants.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 6,
                'tasks': [
                    {'title': 'Document tan spot treatment', 'description': 'Record disease severity, fungicides used, weather conditions. This helps plan tan spot management for next season.', 'priority': 'low', 'category': 'crop_maintenance'},
                    {'title': 'Plan crop rotation for next season', 'description': 'Plan to rotate away from wheat next season. Grow rice or cotton to break tan spot disease cycle.', 'priority': 'low', 'category': 'disease_management'},
                    {'title': 'Check irrigation system efficiency', 'description': 'Ensure irrigation waters at soil level without wetting leaves. Consider drip irrigation for disease-prone areas.', 'priority': 'medium', 'category': 'irrigation'},
                ]
            },
            {
                'day': 7,
                'tasks': [
                    {'title': 'Final tan spot assessment', 'description': 'Evaluate overall disease control and crop health. Plan management strategy for rest of growing season.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Plan residue management', 'description': 'Plan to remove all crop residues after harvest. Clean field prevents tan spot carryover to next season.', 'priority': 'medium', 'category': 'location_specific'},
                    {'title': 'Establish proper watering routine', 'description': 'Set watering schedule that keeps plants healthy but leaves dry. This prevents tan spot recurrence.', 'priority': 'medium', 'category': 'irrigation'},
                ]
            }
        ]
    },

    # Wheat - Wheat Scab (same as Fusarium Head Blight)
    {
        'crop': 'wheat',
        'disease': 'Wheat Scab',
        'location': 'Islamabad',
        'temperature_range': {'min': 20, 'max': 30},
        'day_plans': [
            {
                'day': 1,
                'tasks': [
                    {'title': 'Look for bleached wheat heads', 'description': 'Check wheat heads for premature whitening/bleaching. Wheat scab makes heads turn white before natural maturity.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Check for pink fungal growth', 'description': 'Look for pink/orange fungal growth on wheat heads. This indicates active scab infection and mycotoxin production.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Avoid watering during flowering', 'description': 'If wheat is flowering, avoid watering for 2-3 days. Wet conditions during flowering help scab infection.', 'priority': 'high', 'category': 'irrigation'},
                ]
            },
            {
                'day': 2,
                'tasks': [
                    {'title': 'Spray fungicide at early flowering', 'description': 'If wheat just started flowering, spray Amistar Top or Tebuconazole fungicide immediately. Early treatment is most effective.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Water only if soil very dry', 'description': 'Check soil moisture 4 inches deep. Water only if very dry. During flowering, keep field drier to prevent scab.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Remove corn residues nearby', 'description': 'Scab fungus lives on corn residues. Remove any corn stalks or debris near wheat field to reduce infection source.', 'priority': 'medium', 'category': 'location_specific'},
                ]
            },
            {
                'day': 3,
                'tasks': [
                    {'title': 'Monitor for pink growth on heads', 'description': 'Check wheat heads daily for pink fungal growth. This indicates mycotoxin production - very dangerous for health.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Minimal watering during grain filling', 'description': 'If grains are forming, water very carefully. Too much moisture increases mycotoxin production in infected heads.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Remove infected heads immediately', 'description': 'Cut off wheat heads with bleached areas or pink growth. Burn these infected heads away from field immediately.', 'priority': 'high', 'category': 'disease_management'},
                ]
            },
            {
                'day': 4,
                'tasks': [
                    {'title': 'Second fungicide if infection spreading', 'description': 'If scab still spreading, apply second fungicide spray. Use different chemical (rotate) and focus on newly opened flowers.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Check soil moisture carefully', 'description': 'Test soil before watering. In Islamabad heat, plants need water but avoid excess during grain development.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Plan early harvest if severe', 'description': 'If many heads infected, plan to harvest early to reduce mycotoxin buildup. Consult agriculture officer about timing.', 'priority': 'medium', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 5,
                'tasks': [
                    {'title': 'Assess scab severity', 'description': 'Check 50 wheat heads randomly. Count how many have bleached areas or pink growth. Severe: more than 20% affected.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Reduce watering as harvest approaches', 'description': 'As grain matures, reduce watering frequency. Drier conditions before harvest reduce mycotoxin levels.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Test grain for mycotoxins', 'description': 'If scab was severe, get grain tested for mycotoxins before selling or eating. Contaminated grain is very dangerous.', 'priority': 'high', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 6,
                'tasks': [
                    {'title': 'Plan separate harvest for infected areas', 'description': 'Harvest infected areas separately from healthy areas. Never mix scab-infected grain with healthy grain.', 'priority': 'high', 'category': 'crop_maintenance'},
                    {'title': 'Stop irrigation before harvest', 'description': 'Stop watering 1-2 weeks before harvest. This helps reduce mycotoxin levels in any infected grain.', 'priority': 'high', 'category': 'irrigation'},
                    {'title': 'Document scab outbreak', 'description': 'Record weather during flowering, nitrogen application, watering schedule. This helps prevent scab next season.', 'priority': 'low', 'category': 'crop_maintenance'},
                ]
            },
            {
                'day': 7,
                'tasks': [
                    {'title': 'Final scab assessment and safety plan', 'description': 'Evaluate total crop damage. Plan safe disposal of infected grain - do not feed to animals or consume.', 'priority': 'high', 'category': 'disease_management'},
                    {'title': 'Plan crop rotation for next season', 'description': 'Rotate away from wheat next season. Avoid corn-wheat rotation as both crops share scab fungus.', 'priority': 'medium', 'category': 'disease_management'},
                    {'title': 'Clean field of infected debris', 'description': 'Remove and burn all infected plant material. Do not leave scab-infected residues in field.', 'priority': 'medium', 'category': 'location_specific'},
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
    {
    'crop': 'wheat',
    'disease': 'Aphid',
    'location': 'Islamabad',
    'temperature_range': {'min': 3, 'max': 20},
    'day_plans': [
        {
            'day': 1,
            'tasks': [
                {
                    'title': 'Check wheat leaves for aphids',
                    'description': 'Look under the leaves for small green or black insects. Also check for curling leaves and sticky honeydew. Cold weather slows aphids, but they still survive.',
                    'priority': 'high',
                    'category': 'disease_management'
                },
                {
                    'title': 'Check beneficial insects',
                    'description': 'Count ladybird beetles. If many ladybirds are present, avoid spraying because they naturally reduce aphids.',
                    'priority': 'medium',
                    'category': 'disease_management'
                },
                {
                    'title': 'Check soil moisture in loamy soil',
                    'description': 'Loamy soil holds moderate moisture. Use light irrigation if the top 4 inches feel dry. Do not overwater because aphids increase on lush soft growth.',
                    'priority': 'medium',
                    'category': 'weather_advisory'
                }
            ]
        },

        {
            'day': 2,
            'tasks': [
                {
                    'title': 'Spray only if aphids exceed threshold',
                    'description': 'If you count more than 50 aphids per tiller, spray Confidor (Imidacloprid) at 200 ml per acre mixed in 100 liters of water. Spray only affected patches.',
                    'priority': 'high',
                    'category': 'disease_management'
                },
                {
                    'title': 'Remove weeds around the field',
                    'description': 'Pull out or cut weeds like canary grass or wild hosts near the field because they shelter aphids.',
                    'priority': 'medium',
                    'category': 'location_specific'
                },
                {
                    'title': 'Irrigate lightly if soil is dry',
                    'description': 'Give a light irrigation because loamy soil drains well. Avoid heavy watering as it leads to soft growth that attracts aphids.',
                    'priority': 'medium',
                    'category': 'crop_maintenance'
                }
            ]
        },

        {
            'day': 3,
            'tasks': [
                {
                    'title': 'Check if the spray worked',
                    'description': 'Look at the sprayed plants. Dead aphids turn brown or black. Check if ladybirds survived the spray.',
                    'priority': 'high',
                    'category': 'disease_management'
                },
                {
                    'title': 'Give balanced fertilizer',
                    'description': 'Apply NPK in balanced amount. Avoid too much nitrogen because it causes soft leaves that attract more aphids.',
                    'priority': 'medium',
                    'category': 'crop_maintenance'
                },
                {
                    'title': 'Clean the field',
                    'description': 'Remove crop residues and volunteer wheat because they are hiding places for aphids.',
                    'priority': 'low',
                    'category': 'location_specific'
                }
            ]
        },

        {
            'day': 4,
            'tasks': [
                {
                    'title': 'Apply second spray if aphids still high',
                    'description': 'If aphids remain above 20–30 per tiller, use Karate (Lambda-cyhalothrin) at 150 ml per acre. Use a different chemical than before to avoid resistance.',
                    'priority': 'medium',
                    'category': 'disease_management'
                },
                {
                    'title': 'Protect beneficial insects',
                    'description': 'Do not use broad insecticides. Grow small flowering plants at field borders to attract ladybirds.',
                    'priority': 'low',
                    'category': 'disease_management'
                },
                {
                    'title': 'Check moisture in loamy soil',
                    'description': 'Push finger 4–6 inches in soil. If dry, apply very light irrigation. Loamy soil should not stay too wet in winter.',
                    'priority': 'medium',
                    'category': 'location_specific'
                }
            ]
        },

        {
            'day': 5,
            'tasks': [
                {
                    'title': 'Check final aphid level',
                    'description': 'Count aphids again. Less than 10 aphids per tiller means no further spray needed.',
                    'priority': 'high',
                    'category': 'disease_management'
                },
                {
                    'title': 'Check for black sooty mold',
                    'description': 'Look for black fungus growing on honeydew. This means aphids were here earlier. Clean affected leaves.',
                    'priority': 'medium',
                    'category': 'disease_management'
                },
                {
                    'title': 'Weed removal',
                    'description': 'Remove last remaining weeds. If needed, apply selective post-emergence herbicide according to wheat stage.',
                    'priority': 'medium',
                    'category': 'crop_maintenance'
                }
            ]
        },

        {
            'day': 6,
            'tasks': [
                {
                    'title': 'Record field details',
                    'description': 'Write down aphid counts, sprays used, date, and cost. This helps in next season planning.',
                    'priority': 'low',
                    'category': 'crop_maintenance'
                },
                {
                    'title': 'Plan future prevention',
                    'description': 'Use resistant varieties next year and avoid late sowing. Keep ladybird population healthy.',
                    'priority': 'low',
                    'category': 'disease_management'
                },
                {
                    'title': 'Irrigate according to soil need',
                    'description': 'Loamy soil needs irrigation every 4–6 days in winter. Give only light water.',
                    'priority': 'medium',
                    'category': 'crop_maintenance'
                }
            ]
        },

        {
            'day': 7,
            'tasks': [
                {
                    'title': 'Weekly full field round',
                    'description': 'Walk through the whole field and check if aphids are coming back.',
                    'priority': 'high',
                    'category': 'disease_management'
                },
                {
                    'title': 'Check weekly weather',
                    'description': 'Cold below 10°C slows aphids. Plan irrigation and fertilizer according to next week’s temperature.',
                    'priority': 'medium',
                    'category': 'weather_advisory'
                },
                {
                    'title': 'Keep field clean',
                    'description': 'Remove plant waste and keep borders clean to stop aphid movement.',
                    'priority': 'low',
                    'category': 'location_specific'
                }
            ]
        }
    ]
},
{
    'crop': 'wheat',
    'disease': 'Mite',
    'location': 'Islamabad',
    'temperature_range': {'min': 3, 'max': 20},
    'day_plans': [
        {
            'day': 1,
            'tasks': [
                {
                    'title': 'Check wheat leaves for mites',
                    'description': 'Look for yellow patches or tiny white dots on leaves. Mites are very small and hard to see, but their damage is clear.',
                    'priority': 'high',
                    'category': 'disease_management'
                },
                {
                    'title': 'Check lower leaves and dry areas',
                    'description': 'Mites grow more on dry leaves and stressed plants. Focus on field corners or dry patches.',
                    'priority': 'medium',
                    'category': 'disease_management'
                },
                {
                    'title': 'Check moisture in loamy soil',
                    'description': 'If the top 3–4 inches feel dry, plan light irrigation. Mites increase when the plant is stressed due to dryness.',
                    'priority': 'medium',
                    'category': 'weather_advisory'
                }
            ]
        },

        {
            'day': 2,
            'tasks': [
                {
                    'title': 'Spray acaricide if mite level is high',
                    'description': 'Use Abamectin 200 ml per acre mixed in 100 liters of water. Spray under the leaves where mites hide.',
                    'priority': 'high',
                    'category': 'disease_management'
                },
                {
                    'title': 'Remove alternate host weeds',
                    'description': 'Clear weeds around the field because they store mites, especially grass-like weeds.',
                    'priority': 'medium',
                    'category': 'location_specific'
                },
                {
                    'title': 'Light irrigation to reduce stress',
                    'description': 'Give a light irrigation so plants recover. Loamy soil holds moisture well but should not dry completely.',
                    'priority': 'medium',
                    'category': 'crop_maintenance'
                }
            ]
        },

        {
            'day': 3,
            'tasks': [
                {
                    'title': 'Check if mites have reduced',
                    'description': 'Dead mites look brown or do not move when touched. Check yellow spots on leaves for improvement.',
                    'priority': 'high',
                    'category': 'disease_management'
                },
                {
                    'title': 'Apply balanced fertilizer',
                    'description': 'Apply balanced NPK. Avoid heavy nitrogen because it softens leaves and encourages sucking pests.',
                    'priority': 'medium',
                    'category': 'crop_maintenance'
                },
                {
                    'title': 'Remove dry leaves',
                    'description': 'Cut or remove old, dry wheat leaves because mites hide in them.',
                    'priority': 'low',
                    'category': 'location_specific'
                }
            ]
        },

        {
            'day': 4,
            'tasks': [
                {
                    'title': 'Second spray if mites still active',
                    'description': 'Use Propargite 300 ml per acre if mites continue. Change the chemical group to prevent resistance.',
                    'priority': 'medium',
                    'category': 'disease_management'
                },
                {
                    'title': 'Avoid harmful insecticides',
                    'description': 'Do not use broad-spectrum sprays. They kill helpful insects that eat mites.',
                    'priority': 'low',
                    'category': 'disease_management'
                },
                {
                    'title': 'Check soil moisture',
                    'description': 'Loamy soil should stay slightly moist. If it is dry 4–6 inches deep, give light watering.',
                    'priority': 'medium',
                    'category': 'location_specific'
                }
            ]
        },

        {
            'day': 5,
            'tasks': [
                {
                    'title': 'Final assessment of mite damage',
                    'description': 'Check if yellow spots have stopped spreading. If damage is stable or reducing, no more spray is needed.',
                    'priority': 'high',
                    'category': 'disease_management'
                },
                {
                    'title': 'Check for secondary pests',
                    'description': 'Look for thrips or aphids, which often appear after mite stress.',
                    'priority': 'medium',
                    'category': 'disease_management'
                },
                {
                    'title': 'Clean field edges',
                    'description': 'Remove weeds on borders to stop mites from coming back.',
                    'priority': 'medium',
                    'category': 'crop_maintenance'
                }
            ]
        },

        {
            'day': 6,
            'tasks': [
                {
                    'title': 'Record mite levels and sprays used',
                    'description': 'Write down spray name, amount, area treated, and results. This helps next season.',
                    'priority': 'low',
                    'category': 'crop_maintenance'
                },
                {
                    'title': 'Plan preventive steps',
                    'description': 'Improve field sanitation, avoid drought stress, and plan early sowing next year.',
                    'priority': 'low',
                    'category': 'disease_management'
                },
                {
                    'title': 'Irrigate if soil drying again',
                    'description': 'Loamy soil normally needs water every 4–6 days. Keep moisture moderate to protect plants from mites.',
                    'priority': 'medium',
                    'category': 'crop_maintenance'
                }
            ]
        },

        {
            'day': 7,
            'tasks': [
                {
                    'title': 'Weekly complete field check',
                    'description': 'Walk the whole field and make sure new yellow spots are not appearing.',
                    'priority': 'high',
                    'category': 'disease_management'
                },
                {
                    'title': 'Review weekly weather forecast',
                    'description': 'Cold weather slows mites. Adjust irrigation depending on expected rain or cold.',
                    'priority': 'medium',
                    'category': 'weather_advisory'
                },
                {
                    'title': 'Keep soil and field clean',
                    'description': 'Remove dry plant parts and clean borders to avoid mite development.',
                    'priority': 'low',
                    'category': 'location_specific'
                }
            ]
        }
    ]
},
{
 'crop': 'wheat',
 'disease': 'Stem Fly',
 'location': 'Islamabad',
 'temperature_range': {'min': 3, 'max': 20},
 'day_plans': [
    {'day':1,'tasks':[
        {'title':'Check central leaf for deadheart','description':'If the central leaf pulls out easily and is dead, stem fly larva is inside.','priority':'high','category':'disease_management'},
        {'title':'Inspect base of plant','description':'Larva feeds inside stem near the first node. Look for tiny holes.','priority':'medium','category':'disease_management'},
        {'title':'Check soil moisture','description':'Keep loamy soil slightly moist. Dry soil increases plant stress.','priority':'medium','category':'crop_maintenance'},
    ]},
    {'day':2,'tasks':[
        {'title':'Spray recommended insecticide','description':'Use Cypermethrin 300 ml per acre to kill adult flies before egg laying.','priority':'high','category':'disease_management'},
        {'title':'Destroy infested tillers','description':'Remove heavily damaged plants to stop spread.','priority':'medium','category':'location_specific'},
        {'title':'Light irrigation','description':'Give light water to maintain steady moisture.','priority':'medium','category':'crop_maintenance'},
    ]},
    {'day':3,'tasks':[
        {'title':'Monitor new tillers','description':'Check if new growth is healthy. No fresh deadheart means treatment is working.','priority':'high','category':'disease_management'},
        {'title':'Apply balanced fertilizer','description':'Support new tiller growth with balanced NPK.','priority':'medium','category':'crop_maintenance'},
        {'title':'Remove weeds','description':'Grass weeds shelter adult flies. Clear borders.','priority':'low','category':'location_specific'},
    ]},
    {'day':4,'tasks':[
        {'title':'Second spray if adults still active','description':'Use Lambda-cyhalothrin 150 ml per acre.','priority':'medium','category':'disease_management'},
        {'title':'Avoid broad insecticides','description':'Help natural predators survive.','priority':'low','category':'disease_management'},
        {'title':'Check moisture again','description':'Water only if soil is dry 4–6 inches deep.','priority':'medium','category':'crop_maintenance'},
    ]},
    {'day':5,'tasks':[
        {'title':'Final damage check','description':'Deadheart should not increase. Count percent affected tillers.','priority':'high','category':'disease_management'},
        {'title':'Look for secondary pests','description':'Weak plants attract aphids and mites.','priority':'medium','category':'disease_management'},
        {'title':'Field cleaning','description':'Remove heavily damaged clumps.','priority':'medium','category':'crop_maintenance'},
    ]},
    {'day':6,'tasks':[
        {'title':'Record observations','description':'Note deadheart percentage and sprays applied.','priority':'low','category':'crop_maintenance'},
        {'title':'Plan prevention','description':'Next year use early sowing and seed treatment.','priority':'low','category':'disease_management'},
        {'title':'Irrigate lightly','description':'Support tiller recovery.','priority':'medium','category':'crop_maintenance'},
    ]},
    {'day':7,'tasks':[
        {'title':'Weekly full walk','description':'Check entire field for any new symptoms.','priority':'high','category':'disease_management'},
        {'title':'Check weather forecast','description':'Cold reduces fly activity. Adjust irrigation.','priority':'medium','category':'weather_advisory'},
        {'title':'Clean borders','description':'Remove plant residues to prevent larvae survival.','priority':'low','category':'location_specific'},
    ]}
 ]
},
{
 'crop': 'wheat',
 'disease': 'Wheat Coccin (Beneficial)',
 'location': 'Islamabad',
 'temperature_range': {'min': 3, 'max': 20},
 'day_plans': [
    {'day':1,'tasks':[
        {'title':'Identify coccin beetles','description':'These beetles are round and eat harmful pests. Do not confuse them with pests.','priority':'high','category':'disease_management'},
        {'title':'Avoid unnecessary sprays','description':'Protect beneficial insects.','priority':'high','category':'disease_management'},
        {'title':'Check soil moisture','description':'Keep loamy soil slightly moist for plant health.','priority':'medium','category':'crop_maintenance'},
    ]},
    {'day':2,'tasks':[
        {'title':'Protect beetle habitat','description':'Do not spray broad pesticides that kill good insects.','priority':'high'},
        {'title':'Grow flowering borders','description':'Attract more beneficial insects.','priority':'medium'},
        {'title':'Light irrigation','description':'Moisture helps wheat recover from pest feeding.','priority':'medium'},
    ]},
    {'day':3,'tasks':[
        {'title':'Count beneficial beetles','description':'More beetles mean natural pest control is working.','priority':'high'},
        {'title':'Apply mild fertilizer','description':'Support healthy crop growth.','priority':'medium'},
        {'title':'Keep weeds moderate','description':'Some weeds support beneficial insects but remove harmful ones.','priority':'low'},
    ]},
    {'day':4,'tasks':[
        {'title':'Stop chemical rotation briefly','description':'Allow beetle population to increase.','priority':'medium'},
        {'title':'Avoid dust on leaves','description':'Dust reduces beetle activity. Wet soil slightly if dusty.','priority':'low'},
        {'title':'Check moisture','description':'Loamy soil should not dry fully.','priority':'medium'},
    ]},
    {'day':5,'tasks':[
        {'title':'Watch pest levels','description':'If pests decreasing naturally, avoid spray.','priority':'high'},
        {'title':'Look for eggs','description':'Beetles lay yellow eggs on leaves. Protect them.','priority':'medium'},
        {'title':'Clean field lightly','description':'Remove only harmful weeds.','priority':'low'},
    ]},
    {'day':6,'tasks':[
        {'title':'Record beneficial presence','description':'Write down beetle numbers.','priority':'low'},
        {'title':'Plan long term','description':'Encourage natural predators.','priority':'low'},
        {'title':'Irrigation check','description':'Water if soil is dry 4–6 inches.','priority':'medium'},
    ]},
    {'day':7,'tasks':[
        {'title':'Weekly inspection','description':'Ensure beetles remain active in field.','priority':'high'},
        {'title':'Plan next week','description':'Avoid chemicals unless pest level crosses threshold.','priority':'medium'},
        {'title':'Field hygiene','description':'Keep environment healthy for beneficial insects.','priority':'low'},
    ]}
 ]
},
{
 'crop': 'wheat',
 'disease': 'Black Rust',
 'location': 'Islamabad',
 'temperature_range': {'min': 3, 'max': 20},
 'day_plans': [
    {'day':1, 'tasks':[
        {'title':'Check leaves for black pustules','description':'Look for raised black spots on stems and leaves.','priority':'high','category':'disease_management'},
        {'title':'Remove early infected leaves','description':'Cut initial infected leaves to slow spread.','priority':'medium'},
        {'title':'Check soil moisture','description':'Keep loamy soil slightly moist. Avoid overwatering.','priority':'medium'}
    ]},
    {'day':2,'tasks':[
        {'title':'Spray fungicide','description':'Use Propiconazole 200 ml per acre.','priority':'high'},
        {'title':'Avoid overhead irrigation','description':'Water at base because wet leaves increase rust spread.','priority':'medium'},
        {'title':'Remove grassy weeds','description':'These weeds help rust survive.','priority':'medium'}
    ]},
    {'day':3,'tasks':[
        {'title':'Check new infection','description':'Look for new pustules. If increasing, treatment must continue.','priority':'high'},
        {'title':'Apply mild NPK','description':'Supports plant resistance but avoid heavy nitrogen.','priority':'medium'},
        {'title':'Clean tools','description':'Avoid carrying spores.','priority':'low'}
    ]},
    {'day':4,'tasks':[
        {'title':'Second fungicide spray','description':'Use Tebuconazole 150 ml per acre if disease continues.','priority':'medium'},
        {'title':'Avoid touching leaves','description':'Spore spread increases by contact.','priority':'low'},
        {'title':'Moisture check','description':'Ensure soil not waterlogged.','priority':'medium'}
    ]},
    {'day':5,'tasks':[
        {'title':'Final rust count','description':'Disease should stop spreading after fungicide.','priority':'high'},
        {'title':'Remove infected debris','description':'Collect and burn infected leaves.','priority':'medium'},
        {'title':'Field cleaning','description':'Clean borders and trash.','priority':'low'}
    ]},
    {'day':6,'tasks':[
        {'title':'Record observations','description':'Note fungicide effect.','priority':'low'},
        {'title':'Plan preventive steps','description':'Next year use rust-resistant varieties.','priority':'low'},
        {'title':'Irrigate lightly','description':'Only if soil dry 4–6 inches.','priority':'medium'}
    ]},
    {'day':7,'tasks':[
        {'title':'Weekly full check','description':'Walk whole field to ensure rust is under control.','priority':'high'},
        {'title':'Plan weather-based actions','description':'Cold reduces rust spread.','priority':'medium'},
        {'title':'Keep field clean','description':'Remove leftover infected parts.','priority':'low'}
    ]}
 ]
},
{
 'crop': 'wheat',
 'disease': 'Brown Rust',
 'location': 'Islamabad',
 'temperature_range': {'min': 3, 'max': 20},
 'day_plans': [
    {'day':1,'tasks':[
        {'title':'Check for brown powder spots','description':'Small, round brown pustules on leaves.','priority':'high'},
        {'title':'Cut infected leaves','description':'Remove early spots to slow spread.','priority':'medium'},
        {'title':'Soil moisture check','description':'Avoid leaf wetness. Use base irrigation.','priority':'medium'}
    ]},
    {'day':2,'tasks':[
        {'title':'Spray fungicide','description':'Use Tilt (Propiconazole) 200 ml per acre.','priority':'high'},
        {'title':'Clean weeds','description':'Reduces rust spread.','priority':'medium'},
        {'title':'Light irrigation','description':'Keep soil moist but avoid wet leaves.','priority':'medium'}
    ]},
    {'day':3,'tasks':[
        {'title':'Check new infection','description':'Look for new brown spots.','priority':'high'},
        {'title':'Apply mild NPK','description':'Helps leaf recovery.','priority':'medium'},
        {'title':'Remove debris','description':'Clean rust-affected leaves.','priority':'low'}
    ]},
    {'day':4,'tasks':[
        {'title':'Optional second spray','description':'Use Tebuconazole 150 ml per acre.','priority':'medium'},
        {'title':'Avoid leaf wetting','description':'Do not flood irrigate.','priority':'medium'},
        {'title':'Check moisture','description':'Irrigate only if needed.','priority':'medium'}
    ]},
    {'day':5,'tasks':[
        {'title':'Assessment','description':'Brown spots should dry and reduce.','priority':'high'},
        {'title':'Border cleaning','description':'Remove infected trash.','priority':'medium'},
        {'title':'Look for other rusts','description':'Yellow rust may also appear.','priority':'medium'}
    ]},
    {'day':6,'tasks':[
        {'title':'Record rust level','description':'Important for future planning.','priority':'low'},
        {'title':'Plan resistant varieties','description':'Use rust-resistant seeds next year.','priority':'low'},
        {'title':'Irrigation','description':'Light if soil dry.','priority':'medium'}
    ]},
    {'day':7,'tasks':[
        {'title':'Final inspection','description':'Walk field and check leaf health.','priority':'high'},
        {'title':'Weather check','description':'Cold helps reduce spread.','priority':'medium'},
        {'title':'Field hygiene','description':'Dispose infected material.','priority':'low'}
    ]}
 ]
},
{
 'crop': 'wheat',
 'disease': 'Yellow Rust',
 'location': 'Islamabad',
 'temperature_range': {'min': 3, 'max': 20},
 'day_plans': [
    {'day':1,'tasks':[
        {'title':'Check pale yellow lines','description':'Yellow rust shows straight yellow lines on leaves.','priority':'high'},
        {'title':'Mark infected patches','description':'Helps focus spray area.','priority':'medium'},
        {'title':'Avoid overhead irrigation','description':'Keep leaves dry.','priority':'medium'}
    ]},
    {'day':2,'tasks':[
        {'title':'Spray fungicide','description':'Use Tebuconazole 200 ml per acre.','priority':'high'},
        {'title':'Spray infested patches first','description':'Rust spreads quickly in cold.','priority':'high'},
        {'title':'Light irrigation','description':'Maintain moderate soil moisture.','priority':'medium'}
    ]},
    {'day':3,'tasks':[
        {'title':'Recheck hot spots','description':'If yellow lines continue, prepare second spray.','priority':'high'},
        {'title':'Apply balanced fertilizer','description':'Avoid heavy nitrogen.','priority':'medium'},
        {'title':'Remove infected leaves','description':'Dispose away from field.','priority':'low'}
    ]},
    {'day':4,'tasks':[
        {'title':'Second spray','description':'Use Propiconazole 150–200 ml per acre.','priority':'high'},
        {'title':'Do not apply water on leaves','description':'Rust needs moisture to grow.','priority':'medium'},
        {'title':'Check soil moisture','description':'Only irrigate when 4–6 inches dry.','priority':'medium'}
    ]},
    {'day':5,'tasks':[
        {'title':'Final rust evaluation','description':'Yellow lines should stop spreading.','priority':'high'},
        {'title':'Remove trash','description':'Rust can survive on debris.','priority':'medium'},
        {'title':'Check other diseases','description':'Brown and black rust may also appear.','priority':'low'}
    ]},
    {'day':6,'tasks':[
        {'title':'Record rust severity','description':'Useful for resistant variety selection.','priority':'low'},
        {'title':'Plan preventive actions','description':'Use resistant varieties.','priority':'low'},
        {'title':'Light irrigation','description':'If soil dry, water lightly.','priority':'medium'}
    ]},
    {'day':7,'tasks':[
        {'title':'Complete field survey','description':'Confirm no new yellow lines.','priority':'high'},
        {'title':'Adjust plan for next week','description':'Keep leaves dry.','priority':'medium'},
        {'title':'Field hygiene','description':'Burn infected debris.','priority':'low'}
    ]}
 ]
},
{
 'crop': 'wheat',
 'disease': 'Black Point',
 'location': 'Islamabad',
 'temperature_range': {'min': 3, 'max': 20},
 'day_plans': [
    {'day':1,'tasks':[
        {'title':'Check grains at milk stage','description':'Look for black or dark brown patches near the embryo end.','priority':'high'},
        {'title':'Improve airflow','description':'Thin dense areas so panicles dry quickly.','priority':'medium'},
        {'title':'Check soil moisture','description':'Avoid excessive watering, keep soil slightly moist only.','priority':'medium'}
    ]},
    {'day':2,'tasks':[
        {'title':'Spray fungicide','description':'Use Tebuconazole 150 ml per acre early in grain formation.','priority':'high'},
        {'title':'Avoid late irrigation','description':'Wet heads increase disease risk.','priority':'medium'},
        {'title':'Clean borders','description':'Remove grasses that trap humidity.','priority':'medium'}
    ]},
    {'day':3,'tasks':[
        {'title':'Recheck grain heads','description':'Look for new black patches forming.','priority':'high'},
        {'title':'Apply balanced fertilizer','description':'Improves grain strength and reduces rot.','priority':'medium'},
        {'title':'Clear wet spots','description':'Remove water from low areas.','priority':'low'}
    ]},
    {'day':4,'tasks':[
        {'title':'Second preventive spray','description':'Use Propiconazole 200 ml per acre if weather stays moist.','priority':'medium'},
        {'title':'Avoid overhead watering','description':'Keep heads dry.','priority':'medium'},
        {'title':'Moisture check','description':'Irrigate only if soil dry 4–6 inches.','priority':'medium'}
    ]},
    {'day':5,'tasks':[
        {'title':'Final grain inspection','description':'Blackening should slow if controlled early.','priority':'high'},
        {'title':'Remove heavily infected spikes','description':'Reduce spread to nearby grains.','priority':'medium'},
        {'title':'Field cleaning','description':'Remove trash.','priority':'low'}
    ]},
    {'day':6,'tasks':[
        {'title':'Record black point severity','description':'Important for grain quality control.','priority':'low'},
        {'title':'Plan prevention','description':'Next season avoid water at grain formation.','priority':'low'},
        {'title':'Irrigation','description':'Light irrigation if needed.','priority':'medium'}
    ]},
    {'day':7,'tasks':[
        {'title':'Complete field walk','description':'Ensure new grains not turning black.','priority':'high'},
        {'title':'Weather review','description':'Avoid irrigating before rain.','priority':'medium'},
        {'title':'Maintain field hygiene','description':'Dispose infected heads.','priority':'low'}
    ]}
 ]
},
{
 'crop': 'wheat',
 'disease': 'Common Root Rot',
 'location': 'Islamabad',
 'temperature_range': {'min': 3, 'max': 20},
 'day_plans': [
    {'day':1,'tasks':[
        {'title':'Inspect roots of weak plants','description':'Pull few plants; check brown lesions on roots and crown.','priority':'high'},
        {'title':'Improve drainage','description':'Loamy soil drains well but clear blocked areas.','priority':'high'},
        {'title':'Avoid overwatering','description':'Wet soil increases root rot.','priority':'medium'}
    ]},
    {'day':2,'tasks':[
        {'title':'Apply fungicide drench','description':'Use Carbendazim 250 ml per acre with irrigation water.','priority':'high'},
        {'title':'Remove severely affected plants','description':'Stop spread to nearby roots.','priority':'medium'},
        {'title':'Light irrigation only','description':'Do not flood field.','priority':'medium'}
    ]},
    {'day':3,'tasks':[
        {'title':'Check new root growth','description':'Healthy roots are white. Black or brown means rot continuing.','priority':'high'},
        {'title':'Apply mild fertilizer','description':'Helps recovery of healthy plants.','priority':'medium'},
        {'title':'Improve airflow between rows','description':'Reduces humidity at soil surface.','priority':'low'}
    ]},
    {'day':4,'tasks':[
        {'title':'Second root drench','description':'Repeat Carbendazim 150 ml per acre if rot severe.','priority':'medium'},
        {'title':'Avoid heavy irrigation','description':'Keep moisture moderate only.','priority':'medium'},
        {'title':'Check moisture depth','description':'Soil should be moist only in top 3–4 inches.','priority':'low'}
    ]},
    {'day':5,'tasks':[
        {'title':'Assess plant stand','description':'Weak plants may not recover. Remove them.','priority':'high'},
        {'title':'Field sanitization','description':'Remove old roots and debris.','priority':'medium'},
        {'title':'Watch for fungal smell','description':'Rot gives foul smell.','priority':'low'}
    ]},
    {'day':6,'tasks':[
        {'title':'Record rot percentage','description':'For future crop planning.','priority':'low'},
        {'title':'Plan crop rotation','description':'Avoid wheat in same field next year.','priority':'low'},
        {'title':'Irrigate lightly','description':'Only if needed.','priority':'medium'}
    ]},
    {'day':7,'tasks':[
        {'title':'Weekly root check','description':'Pull sample plants. Confirm improvement.','priority':'high'},
        {'title':'Check weather','description':'Cold helps slow fungus. Avoid unnecessary water.','priority':'medium'},
        {'title':'Clean borders','description':'Remove stagnant debris.','priority':'low'}
    ]}
 ]
},
{
 'crop': 'wheat',
 'disease': 'Head Blast',
 'location': 'Islamabad',
 'temperature_range': {'min': 3, 'max': 20},
 'day_plans': [
    {'day':1,'tasks':[
        {'title':'Check wheat heads','description':'White empty heads or burnt-like grains indicate blast.','priority':'high'},
        {'title':'Mark infected patches','description':'Helps targeted treatment.','priority':'medium'},
        {'title':'Keep leaves dry','description':'Avoid overhead irrigation.','priority':'medium'}
    ]},
    {'day':2,'tasks':[
        {'title':'Spray fungicide','description':'Use Trifloxystrobin + Tebuconazole 200 ml per acre.','priority':'high'},
        {'title':'Focus on infected patches','description':'Blast spreads fast.','priority':'high'},
        {'title':'Light irrigation','description':'Only if soil dry.','priority':'medium'}
    ]},
    {'day':3,'tasks':[
        {'title':'Check new heads','description':'Look for fresh white heads.','priority':'high'},
        {'title':'Apply potassium fertilizer','description':'Strengthens plant tissues.','priority':'medium'},
        {'title':'Remove infected heads','description':'Reduces further spread.','priority':'low'}
    ]},
    {'day':4,'tasks':[
        {'title':'Second fungicide spray','description':'Repeat Tebuconazole 150 ml per acre if disease persists.','priority':'medium'},
        {'title':'Avoid watering heads','description':'Keep canopy dry.','priority':'medium'},
        {'title':'Check moisture','description':'Irrigate only if needed.','priority':'medium'}
    ]},
    {'day':5,'tasks':[
        {'title':'Final blast check','description':'New infections should reduce.','priority':'high'},
        {'title':'Clear infected debris','description':'Remove white empty heads.','priority':'medium'},
        {'title':'Lower humidity','description':'Open field channels.','priority':'low'}
    ]},
    {'day':6,'tasks':[
        {'title':'Record blast incidence','description':'Important for future control.','priority':'low'},
        {'title':'Plan resistant varieties','description':'Use blast-resistant seeds next season.','priority':'low'},
        {'title':'Irrigate lightly','description':'If soil dry.','priority':'medium'}
    ]},
    {'day':7,'tasks':[
        {'title':'Weekly full check','description':'Ensure no new white heads.','priority':'high'},
        {'title':'Check weather','description':'Rain increases blast; avoid irrigation before rain.','priority':'medium'},
        {'title':'Field cleaning','description':'Remove any remaining infected parts.','priority':'low'}
    ]}
 ]
},
{
 'crop': 'wheat',
 'disease': 'Fusarium Head Blight',
 'location': 'Islamabad',
 'temperature_range': {'min': 3, 'max': 20},
 'day_plans': [
    {'day':1,'tasks':[
        {'title':'Check wheat heads','description':'Look for pinkish or white mold on spikes. Some grains appear shriveled.','priority':'high'},
        {'title':'Avoid wetting heads','description':'Do not irrigate when heads are wet.','priority':'high'},
        {'title':'Check soil moisture','description':'Give only light irrigation if needed.','priority':'medium'}
    ]},
    {'day':2,'tasks':[
        {'title':'Spray fungicide','description':'Use Tebuconazole 200 ml per acre at early flowering.','priority':'high'},
        {'title':'Remove highly infected heads','description':'Collect and dispose to reduce spread.','priority':'medium'},
        {'title':'Clean field edges','description':'Remove grasses that trap humidity.','priority':'medium'}
    ]},
    {'day':3,'tasks':[
        {'title':'Check new spike infections','description':'Pink mold should reduce after spraying.','priority':'high'},
        {'title':'Apply potassium fertilizer','description':'Improves resistance.','priority':'medium'},
        {'title':'Remove moist debris','description':'Avoid fungal growth in trash.','priority':'low'}
    ]},
    {'day':4,'tasks':[
        {'title':'Second fungicide spray (if needed)','description':'Repeat Propiconazole 150 ml per acre.','priority':'medium'},
        {'title':'Avoid irrigation on canopy','description':'Keep heads dry.','priority':'medium'},
        {'title':'Soil moisture check','description':'Irrigate only when 4–6 inches dry.','priority':'medium'}
    ]},
    {'day':5,'tasks':[
        {'title':'Final FHB check','description':'Pink mold should stop spreading.','priority':'high'},
        {'title':'Remove infected grains','description':'Stops toxin-producing fungus.','priority':'medium'},
        {'title':'Improve airflow','description':'Open channels for wind.','priority':'low'}
    ]},
    {'day':6,'tasks':[
        {'title':'Record infection level','description':'Helps in grain quality decisions.','priority':'low'},
        {'title':'Plan resistant varieties','description':'Use FHB-resistant seeds next year.','priority':'low'},
        {'title':'Light irrigation','description':'Only if soil is dry.','priority':'medium'}
    ]},
    {'day':7,'tasks':[
        {'title':'Weekly field check','description':'No new pink or white mold should appear.','priority':'high'},
        {'title':'Weather review','description':'Avoid watering near rain.','priority':'medium'},
        {'title':'Keep field clean','description':'Remove infected heads.','priority':'low'}
    ]}
 ]
},
{
 'crop': 'wheat',
 'disease': 'Fusarium Foot Rot',
 'location': 'Islamabad',
 'temperature_range': {'min': 3, 'max': 20},
 'day_plans': [
    {'day':1,'tasks':[
        {'title':'Check stem base','description':'Look for brown or pink lesions near ground level.','priority':'high'},
        {'title':'Ensure proper drainage','description':'Loamy soil drains well but remove blocked spots.','priority':'high'},
        {'title':'Avoid overwatering','description':'Wet soil increases fungal growth.','priority':'medium'}
    ]},
    {'day':2,'tasks':[
        {'title':'Apply fungicide drench','description':'Use Carbendazim 250 ml per acre with irrigation water.','priority':'high'},
        {'title':'Remove severely infected plants','description':'Stops fungus from spreading root to root.','priority':'medium'},
        {'title':'Light irrigation only','description':'Avoid flooding.','priority':'medium'}
    ]},
    {'day':3,'tasks':[
        {'title':'Recheck roots','description':'Healthy roots should be white. Pink means active fungus.','priority':'high'},
        {'title':'Apply mild NPK','description':'Helps root recovery.','priority':'medium'},
        {'title':'Improve airflow','description':'Reduce moisture near soil.','priority':'low'}
    ]},
    {'day':4,'tasks':[
        {'title':'Second drench','description':'Use Carbendazim 150 ml per acre if rot continues.','priority':'medium'},
        {'title':'Avoid excess water','description':'Wet roots worsen disease.','priority':'medium'},
        {'title':'Check soil moisture level','description':'Top 3–4 inches should stay slightly moist.','priority':'low'}
    ]},
    {'day':5,'tasks':[
        {'title':'Assess plant strength','description':'Weak stems may fall over. Remove them.','priority':'high'},
        {'title':'Remove crop residues','description':'Fusarium survives on old roots.','priority':'medium'},
        {'title':'Field cleaning','description':'Keep soil surface dry.','priority':'low'}
    ]},
    {'day':6,'tasks':[
        {'title':'Record foot rot presence','description':'Important for next crop.','priority':'low'},
        {'title':'Plan crop rotation','description':'Do not plant wheat next year on same soil.','priority':'low'},
        {'title':'Water lightly','description':'Only when soil dry.','priority':'medium'}
    ]},
    {'day':7,'tasks':[
        {'title':'Weekly root check','description':'Pull sample plants to confirm improvement.','priority':'high'},
        {'title':'Weather review','description':'Cold slows fungus.','priority':'medium'},
        {'title':'Clean borders','description':'Remove leftover roots.','priority':'low'}
    ]}
 ]
},
{
 'crop': 'wheat',
 'disease': 'Leaf Blight (Spot Blotch)',
 'location': 'Islamabad',
 'temperature_range': {'min': 3, 'max': 20},
 'day_plans': [
    {'day':1,'tasks':[
        {'title':'Check for brown spots','description':'Spot blotch starts as dark brown round spots on lower leaves.','priority':'high'},
        {'title':'Remove infected leaves','description':'Reduce spread to upper leaves.','priority':'medium'},
        {'title':'Check soil moisture','description':'Avoid standing water.','priority':'medium'}
    ]},
    {'day':2,'tasks':[
        {'title':'Spray fungicide','description':'Use Mancozeb 400 g per acre.','priority':'high'},
        {'title':'Clear weeds','description':'Weeds increase humidity.','priority':'medium'},
        {'title':'Light irrigation','description':'Avoid wetting leaves.','priority':'medium'}
    ]},
    {'day':3,'tasks':[
        {'title':'Check upper leaves','description':'Ensure blotches not moving upward.','priority':'high'},
        {'title':'Apply mild NPK','description':'Helps leaf recovery.','priority':'medium'},
        {'title':'Clean debris','description':'Remove infected leaves.','priority':'low'}
    ]},
    {'day':4,'tasks':[
        {'title':'Second spray','description':'Use Propiconazole 150 ml per acre if needed.','priority':'medium'},
        {'title':'Avoid overhead irrigation','description':'Keep leaves dry.','priority':'medium'},
        {'title':'Soil moisture check','description':'Irrigate only if needed.','priority':'medium'}
    ]},
    {'day':5,'tasks':[
        {'title':'Check for new spots','description':'Disease should slow down.','priority':'high'},
        {'title':'Clear border weeds','description':'Reduce humidity.','priority':'medium'},
        {'title':'Field cleaning','description':'Dispose infected leaves.','priority':'low'}
    ]},
    {'day':6,'tasks':[
        {'title':'Record disease level','description':'Important for future planning.','priority':'low'},
        {'title':'Plan resistant varieties','description':'Spot-blotch resistant seeds help.','priority':'low'},
        {'title':'Light irrigation','description':'Keep moisture steady.','priority':'medium'}
    ]},
    {'day':7,'tasks':[
        {'title':'Weekly inspection','description':'Ensure top leaves healthy.','priority':'high'},
        {'title':'Weather check','description':'Rain increases risk.','priority':'medium'},
        {'title':'Clean field','description':'Maintain hygiene.','priority':'low'}
    ]}
 ]
},
{
 'crop': 'wheat',
 'disease': 'Leaf Blast',
 'location': 'Islamabad',
 'temperature_range': {'min': 3, 'max': 20},
 'day_plans': [
    {'day':1,'tasks':[
        {'title':'Identify diamond-shaped spots','description':'Gray center with brown border on leaves.','priority':'high'},
        {'title':'Remove heavily infected leaves','description':'Blast spreads fast.','priority':'high'},
        {'title':'Check irrigation','description':'Avoid overwatering. Keep leaves dry.','priority':'medium'}
    ]},
    {'day':2,'tasks':[
        {'title':'Spray fungicide','description':'Use Trifloxystrobin + Tebuconazole 200 ml per acre.','priority':'high'},
        {'title':'Clean grassy weeds','description':'Reduces humidity.','priority':'medium'},
        {'title':'Light irrigation','description':'Only if soil dry.','priority':'medium'}
    ]},
    {'day':3,'tasks':[
        {'title':'Check leaf tips','description':'Blast damages tips first.','priority':'high'},
        {'title':'Apply potassium','description':'Strengthens leaves.','priority':'medium'},
        {'title':'Remove infected debris','description':'Stops fungus.','priority':'low'}
    ]},
    {'day':4,'tasks':[
        {'title':'Second spray','description':'Use Tebuconazole 150 ml per acre.','priority':'medium'},
        {'title':'Avoid leaf wetness','description':'Do not water in evening.','priority':'medium'},
        {'title':'Moisture check','description':'Water only when soil dry 4–6 inches.','priority':'medium'}
    ]},
    {'day':5,'tasks':[
        {'title':'Final blast evaluation','description':'Check if new spots forming.','priority':'high'},
        {'title':'Clear borders','description':'Reduce moisture traps.','priority':'medium'},
        {'title':'Field cleaning','description':'Dispose infected leaves.','priority':'low'}
    ]},
    {'day':6,'tasks':[
        {'title':'Record blast intensity','description':'Useful for future.','priority':'low'},
        {'title':'Plan resistant seeds','description':'Prevents leaf blast next season.','priority':'low'},
        {'title':'Light irrigation','description':'Keep soil balanced.','priority':'medium'}
    ]},
    {'day':7,'tasks':[
        {'title':'Weekly field check','description':'Ensure blast stopped.','priority':'high'},
        {'title':'Weather review','description':'Rain increases blast.','priority':'medium'},
        {'title':'Clean field','description':'Remove infected debris.','priority':'low'}
    ]}
 ]
},
{
 'crop': 'wheat',
 'disease': 'Powdery Mildew',
 'location': 'Islamabad',
 'temperature_range': {'min': 3, 'max': 20},
 'day_plans': [
    {'day':1,'tasks':[
        {'title':'Check leaves for white powder','description':'Look for white powdery patches on upper leaf surface.','priority':'high'},
        {'title':'Increase airflow','description':'Open blocked areas for air movement to reduce humidity.','priority':'medium'},
        {'title':'Check irrigation need','description':'Loamy soil holds moisture. Water only if top 4–6 inches dry.','priority':'medium'}
    ]},
    {'day':2,'tasks':[
        {'title':'Spray sulfur','description':'Apply wettable sulfur 600 g per acre.','priority':'high'},
        {'title':'Remove lower infected leaves','description':'Reduces disease spread.','priority':'medium'},
        {'title':'Clean weeds','description':'Weeds increase humidity, helping fungus.','priority':'low'}
    ]},
    {'day':3,'tasks':[
        {'title':'Check new growth','description':'Young leaves should be clean.','priority':'high'},
        {'title':'Apply mild NPK','description':'Avoid excess nitrogen.','priority':'medium'},
        {'title':'Clean field edges','description':'Remove grasses holding moisture.','priority':'low'}
    ]},
    {'day':4,'tasks':[
        {'title':'Second fungicide spray','description':'Use Propiconazole 150 ml per acre if mildew persists.','priority':'medium'},
        {'title':'Avoid overhead irrigation','description':'Keep leaves dry.','priority':'high'},
        {'title':'Check soil moisture','description':'Irrigate lightly only if needed.','priority':'medium'}
    ]},
    {'day':5,'tasks':[
        {'title':'Evaluate disease control','description':'White patches should dry and reduce.','priority':'high'},
        {'title':'Remove debris','description':'Dispose infected leaves.','priority':'medium'},
        {'title':'Improve airflow','description':'Open channels for wind to dry crop.','priority':'low'}
    ]},
    {'day':6,'tasks':[
        {'title':'Record infection level','description':'Helps next season.','priority':'low'},
        {'title':'Plan resistant varieties','description':'Use mildew-resistant seeds.','priority':'low'},
        {'title':'Light irrigation','description':'Avoid wetting leaves.','priority':'medium'}
    ]},
    {'day':7,'tasks':[
        {'title':'Weekly check','description':'Ensure mildew is not spreading upward.','priority':'high'},
        {'title':'Weather review','description':'Cold dry weather reduces mildew.','priority':'medium'},
        {'title':'Keep field clean','description':'Remove leftover infected leaves.','priority':'low'}
    ]}
 ]
},
{
 'crop': 'wheat',
 'disease': 'Septoria',
 'location': 'Islamabad',
 'temperature_range': {'min': 3, 'max': 20},
 'day_plans': [
    {'day':1,'tasks':[
        {'title':'Identify Septoria spots','description':'Brown irregular spots with black dots.','priority':'high'},
        {'title':'Remove lower infected leaves','description':'Stops fungus from climbing.','priority':'medium'},
        {'title':'Avoid wetting leaves','description':'Septoria spreads fast on wet leaves.','priority':'high'}
    ]},
    {'day':2,'tasks':[
        {'title':'Spray fungicide','description':'Apply Propiconazole 150 ml/acre OR Azoxystrobin 200 ml/acre.','priority':'high'},
        {'title':'Clear weeds','description':'Weeds raise humidity.','priority':'medium'},
        {'title':'Check soil moisture','description':'Irrigate lightly if soil dry.','priority':'medium'}
    ]},
    {'day':3,'tasks':[
        {'title':'Inspect upper leaves','description':'Ensure new spots not forming.','priority':'high'},
        {'title':'Apply light NPK','description':'Supports healthy growth.','priority':'medium'},
        {'title':'Remove infected debris','description':'Stops spores.','priority':'low'}
    ]},
    {'day':4,'tasks':[
        {'title':'Second spray','description':'Use Carbendazim 250 ml/acre if needed.','priority':'medium'},
        {'title':'Avoid irrigation','description':'Keep leaves dry.','priority':'high'},
        {'title':'Soil moisture check','description':'Water only if soil very dry.','priority':'medium'}
    ]},
    {'day':5,'tasks':[
        {'title':'Check lesions','description':'Infection should slow down.','priority':'high'},
        {'title':'Remove weeds and grasses','description':'Reduce humidity around crop.','priority':'medium'},
        {'title':'Clean field','description':'Dispose infected leaves.','priority':'low'}
    ]},
    {'day':6,'tasks':[
        {'title':'Record severity','description':'Helps future planning.','priority':'low'},
        {'title':'Plan rotation','description':'Avoid wheat after wheat.','priority':'low'},
        {'title':'Light irrigation','description':'If needed only.','priority':'medium'}
    ]},
    {'day':7,'tasks':[
        {'title':'Weekly check','description':'Top leaves should be safe.','priority':'high'},
        {'title':'Weather check','description':'Rain increases risk.','priority':'medium'},
        {'title':'Clean borders','description':'Remove infected plants.','priority':'low'}
    ]}
 ]
},
{
 'crop': 'wheat',
 'disease': 'Smut',
 'location': 'Islamabad',
 'temperature_range': {'min': 3, 'max': 20},
 'day_plans': [
    {'day':1,'tasks':[
        {'title':'Check ear heads','description':'Smut replaces grains with black powder.','priority':'high'},
        {'title':'Remove infected heads','description':'Stops spore spread.','priority':'high'},
        {'title':'Check moisture','description':'Keep soil slightly moist.','priority':'medium'}
    ]},
    {'day':2,'tasks':[
        {'title':'Apply seed treatment next season','description':'Treat seeds with Carboxin or Thiram.','priority':'high'},
        {'title':'Destroy infected heads','description':'Burn or bury deeply.','priority':'medium'},
        {'title':'Check weeds','description':'Weeds hold smut spores.','priority':'low'}
    ]},
    {'day':3,'tasks':[
        {'title':'Inspect plants','description':'Ensure no new smut balls appear.','priority':'high'},
        {'title':'Apply NPK','description':'Improves plant health.','priority':'medium'},
        {'title':'Clean debris','description':'Remove loose spores.','priority':'low'}
    ]},
    {'day':4,'tasks':[
        {'title':'Field sanitation','description':'Keep field dry and clean.','priority':'high'},
        {'title':'Check irrigation','description':'Avoid waterlogging.','priority':'medium'},
        {'title':'Clean borders','description':'Remove old cereal plants.','priority':'low'}
    ]},
    {'day':5,'tasks':[
        {'title':'Inspect new heads','description':'They should be normal.','priority':'high'},
        {'title':'Remove smutty spikes','description':'Prevents spread.','priority':'medium'},
        {'title':'Improve airflow','description':'Reduce humidity.','priority':'low'}
    ]},
    {'day':6,'tasks':[
        {'title':'Record smut presence','description':'Keep data for seed selection.','priority':'low'},
        {'title':'Plan clean seed use','description':'Use certified seeds only.','priority':'low'},
        {'title':'Light irrigation','description':'Irrigate only if soil dry.','priority':'medium'}
    ]},
    {'day':7,'tasks':[
        {'title':'Weekly inspection','description':'Remove any new infected heads.','priority':'high'},
        {'title':'Weather check','description':'Cool weather helps control.','priority':'medium'},
        {'title':'Clean field','description':'Remove residue.','priority':'low'}
    ]}
 ]
},
{
 'crop': 'wheat',
 'disease': 'Tan Spot',
 'location': 'Islamabad',
 'temperature_range': {'min': 3, 'max': 20},
 'day_plans': [
    {'day':1,'tasks':[
        {'title':'Identify tan lesions','description':'Brown spots with yellow halo.','priority':'high'},
        {'title':'Remove infected lower leaves','description':'Disease starts from bottom.','priority':'medium'},
        {'title':'Avoid overhead watering','description':'Keep leaves dry.','priority':'high'}
    ]},
    {'day':2,'tasks':[
        {'title':'Spray fungicide','description':'Use Mancozeb 400 g/acre or Propiconazole 150 ml/acre.','priority':'high'},
        {'title':'Clear crop debris','description':'Reduces spores.','priority':'medium'},
        {'title':'Light irrigation','description':'Only if soil dry.','priority':'medium'}
    ]},
    {'day':3,'tasks':[
        {'title':'Inspect middle leaves','description':'Tan spots should stop spreading.','priority':'high'},
        {'title':'Apply balanced fertilizer','description':'Promotes healthy new leaves.','priority':'medium'},
        {'title':'Clean field edges','description':'Remove grasses.','priority':'low'}
    ]},
    {'day':4,'tasks':[
        {'title':'Second spray','description':'Repeat Propiconazole if needed.','priority':'medium'},
        {'title':'Avoid wet conditions','description':'Moisture increases tan spot.','priority':'high'},
        {'title':'Check soil moisture','description':'Irrigate lightly if needed.','priority':'medium'}
    ]},
    {'day':5,'tasks':[
        {'title':'Final infection check','description':'Top leaves must stay clean.','priority':'high'},
        {'title':'Clear weeds','description':'Reduces humidity.','priority':'medium'},
        {'title':'Clean infected leaves','description':'Dispose properly.','priority':'low'}
    ]},
    {'day':6,'tasks':[
        {'title':'Record tan spot severity','description':'Useful for next crop.','priority':'low'},
        {'title':'Plan rotation','description':'Avoid wheat after wheat.','priority':'low'},
        {'title':'Light irrigation','description':'Keep moisture stable.','priority':'medium'}
    ]},
    {'day':7,'tasks':[
        {'title':'Weekly check','description':'Tan lesions should dry.','priority':'high'},
        {'title':'Weather review','description':'Rain increases risk.','priority':'medium'},
        {'title':'Keep field clean','description':'Maintain hygiene.','priority':'low'}
    ]}
 ]
},
{
 'crop': 'wheat',
 'disease': 'Wheat Scab',
 'location': 'Islamabad',
 'temperature_range': {'min': 3, 'max': 20},
 'day_plans': [
    {'day':1,'tasks':[
        {'title':'Inspect wheat heads','description':'Bleached spikelets and pink fungal growth indicate scab.','priority':'high'},
        {'title':'Avoid irrigation','description':'Do not wet wheat heads.','priority':'high'},
        {'title':'Check soil moisture','description':'Irrigate lightly only if soil very dry.','priority':'medium'}
    ]},
    {'day':2,'tasks':[
        {'title':'Spray fungicide','description':'Use Tebuconazole 200 ml/acre at early flowering.','priority':'high'},
        {'title':'Remove infected heads','description':'Dispose far from field.','priority':'medium'},
        {'title':'Clean weeds','description':'Reduce humidity in field.','priority':'low'}
    ]},
    {'day':3,'tasks':[
        {'title':'Check new infections','description':'Look for fresh pink growth.','priority':'high'},
        {'title':'Light fertilizer application','description':'Avoid heavy nitrogen.','priority':'medium'},
        {'title':'Remove debris','description':'Stops fungus spread.','priority':'low'}
    ]},
    {'day':4,'tasks':[
        {'title':'Second fungicide spray','description':'Use Propiconazole 150 ml/acre if needed.','priority':'medium'},
        {'title':'Avoid leaf wetness','description':'Keep crop dry.','priority':'high'},
        {'title':'Moisture check','description':'Irrigate only if required.','priority':'medium'}
    ]},
    {'day':5,'tasks':[
        {'title':'Check heads again','description':'Bleached spikelets should reduce.','priority':'high'},
        {'title':'Remove moldy grains','description':'Avoid toxin contamination.','priority':'medium'},
        {'title':'Keep field ventilated','description':'Improve airflow.','priority':'low'}
    ]},
    {'day':6,'tasks':[
        {'title':'Record scab level','description':'Very important for grain safety.','priority':'low'},
        {'title':'Plan rotation','description':'Avoid maize before wheat.','priority':'low'},
        {'title':'Light irrigation','description':'Only if soil dry 4–6 inches.','priority':'medium'}
    ]},
    {'day':7,'tasks':[
        {'title':'Weekly check','description':'No new pink mold should appear.','priority':'high'},
        {'title':'Weather review','description':'High humidity increases scab.','priority':'medium'},
        {'title':'Maintain field hygiene','description':'Remove diseased heads.','priority':'low'}
    ]}
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
    {
    'crop': 'rice',
    'disease': 'Brown Plant Hopper (BPH)',
    'location': 'Islamabad',
    'temperature_range': {'min': 3, 'max': 20},
    'day_plans': [
        {
            'day': 1,
            'tasks': [
                {
                    'title': 'Check for hopper burn patches',
                    'description': 'Inspect lower parts of plants for brown, drying patches and heavy hopper clusters.',
                    'priority': 'high',
                    'category': 'disease_management'
                },
                {
                    'title': 'Tap plants to observe BPH movement',
                    'description': 'Gently shake tillers; if many hoppers fall or jump, infestation is high.',
                    'priority': 'high',
                    'category': 'monitoring'
                },
                {
                    'title': 'Reduce standing water',
                    'description': 'Lower water level to discourage BPH buildup. Keep field just moist.',
                    'priority': 'medium',
                    'category': 'irrigation'
                }
            ]
        },
        {
            'day': 2,
            'tasks': [
                {
                    'title': 'Spray recommended insecticide',
                    'description': 'Apply Pymetrozine 120 ml/acre or Buprofezin to control active nymphs.',
                    'priority': 'high',
                    'category': 'disease_management'
                },
                {
                    'title': 'Remove weeds from bunds',
                    'description': 'Weeds serve as shelter for BPH. Clean surrounding areas.',
                    'priority': 'medium',
                    'category': 'location_specific'
                },
                {
                    'title': 'Check soil moisture',
                    'description': 'Water lightly only if top 3–4 inches of soil are dry.',
                    'priority': 'medium',
                    'category': 'irrigation'
                }
            ]
        },
        {
            'day': 3,
            'tasks': [
                {
                    'title': 'Assess nymph reduction',
                    'description': 'Inspect base of tillers for reduction in nymph numbers after spray.',
                    'priority': 'high',
                    'category': 'monitoring'
                },
                {
                    'title': 'Apply potash fertilizer',
                    'description': 'Potash strengthens plant resistance against hopper feeding.',
                    'priority': 'medium',
                    'category': 'crop_maintenance'
                },
                {
                    'title': 'Clean field edges',
                    'description': 'Trim grasses and remove debris to prevent reinfestation.',
                    'priority': 'low',
                    'category': 'location_specific'
                }
            ]
        },
        {
            'day': 4,
            'tasks': [
                {
                    'title': 'Second insecticide application if needed',
                    'description': 'Use Imidacloprid 150 ml/acre if BPH numbers still high.',
                    'priority': 'medium',
                    'category': 'disease_management'
                },
                {
                    'title': 'Avoid nitrogen-rich fertilizers',
                    'description': 'High nitrogen levels attract BPH and worsen outbreaks.',
                    'priority': 'medium',
                    'category': 'crop_maintenance'
                },
                {
                    'title': 'Avoid heavy irrigation',
                    'description': 'Wet fields support BPH population growth.',
                    'priority': 'medium',
                    'category': 'irrigation'
                }
            ]
        },
        {
            'day': 5,
            'tasks': [
                {
                    'title': 'Check hopper burn symptoms',
                    'description': 'See if leaf yellowing and drying have stopped spreading.',
                    'priority': 'high',
                    'category': 'monitoring'
                },
                {
                    'title': 'Cut weeds in field',
                    'description': 'Removing new weeds reduces shelter and breeding areas.',
                    'priority': 'medium',
                    'category': 'location_specific'
                },
                {
                    'title': 'Collect and destroy damaged tillers',
                    'description': 'Burn or bury damaged plant parts to prevent reinfestation.',
                    'priority': 'low',
                    'category': 'disease_management'
                }
            ]
        },
        {
            'day': 6,
            'tasks': [
                {
                    'title': 'Record hopper activity',
                    'description': 'Note hopper counts per hill to compare with previous days.',
                    'priority': 'low',
                    'category': 'monitoring'
                },
                {
                    'title': 'Plan resistant varieties',
                    'description': 'For next season: select BPH-resistant varieties like IRRI lines.',
                    'priority': 'low',
                    'category': 'crop_maintenance'
                },
                {
                    'title': 'Light irrigation',
                    'description': 'Irrigate carefully without flooding to avoid BPH resurgence.',
                    'priority': 'medium',
                    'category': 'irrigation'
                }
            ]
        },
        {
            'day': 7,
            'tasks': [
                {
                    'title': 'Weekly BPH population check',
                    'description': 'Perform a full field scan to ensure control is maintained.',
                    'priority': 'high',
                    'category': 'monitoring'
                },
                {
                    'title': 'Review weather conditions',
                    'description': 'Warm, humid weather favors BPH; plan for preventive actions.',
                    'priority': 'medium',
                    'category': 'location_specific'
                },
                {
                    'title': 'Maintain field hygiene',
                    'description': 'Keep weeds removed and bunds clean to prevent reinfestation.',
                    'priority': 'low',
                    'category': 'crop_maintenance'
                }
            ]
        }
    ]
},
{
    'crop': 'rice',
    'disease': 'Rice Leaf Hopper',
    'location': 'Islamabad',
    'temperature_range': {'min': 3, 'max': 20},
    'day_plans': [
        {
            'day': 1,
            'tasks': [
                {
                    'title': 'Inspect leaf margins and new tillers',
                    'description': 'Look for pale yellowing along leaf edges and stunted new tillers — classic leaf hopper feeding damage.',
                    'priority': 'high',
                    'category': 'monitoring'
                },
                {
                    'title': 'Tap test for hopper presence',
                    'description': 'Tap plants over a white sheet to count adults and nymphs; record numbers for threshold decision.',
                    'priority': 'high',
                    'category': 'monitoring'
                },
                {
                    'title': 'Avoid over-fertilization with nitrogen',
                    'description': 'High nitrogen encourages tender growth favored by leaf hoppers; reduce N applications this week.',
                    'priority': 'medium',
                    'category': 'crop_maintenance'
                }
            ]
        },
        {
            'day': 2,
            'tasks': [
                {
                    'title': 'Apply selective insecticide if threshold reached',
                    'description': 'If counts exceed economic threshold, spray Pymetrozine 120 ml/acre or Thiamethoxam per label instructions.',
                    'priority': 'high',
                    'category': 'disease_management'
                },
                {
                    'title': 'Encourage natural enemies',
                    'description': 'Avoid broad-spectrum insecticides where possible; preserve spiders and parasitoids which reduce leaf hopper numbers.',
                    'priority': 'medium',
                    'category': 'disease_management'
                },
                {
                    'title': 'Remove grassy weeds nearby',
                    'description': 'Clean field borders and irrigation channels where hoppers breed and hide.',
                    'priority': 'medium',
                    'category': 'location_specific'
                }
            ]
        },
        {
            'day': 3,
            'tasks': [
                {
                    'title': 'Assess spray effectiveness',
                    'description': 'Recount hoppers 24–48 hours after spray to confirm population decline.',
                    'priority': 'high',
                    'category': 'monitoring'
                },
                {
                    'title': 'Apply neem-based spray for low infestations',
                    'description': 'Use azadirachtin/neem oil for eco-friendly control where pressure is low.',
                    'priority': 'medium',
                    'category': 'disease_management'
                },
                {
                    'title': 'Check irrigation level',
                    'description': 'Maintain low water level (thin film) — not flooded — to reduce adult buildup.',
                    'priority': 'medium',
                    'category': 'irrigation'
                }
            ]
        },
        {
            'day': 4,
            'tasks': [
                {
                    'title': 'Scout for virus symptoms',
                    'description': 'Leaf hoppers can transmit viruses; look for mottling, stunting or abnormal tillers and mark affected areas.',
                    'priority': 'high',
                    'category': 'monitoring'
                },
                {
                    'title': 'Spot-treat hotspots',
                    'description': 'If small hot patches persist, spray only those areas to save beneficial insects.',
                    'priority': 'medium',
                    'category': 'disease_management'
                },
                {
                    'title': 'Avoid heavy irrigation',
                    'description': 'Do not flood; soggy conditions and tender regrowth attract more hoppers.',
                    'priority': 'medium',
                    'category': 'irrigation'
                }
            ]
        },
        {
            'day': 5,
            'tasks': [
                {
                    'title': 'Check crop vigor',
                    'description': 'Assess whether hopper feeding is causing yield loss (reduced tillering or poor grain set).',
                    'priority': 'high',
                    'category': 'monitoring'
                },
                {
                    'title': 'Apply potash if plants stressed',
                    'description': 'Potash can improve plant resilience; apply recommended dose to support recovery.',
                    'priority': 'medium',
                    'category': 'crop_maintenance'
                },
                {
                    'title': 'Prune/clear nearby vegetation',
                    'description': 'Remove tall grasses or weeds that shelter hoppers around the field.',
                    'priority': 'low',
                    'category': 'location_specific'
                }
            ]
        },
        {
            'day': 6,
            'tasks': [
                {
                    'title': 'Record weekly population and actions',
                    'description': 'Log hopper counts, sprays used, and weather to inform future control decisions.',
                    'priority': 'low',
                    'category': 'monitoring'
                },
                {
                    'title': 'Plan varietal choice for next season',
                    'description': 'Consider varieties with tolerance to hopper damage when replanting.',
                    'priority': 'low',
                    'category': 'crop_maintenance'
                },
                {
                    'title': 'Light irrigation if soil very dry',
                    'description': 'Provide minimal water without flooding; maintain moisture but avoid conditions favorable to hoppers.',
                    'priority': 'medium',
                    'category': 'irrigation'
                }
            ]
        },
        {
            'day': 7,
            'tasks': [
                {
                    'title': 'Full-field scan',
                    'description': 'Walk the field and re-evaluate leaf hopper status; ensure control measures have been effective.',
                    'priority': 'high',
                    'category': 'monitoring'
                },
                {
                    'title': 'Weather and risk review',
                    'description': 'Warm, dry conditions favor rapid hopper development; prepare for quick response if populations rebound.',
                    'priority': 'medium',
                    'category': 'location_specific'
                },
                {
                    'title': 'Maintain good field hygiene',
                    'description': 'Keep bunds trimmed and debris removed to lower future infestation risk.',
                    'priority': 'low',
                    'category': 'crop_maintenance'
                }
            ]
        }
    ]
},
{
    'crop': 'rice',
    'disease': 'Rice Leaf Roller',
    'location': 'Islamabad',
    'temperature_range': {'min': 3, 'max': 20},
    'day_plans': [
        {
            'day': 1,
            'tasks': [
                {
                    'title': 'Check for rolled leaves',
                    'description': 'Inspect young rice leaves for narrow tubes made by larvae feeding inside. Look for scraping marks and folded leaf tips.',
                    'priority': 'high',
                    'category': 'monitoring'
                },
                {
                    'title': 'Count larvae inside rolled leaves',
                    'description': 'Open 10–20 rolled leaves randomly to check for active greenish/yellow larvae.',
                    'priority': 'high',
                    'category': 'monitoring'
                },
                {
                    'title': 'Remove and destroy rolled leaves',
                    'description': 'Handpick and crush severely infested rolled leaves to reduce initial larval population.',
                    'priority': 'medium',
                    'category': 'disease_management'
                }
            ]
        },
        {
            'day': 2,
            'tasks': [
                {
                    'title': 'Spray selective insecticide',
                    'description': 'Apply Chlorantraniliprole 60 ml/acre or Flubendiamide per recommendation to target larvae inside leaves.',
                    'priority': 'high',
                    'category': 'disease_management'
                },
                {
                    'title': 'Avoid broad-spectrum sprays',
                    'description': 'Broad-spectrum insecticides kill natural enemies; avoid unless infestation is severe.',
                    'priority': 'medium',
                    'category': 'crop_maintenance'
                },
                {
                    'title': 'Trim weeds along bunds',
                    'description': 'Remove grasses that serve as secondary hosts and hiding shelters for larvae and adult moths.',
                    'priority': 'medium',
                    'category': 'location_specific'
                }
            ]
        },
        {
            'day': 3,
            'tasks': [
                {
                    'title': 'Check new leaf growth',
                    'description': 'Inspect newly emerging leaves to see if rolling has stopped or reduced after treatment.',
                    'priority': 'high',
                    'category': 'monitoring'
                },
                {
                    'title': 'Promote natural parasitoids',
                    'description': 'Leaf rollers are naturally controlled by Trichogramma and Bracon spp. Avoid unnecessary spraying.',
                    'priority': 'medium',
                    'category': 'disease_management'
                },
                {
                    'title': 'Maintain low water depth',
                    'description': 'Keep field lightly irrigated. Avoid deep flooding as it encourages moth activity.',
                    'priority': 'medium',
                    'category': 'irrigation'
                }
            ]
        },
        {
            'day': 4,
            'tasks': [
                {
                    'title': 'Spot-check for remaining larvae',
                    'description': 'Open rolled leaves from hotspot areas to verify if larvae remain active.',
                    'priority': 'high',
                    'category': 'monitoring'
                },
                {
                    'title': 'Apply second spray if needed',
                    'description': 'If more than 10% leaves are newly rolled, apply a second spray using a different chemical class.',
                    'priority': 'medium',
                    'category': 'disease_management'
                },
                {
                    'title': 'Check field drainage',
                    'description': 'Ensure there is no stagnant or standing water which may attract egg-laying moths.',
                    'priority': 'medium',
                    'category': 'irrigation'
                }
            ]
        },
        {
            'day': 5,
            'tasks': [
                {
                    'title': 'Evaluate reduction in rolled leaves',
                    'description': 'Calculate percentage of rolled leaves in 20 plants. A decline indicates recovery.',
                    'priority': 'high',
                    'category': 'monitoring'
                },
                {
                    'title': 'Strengthen crop health with potash',
                    'description': 'Apply potash if leaves appear pale or damaged to help recovery.',
                    'priority': 'medium',
                    'category': 'crop_maintenance'
                },
                {
                    'title': 'Destroy heavily infested clumps',
                    'description': 'Remove and burn severely damaged plant clusters to prevent spread.',
                    'priority': 'low',
                    'category': 'location_specific'
                }
            ]
        },
        {
            'day': 6,
            'tasks': [
                {
                    'title': 'Record pest activity and damage level',
                    'description': 'Maintain documentation of larvae numbers, new leaf rolling, and control measures used.',
                    'priority': 'low',
                    'category': 'monitoring'
                },
                {
                    'title': 'Plan for resistant rice varieties',
                    'description': 'Consider varieties with tolerance to leaf folder/leaf roller damage for next season.',
                    'priority': 'low',
                    'category': 'crop_maintenance'
                },
                {
                    'title': 'Light irrigation if soil is drying',
                    'description': 'Use minimal irrigation to support plant growth without encouraging moth activity.',
                    'priority': 'medium',
                    'category': 'irrigation'
                }
            ]
        },
        {
            'day': 7,
            'tasks': [
                {
                    'title': 'Full-field reassessment',
                    'description': 'Walk the entire field to confirm leaf rolling is under control and no new hotspots exist.',
                    'priority': 'high',
                    'category': 'monitoring'
                },
                {
                    'title': 'Check weather and pest risk',
                    'description': 'Cool and moist conditions favor egg laying; adjust future monitoring frequency.',
                    'priority': 'medium',
                    'category': 'location_specific'
                },
                {
                    'title': 'Maintain field sanitation',
                    'description': 'Remove lodged plants, weeds, and plant residues to discourage future infestations.',
                    'priority': 'low',
                    'category': 'crop_maintenance'
                }
            ]
        }
    ]
},
{
    'crop': 'rice',
    'disease': 'Green Leaf Hopper (GLH)',
    'location': 'Islamabad',
    'temperature_range': {'min': 3, 'max': 20},
    'day_plans': [
        {
            'day': 1,
            'tasks': [
                {
                    'title': 'Check for green jumping insects',
                    'description': 'Tap rice tillers gently; if small green insects jump or move quickly, GLH is present.',
                    'priority': 'high',
                    'category': 'monitoring'
                },
                {
                    'title': 'Inspect leaf tips for yellowing',
                    'description': 'GLH feeding causes leaves to turn yellow at tips, leading to stunted plants.',
                    'priority': 'high',
                    'category': 'monitoring'
                },
                {
                    'title': 'Reduce excess standing water',
                    'description': 'Avoid flooding; GLH populations increase in wet, humid fields.',
                    'priority': 'medium',
                    'category': 'irrigation'
                }
            ]
        },
        {
            'day': 2,
            'tasks': [
                {
                    'title': 'Apply selective insecticide',
                    'description': 'Spray Pymetrozine 120 ml/acre or Buprofezin for controlling active nymphs and adults.',
                    'priority': 'high',
                    'category': 'disease_management'
                },
                {
                    'title': 'Remove weeds around bunds',
                    'description': 'Weeds act as alternate hosts for GLH; clean bunds and irrigation channels.',
                    'priority': 'medium',
                    'category': 'location_specific'
                },
                {
                    'title': 'Light irrigation if soil is drying',
                    'description': 'Avoid over-watering; keep a thin film of water to prevent GLH multiplication.',
                    'priority': 'medium',
                    'category': 'irrigation'
                }
            ]
        },
        {
            'day': 3,
            'tasks': [
                {
                    'title': 'Check hopper population after spray',
                    'description': 'Inspect lower leaf sheaths and base of plants for reduction in hopper numbers.',
                    'priority': 'high',
                    'category': 'monitoring'
                },
                {
                    'title': 'Apply potash to strengthen plants',
                    'description': 'Potash improves plant resistance against sucking insects like GLH.',
                    'priority': 'medium',
                    'category': 'crop_maintenance'
                },
                {
                    'title': 'Clean field edges and debris',
                    'description': 'Remove grasses and leftover debris to prevent reinfestation.',
                    'priority': 'low',
                    'category': 'location_specific'
                }
            ]
        },
        {
            'day': 4,
            'tasks': [
                {
                    'title': 'Apply second insecticide if required',
                    'description': 'If GLH remain above threshold, use Imidacloprid 150 ml/acre as follow-up treatment.',
                    'priority': 'medium',
                    'category': 'disease_management'
                },
                {
                    'title': 'Avoid excessive nitrogen fertilizer',
                    'description': 'High nitrogen makes plants succulent and attracts GLH.',
                    'priority': 'medium',
                    'category': 'crop_maintenance'
                },
                {
                    'title': 'Avoid heavy irrigation',
                    'description': 'Maintain moderate water depth to prevent rapid increase of GLH.',
                    'priority': 'medium',
                    'category': 'irrigation'
                }
            ]
        },
        {
            'day': 5,
            'tasks': [
                {
                    'title': 'Inspect plant tips for recovery',
                    'description': 'Check if yellowing and curling symptoms are slowing down.',
                    'priority': 'high',
                    'category': 'monitoring'
                },
                {
                    'title': 'Cut and remove weeds',
                    'description': 'Weeds hide GLH eggs and nymphs; remove them regularly.',
                    'priority': 'medium',
                    'category': 'location_specific'
                },
                {
                    'title': 'Destroy damaged plant parts',
                    'description': 'Burn or bury leaves showing extensive damage to prevent population buildup.',
                    'priority': 'low',
                    'category': 'disease_management'
                }
            ]
        },
        {
            'day': 6,
            'tasks': [
                {
                    'title': 'Record GLH activity and trends',
                    'description': 'Note hopper counts, affected area, and spray results in a field diary.',
                    'priority': 'low',
                    'category': 'monitoring'
                },
                {
                    'title': 'Plan resistant varieties',
                    'description': 'Consider GLH-resistant cultivars like IRRI lines for the next season.',
                    'priority': 'low',
                    'category': 'crop_maintenance'
                },
                {
                    'title': 'Light irrigation only',
                    'description': 'Do not flood; provide minimal water just to maintain moisture.',
                    'priority': 'medium',
                    'category': 'irrigation'
                }
            ]
        },
        {
            'day': 7,
            'tasks': [
                {
                    'title': 'Weekly GLH inspection',
                    'description': 'Perform a full-field examination to ensure GLH control is maintained.',
                    'priority': 'high',
                    'category': 'monitoring'
                },
                {
                    'title': 'Review weather conditions',
                    'description': 'Warm and humid weather favors GLH; prepare for early action if such conditions return.',
                    'priority': 'medium',
                    'category': 'location_specific'
                },
                {
                    'title': 'Maintain clean field',
                    'description': 'Keep bunds, drains, and field edges weed-free to reduce GLH pressure.',
                    'priority': 'low',
                    'category': 'crop_maintenance'
                }
            ]
        }
    ]
},
{
    'crop': 'rice',
    'disease': 'Rice Leaf Roller (Reproductive Stage)',
    'location': 'Islamabad',
    'temperature_range': {'min': 3, 'max': 20},
    'day_plans': [
        {
            'day': 1,
            'tasks': [
                {
                    'title': 'Inspect leaves for rolling during booting/heading stage',
                    'description': 'Check if leaves near developing panicles are rolled tightly, indicating larvae feeding inside.',
                    'priority': 'high',
                    'category': 'monitoring'
                },
                {
                    'title': 'Open rolled leaves to check larvae',
                    'description': 'Larvae in reproductive stage cause more damage as they affect panicle emergence.',
                    'priority': 'high',
                    'category': 'monitoring'
                },
                {
                    'title': 'Maintain low irrigation depth',
                    'description': 'Avoid deep-water conditions because they favor moth laying under humid environment.',
                    'priority': 'medium',
                    'category': 'irrigation'
                }
            ]
        },

        {
            'day': 2,
            'tasks': [
                {
                    'title': 'Apply reproductive-stage focused insecticide',
                    'description': 'Spray Flubendiamide or Chlorantraniliprole to prevent larval feeding inside flag leaves.',
                    'priority': 'high',
                    'category': 'disease_management'
                },
                {
                    'title': 'Remove rolled leaves around panicle area',
                    'description': 'Destroy severely rolled leaves to protect panicle development.',
                    'priority': 'medium',
                    'category': 'disease_management'
                },
                {
                    'title': 'Clean bunds and nearby vegetation',
                    'description': 'Remove grasses and weeds where adult moths hide before laying eggs.',
                    'priority': 'medium',
                    'category': 'location_specific'
                }
            ]
        },

        {
            'day': 3,
            'tasks': [
                {
                    'title': 'Check panicle emergence after spray',
                    'description': 'Inspect panicle tips inside flag leaves to ensure reduced feeding injury.',
                    'priority': 'high',
                    'category': 'monitoring'
                },
                {
                    'title': 'Promote beneficial insects',
                    'description': 'Avoid broad-spectrum chemicals to allow parasitoids like Trichogramma to survive.',
                    'priority': 'medium',
                    'category': 'disease_management'
                },
                {
                    'title': 'Maintain soil moisture evenly',
                    'description': 'Provide only shallow water to avoid excessive humidity that attracts moths.',
                    'priority': 'medium',
                    'category': 'irrigation'
                }
            ]
        },

        {
            'day': 4,
            'tasks': [
                {
                    'title': 'Spot-treat new hotspots',
                    'description': 'If fresh rolling appears near flowering stage, spray only those areas to protect yield.',
                    'priority': 'high',
                    'category': 'disease_management'
                },
                {
                    'title': 'Avoid heavy nitrogen application',
                    'description': 'High nitrogen promotes rapid leaf growth that attracts moth laying activity.',
                    'priority': 'medium',
                    'category': 'crop_maintenance'
                },
                {
                    'title': 'Inspect flag leaves',
                    'description': 'Flag leaf damage significantly reduces grain filling; prioritize inspecting these leaves.',
                    'priority': 'medium',
                    'category': 'monitoring'
                }
            ]
        },

        {
            'day': 5,
            'tasks': [
                {
                    'title': 'Evaluate panicle emergence success',
                    'description': 'Check if panicles are emerging normally or still trapped due to rolled leaves.',
                    'priority': 'high',
                    'category': 'monitoring'
                },
                {
                    'title': 'Apply potash to strengthen plants',
                    'description': 'Potash helps flag leaf strength, reducing susceptibility to rolling stress.',
                    'priority': 'medium',
                    'category': 'crop_maintenance'
                },
                {
                    'title': 'Destroy severely damaged clumps',
                    'description': 'Remove and burn heavily affected areas to prevent further moth breeding.',
                    'priority': 'low',
                    'category': 'location_specific'
                }
            ]
        },

        {
            'day': 6,
            'tasks': [
                {
                    'title': 'Record damage on panicle-bearing nodes',
                    'description': 'Note panicles trapped or damaged during emergence for yield loss estimation.',
                    'priority': 'low',
                    'category': 'monitoring'
                },
                {
                    'title': 'Prepare reproductive-stage protection checklist',
                    'description': 'Document larval numbers, insecticides used, and timing to refine future management.',
                    'priority': 'low',
                    'category': 'crop_maintenance'
                },
                {
                    'title': 'Irrigate lightly if soil dries',
                    'description': 'Keep moisture adequate for panicle development without promoting moth habitat.',
                    'priority': 'medium',
                    'category': 'irrigation'
                }
            ]
        },

        {
            'day': 7,
            'tasks': [
                {
                    'title': 'Full-field scan of reproductive-stage injury',
                    'description': 'Inspect entire field for new rolling patterns affecting panicle emergence and grain formation.',
                    'priority': 'high',
                    'category': 'monitoring'
                },
                {
                    'title': 'Assess upcoming weather risk',
                    'description': 'Humidity and mild temperatures increase moth activity — prepare preventive steps.',
                    'priority': 'medium',
                    'category': 'location_specific'
                },
                {
                    'title': 'Maintain strict field cleanliness',
                    'description': 'Remove residues, weeds, and lodged plants to reduce future moth hiding sites.',
                    'priority': 'low',
                    'category': 'crop_maintenance'
                }
            ]
        }
    ]
},
{
    'crop': 'rice',
    'disease': 'Rice Stem Borer',
    'location': 'Islamabad',
    'temperature_range': {'min': 3, 'max': 20},
    'day_plans': [
        {
            'day': 1,
            'tasks': [
                {
                    'title': 'Check for deadhearts in early crop stage',
                    'description': 'Inspect central tillers that are drying, yellowing, or easily pulling out — signs of larval tunneling.',
                    'priority': 'high',
                    'category': 'monitoring'
                },
                {
                    'title': 'Look for egg masses on leaves',
                    'description': 'Moth egg clusters appear as yellowish patches under leaves; mark infested areas.',
                    'priority': 'high',
                    'category': 'monitoring'
                },
                {
                    'title': 'Hand remove heavily damaged tillers',
                    'description': 'Collect and destroy tillers showing severe tunneling to reduce larval load.',
                    'priority': 'medium',
                    'category': 'disease_management'
                }
            ]
        },

        {
            'day': 2,
            'tasks': [
                {
                    'title': 'Spray Triazophos or Cartap',
                    'description': 'Apply Triazophos 400 ml/acre or Cartap 4% granules to control larvae inside stems.',
                    'priority': 'high',
                    'category': 'disease_management'
                },
                {
                    'title': 'Level the field',
                    'description': 'Uniform water distribution reduces stem borer hotspots and egg-laying areas.',
                    'priority': 'medium',
                    'category': 'irrigation'
                },
                {
                    'title': 'Weed removal from bunds',
                    'description': 'Remove host weeds such as wild rice and grasses to reduce moth breeding.',
                    'priority': 'medium',
                    'category': 'location_specific'
                }
            ]
        },

        {
            'day': 3,
            'tasks': [
                {
                    'title': 'Monitor larval reduction',
                    'description': 'Check stems for new holes, frass, or active larvae after spray application.',
                    'priority': 'high',
                    'category': 'monitoring'
                },
                {
                    'title': 'Release Trichogramma cards',
                    'description': 'Place 50,000 parasitoids/acre to biologically control stem borer eggs.',
                    'priority': 'medium',
                    'category': 'disease_management'
                },
                {
                    'title': 'Clean field edges',
                    'description': 'Trim grasses and remove leftover plant debris where moths hide.',
                    'priority': 'low',
                    'category': 'location_specific'
                }
            ]
        },

        {
            'day': 4,
            'tasks': [
                {
                    'title': 'Apply Chlorantraniliprole if needed',
                    'description': 'Use 60 ml/acre if fresh deadhearts or whiteheads appear, indicating active larvae.',
                    'priority': 'medium',
                    'category': 'disease_management'
                },
                {
                    'title': 'Avoid high nitrogen fertilizer',
                    'description': 'Excessive nitrogen promotes lush growth that attracts egg-laying females.',
                    'priority': 'medium',
                    'category': 'crop_maintenance'
                },
                {
                    'title': 'Maintain 2–3 inches water depth',
                    'description': 'Avoid deep flooding which supports larval survival.',
                    'priority': 'medium',
                    'category': 'irrigation'
                }
            ]
        },

        {
            'day': 5,
            'tasks': [
                {
                    'title': 'Recheck deadheart percentage',
                    'description': 'Inspect 20 plants; less than 5% deadhearts indicates effective control.',
                    'priority': 'high',
                    'category': 'monitoring'
                },
                {
                    'title': 'Dispose removed tillers properly',
                    'description': 'Burn or bury damaged tillers to avoid reinfestation from surviving larvae.',
                    'priority': 'medium',
                    'category': 'disease_management'
                },
                {
                    'title': 'Check stems for pupae',
                    'description': 'Cut open stems randomly to check for pupation, indicating next moth emergence.',
                    'priority': 'low',
                    'category': 'monitoring'
                }
            ]
        },

        {
            'day': 6,
            'tasks': [
                {
                    'title': 'Record stem borer activity',
                    'description': 'Note larval counts, egg masses, deadheart numbers, and control actions taken.',
                    'priority': 'low',
                    'category': 'monitoring'
                },
                {
                    'title': 'Plan resistant varieties for next season',
                    'description': 'Select varieties like KSK-133 or Super Basmati known for better tolerance.',
                    'priority': 'low',
                    'category': 'crop_maintenance'
                },
                {
                    'title': 'Light irrigation only',
                    'description': 'Moisture should be maintained without flooding to avoid larval spread.',
                    'priority': 'medium',
                    'category': 'irrigation'
                }
            ]
        },

        {
            'day': 7,
            'tasks': [
                {
                    'title': 'Weekly stem inspection',
                    'description': 'Open 10–20 stems across field to confirm larval inactivity and absence of new tunnels.',
                    'priority': 'high',
                    'category': 'monitoring'
                },
                {
                    'title': 'Review weather risk',
                    'description': 'Warm, humid nights encourage moth egg-laying — prepare preventive steps.',
                    'priority': 'medium',
                    'category': 'location_specific'
                },
                {
                    'title': 'Maintain clean field conditions',
                    'description': 'Keep bunds clean, remove weeds, and remove lodged plants to limit moth hiding spots.',
                    'priority': 'low',
                    'category': 'crop_maintenance'
                }
            ]
        }
    ]
},
{
    "crop": "rice",
    "disease": "Rice Blast",
    "location": "Islamabad",
    "temperature_range": {"min": 3, "max": 20},
    "day_plans": [
        {
            "day": 1,
            "tasks": [
                {
                    "title": "Inspect rice leaves for lesions",
                    "description": "Check rice plants for diamond-shaped or spindle-shaped grayish lesions with brown borders, which indicate early blast infection.",
                    "priority": "high",
                    "category": "disease_management"
                },
                {
                    "title": "Avoid overhead irrigation",
                    "description": "Reduce leaf wetness by using controlled irrigation techniques to limit the spread of the fungus.",
                    "priority": "high",
                    "category": "irrigation"
                },
                {
                    "title": "Remove nearby infected residues",
                    "description": "Clear old rice stubble or weeds around the field to reduce sources of infection.",
                    "priority": "medium",
                    "category": "location_specific"
                }
            ]
        },
        {
            "day": 2,
            "tasks": [
                {
                    "title": "Apply fungicide if lesions observed",
                    "description": "Use Tricyclazole or Carbendazim on infected plants early in the morning or late evening for maximum efficacy.",
                    "priority": "high",
                    "category": "disease_management"
                },
                {
                    "title": "Monitor soil moisture",
                    "description": "Ensure soil is moist but avoid standing water to reduce humidity around leaves.",
                    "priority": "high",
                    "category": "irrigation"
                },
                {
                    "title": "Check surrounding fields",
                    "description": "Inspect neighboring fields for disease spread to plan containment measures.",
                    "priority": "medium",
                    "category": "location_specific"
                }
            ]
        },
        {
            "day": 3,
            "tasks": [
                {
                    "title": "Monitor new leaf growth",
                    "description": "Check newly emerged leaves for lesions and fungal growth to detect secondary infections early.",
                    "priority": "high",
                    "category": "disease_management"
                },
                {
                    "title": "Minimal irrigation",
                    "description": "Provide only necessary water to prevent prolonged leaf wetness.",
                    "priority": "high",
                    "category": "irrigation"
                },
                {
                    "title": "Apply potassium fertilizer",
                    "description": "Strengthen plant resistance to fungal infection by foliar application of potassium-based nutrients.",
                    "priority": "medium",
                    "category": "crop_maintenance"
                }
            ]
        },
        {
            "day": 4,
            "tasks": [
                {
                    "title": "Second fungicide spray if needed",
                    "description": "Apply a second spray if infection is spreading, preferably with a rotated chemical.",
                    "priority": "medium",
                    "category": "disease_management"
                },
                {
                    "title": "Ensure proper drainage",
                    "description": "Remove excess water to reduce field humidity and fungal growth.",
                    "priority": "high",
                    "category": "irrigation"
                },
                {
                    "title": "Prune severely infected leaves",
                    "description": "Cut and dispose of heavily infected leaves to prevent spread to healthy plants.",
                    "priority": "medium",
                    "category": "disease_management"
                }
            ]
        },
        {
            "day": 5,
            "tasks": [
                {
                    "title": "Assess severity of infection",
                    "description": "Randomly check 50 plants; note how many show lesions. Take action if more than 20% are affected.",
                    "priority": "high",
                    "category": "disease_management"
                },
                {
                    "title": "Adjust irrigation frequency",
                    "description": "Reduce water supply to minimize leaf wetness as plants mature.",
                    "priority": "high",
                    "category": "irrigation"
                },
                {
                    "title": "Fertilize cautiously",
                    "description": "Avoid excess nitrogen which can favor fungal growth; follow recommended dosage.",
                    "priority": "medium",
                    "category": "crop_maintenance"
                }
            ]
        },
        {
            "day": 6,
            "tasks": [
                {
                    "title": "Document blast outbreak",
                    "description": "Record infection severity, weather, and treatments applied for future reference.",
                    "priority": "low",
                    "category": "crop_maintenance"
                },
                {
                    "title": "Plan crop rotation",
                    "description": "Avoid planting rice in the same field next season; rotate with non-host crops to break disease cycle.",
                    "priority": "low",
                    "category": "disease_management"
                },
                {
                    "title": "Prepare for harvest",
                    "description": "Check harvesting tools and segregate infected areas if necessary to avoid contamination.",
                    "priority": "medium",
                    "category": "crop_maintenance"
                }
            ]
        },
        {
            "day": 7,
            "tasks": [
                {
                    "title": "Final assessment of crop",
                    "description": "Evaluate overall damage, decide harvest order, and plan testing for grain safety.",
                    "priority": "high",
                    "category": "disease_management"
                },
                {
                    "title": "Stop irrigation before harvest",
                    "description": "Cease watering 1–2 weeks before harvest to allow grain to dry and minimize fungal spread.",
                    "priority": "medium",
                    "category": "irrigation"
                },
                {
                    "title": "Clean field of infected debris",
                    "description": "Remove and burn all infected plant material to prevent disease carryover.",
                    "priority": "medium",
                    "category": "location_specific"
                }
            ]
        }
    ]
},
{
    "crop": "rice",
    "disease": "Rice Bug",
    "location": "Islamabad",
    "temperature_range": {"min": 3, "max": 20},
    "day_plans": [
        {
            "day": 1,
            "tasks": [
                {"title": "Inspect rice panicles for bug infestation", "description": "Look for brown or black insects on rice grains and panicles. Check early morning when bugs are active.", "priority": "high", "category": "disease_management"},
                {"title": "Remove weeds around field", "description": "Weeds can host rice bugs. Remove all surrounding weeds to reduce pest migration into rice field.", "priority": "medium", "category": "location_specific"},
                {"title": "Avoid excess nitrogen fertilizer", "description": "High nitrogen can attract rice bugs. Limit nitrogen application until plants are mature.", "priority": "high", "category": "crop_maintenance"}
            ]
        },
        {
            "day": 2,
            "tasks": [
                {"title": "Set up light traps", "description": "Install light traps around field edges to monitor bug activity. Helps in estimating infestation level.", "priority": "medium", "category": "disease_management"},
                {"title": "Monitor field edges closely", "description": "Check edges for early infestation signs. Rice bugs usually migrate from borders inward.", "priority": "high", "category": "disease_management"},
                {"title": "Ensure proper water management", "description": "Maintain normal water level. Avoid dry patches as they attract rice bugs.", "priority": "high", "category": "irrigation"}
            ]
        },
        {
            "day": 3,
            "tasks": [
                {"title": "Spray approved insecticide if needed", "description": "If bug count exceeds threshold (5 bugs per 100 panicles), spray an approved insecticide in early morning or evening.", "priority": "high", "category": "disease_management"},
                {"title": "Check for natural predators", "description": "Look for spiders or predatory insects. Avoid harming them during chemical application.", "priority": "medium", "category": "disease_management"},
                {"title": "Keep field free of fallen grains", "description": "Remove any grains fallen from panicles. They attract rice bugs and increase infestation.", "priority": "medium", "category": "crop_maintenance"}
            ]
        },
        {
            "day": 4,
            "tasks": [
                {"title": "Assess effectiveness of control measures", "description": "Check panicles after insecticide or traps. Count remaining bugs to decide on further action.", "priority": "high", "category": "disease_management"},
                {"title": "Maintain irrigation", "description": "Keep water level stable. Avoid water stress which makes plants more susceptible to bug damage.", "priority": "high", "category": "irrigation"},
                {"title": "Record observations", "description": "Note bug counts, infestation areas, and applied treatments for future reference.", "priority": "medium", "category": "crop_maintenance"}
            ]
        },
        {
            "day": 5,
            "tasks": [
                {"title": "Spray second insecticide if necessary", "description": "If bugs persist after first spray, apply second insecticide using rotation chemicals to prevent resistance.", "priority": "medium", "category": "disease_management"},
                {"title": "Check neighboring fields", "description": "Inspect nearby rice fields for infestation. Coordinate control measures to avoid re-infestation.", "priority": "medium", "category": "location_specific"},
                {"title": "Limit unnecessary field visits", "description": "Reduce movement through field to prevent spreading bugs to healthy areas.", "priority": "low", "category": "crop_maintenance"}
            ]
        },
        {
            "day": 6,
            "tasks": [
                {"title": "Monitor late-stage infestation", "description": "Check maturing grains for any remaining bug damage. Focus on high-risk areas.", "priority": "high", "category": "disease_management"},
                {"title": "Prepare for harvest", "description": "Ensure harvesting tools are clean and ready. Avoid spreading insects during harvesting.", "priority": "medium", "category": "crop_maintenance"},
                {"title": "Maintain field hygiene", "description": "Remove any remaining weeds, fallen grains, or crop residues to reduce bug shelter.", "priority": "medium", "category": "location_specific"}
            ]
        },
        {
            "day": 7,
            "tasks": [
                {"title": "Final evaluation of rice bug impact", "description": "Assess overall crop damage and record yield loss due to rice bug. Document lessons for next season.", "priority": "high", "category": "disease_management"},
                {"title": "Stop unnecessary irrigation", "description": "Maintain standard water level before harvest. Avoid flooding which can disperse bugs.", "priority": "medium", "category": "irrigation"},
                {"title": "Clean field thoroughly", "description": "Remove all crop residues and dead insects. Helps break rice bug life cycle for next planting.", "priority": "medium", "category": "location_specific"}
            ]
        }
    ]
},
{
    "crop": "rice",
    "disease": "Thrips",
    "location": "Islamabad",
    "temperature_range": {"min": 3, "max": 20},
    "day_plans": [
        {
            "day": 1,
            "tasks": [
                {"title": "Inspect seedlings and young leaves", "description": "Look for tiny yellow or silvery streaks and black dots (thrips excreta) on leaves. Early detection is crucial.", "priority": "high", "category": "disease_management"},
                {"title": "Remove infested seedlings", "description": "Remove and destroy heavily infested seedlings to prevent thrips spreading.", "priority": "medium", "category": "crop_maintenance"},
                {"title": "Maintain proper spacing", "description": "Ensure seedlings are not overcrowded; good airflow reduces thrips activity.", "priority": "medium", "category": "location_specific"}
            ]
        },
        {
            "day": 2,
            "tasks": [
                {"title": "Check field edges for thrips hotspots", "description": "Thrips often infest field borders first. Inspect edges carefully.", "priority": "high", "category": "disease_management"},
                {"title": "Install yellow sticky traps", "description": "Place traps around field to monitor adult thrips population.", "priority": "medium", "category": "disease_management"},
                {"title": "Ensure balanced fertilization", "description": "Avoid excessive nitrogen which can increase thrips populations. Apply fertilizers carefully.", "priority": "high", "category": "crop_maintenance"}
            ]
        },
        {
            "day": 3,
            "tasks": [
                {"title": "Spray insecticide if threshold exceeded", "description": "If thrips count is >5 per plant, spray approved insecticide in early morning or late afternoon.", "priority": "high", "category": "disease_management"},
                {"title": "Avoid overwatering", "description": "Thrips prefer dry conditions on leaves. Water properly to maintain leaf moisture but avoid creating excessive humidity.", "priority": "medium", "category": "irrigation"},
                {"title": "Check for natural predators", "description": "Encourage spiders and predatory insects in the field; avoid harming them during sprays.", "priority": "medium", "category": "disease_management"}
            ]
        },
        {
            "day": 4,
            "tasks": [
                {"title": "Assess effectiveness of insecticide", "description": "Count thrips after 24-48 hours of treatment to determine need for additional spray.", "priority": "high", "category": "disease_management"},
                {"title": "Maintain field hygiene", "description": "Remove dead leaves and crop debris that can harbor thrips.", "priority": "medium", "category": "location_specific"},
                {"title": "Monitor water levels", "description": "Ensure irrigation is uniform and not creating dry patches that favor thrips.", "priority": "high", "category": "irrigation"}
            ]
        },
        {
            "day": 5,
            "tasks": [
                {"title": "Spray second insecticide if needed", "description": "If thrips persist, apply a different chemical using rotation strategy to avoid resistance.", "priority": "medium", "category": "disease_management"},
                {"title": "Inspect mid and upper leaves", "description": "Thrips often move upward as plants grow. Check all leaves for damage.", "priority": "high", "category": "disease_management"},
                {"title": "Record observations", "description": "Document infestation levels, treatment methods, and effectiveness for future reference.", "priority": "low", "category": "crop_maintenance"}
            ]
        },
        {
            "day": 6,
            "tasks": [
                {"title": "Monitor grain formation stage", "description": "Thrips can damage panicles. Check grain formation for discoloration or deformities.", "priority": "high", "category": "disease_management"},
                {"title": "Maintain balanced irrigation", "description": "Ensure stable water levels; avoid excessive dryness that attracts thrips.", "priority": "medium", "category": "irrigation"},
                {"title": "Prepare for harvest", "description": "Check harvesting tools and clean them to avoid spreading thrips.", "priority": "medium", "category": "crop_maintenance"}
            ]
        },
        {
            "day": 7,
            "tasks": [
                {"title": "Final thrips evaluation", "description": "Assess overall crop damage from thrips. Decide if any affected areas need special attention during harvest.", "priority": "high", "category": "disease_management"},
                {"title": "Clean field of residues", "description": "Remove crop residues and weeds to prevent thrips survival for next season.", "priority": "medium", "category": "location_specific"},
                {"title": "Stop unnecessary irrigation before harvest", "description": "Maintain normal water level; avoid flooding that can disperse pests.", "priority": "medium", "category": "irrigation"}
            ]
        }
    ]
},
{
    "crop": "rice",
    "disease": "Rice Gall Midge",
    "location": "Islamabad",
    "temperature_range": {"min": 3, "max": 20},
    "day_plans": [
        {
            "day": 1,
            "tasks": [
                {"title": "Inspect seedlings for silver shoots", "description": "Look for elongating, whitish shoots (silver shoots) that indicate gall midge infestation.", "priority": "high", "category": "disease_management"},
                {"title": "Remove heavily infested seedlings", "description": "Uproot and destroy seedlings showing silver shoots to prevent further spread.", "priority": "medium", "category": "crop_maintenance"},
                {"title": "Maintain proper spacing", "description": "Avoid dense planting; proper spacing reduces gall midge attraction and egg laying.", "priority": "medium", "category": "location_specific"}
            ]
        },
        {
            "day": 2,
            "tasks": [
                {"title": "Monitor field edges and nursery areas", "description": "Gall midges often start at nursery or field borders. Inspect closely for early signs.", "priority": "high", "category": "disease_management"},
                {"title": "Install pheromone traps", "description": "Use traps to monitor adult gall midge population and predict peak infestation periods.", "priority": "medium", "category": "disease_management"},
                {"title": "Avoid excessive nitrogen fertilizer", "description": "High nitrogen encourages soft growth, which attracts gall midge. Apply fertilizers carefully.", "priority": "high", "category": "crop_maintenance"}
            ]
        },
        {
            "day": 3,
            "tasks": [
                {"title": "Apply recommended insecticide if threshold exceeded", "description": "If more than 5% seedlings show silver shoots, spray approved insecticide targeting adult midges.", "priority": "high", "category": "disease_management"},
                {"title": "Water carefully", "description": "Avoid overwatering; water stress may attract gall midge. Maintain consistent irrigation.", "priority": "medium", "category": "irrigation"},
                {"title": "Promote natural predators", "description": "Encourage spiders, predatory bugs, and other beneficial insects to control gall midge population.", "priority": "medium", "category": "disease_management"}
            ]
        },
        {
            "day": 4,
            "tasks": [
                {"title": "Assess effectiveness of control measures", "description": "Check seedlings for new silver shoots. Determine if additional treatment is required.", "priority": "high", "category": "disease_management"},
                {"title": "Maintain field hygiene", "description": "Remove plant debris and fallen seedlings that can harbor gall midge pupae.", "priority": "medium", "category": "location_specific"},
                {"title": "Monitor neighboring fields", "description": "Coordinate with nearby farms to manage gall midge spread across fields.", "priority": "medium", "category": "location_specific"}
            ]
        },
        {
            "day": 5,
            "tasks": [
                {"title": "Spray second insecticide if infestation persists", "description": "Use chemical rotation to prevent resistance. Target adult midges early in the day.", "priority": "medium", "category": "disease_management"},
                {"title": "Check tillering stage", "description": "Inspect new tillers for any signs of gall formation. Remove affected tillers immediately.", "priority": "high", "category": "disease_management"},
                {"title": "Record infestation data", "description": "Document number of silver shoots, treated areas, and chemical usage for future planning.", "priority": "low", "category": "crop_maintenance"}
            ]
        },
        {
            "day": 6,
            "tasks": [
                {"title": "Monitor panicle initiation stage", "description": "Check for gall midge activity in developing panicles. Early detection prevents major yield loss.", "priority": "high", "category": "disease_management"},
                {"title": "Maintain proper water management", "description": "Avoid water stress or excessive standing water, as it influences gall midge population.", "priority": "medium", "category": "irrigation"},
                {"title": "Prepare for harvest", "description": "Check harvesting tools and clean them to avoid spreading gall midge to other fields.", "priority": "medium", "category": "crop_maintenance"}
            ]
        },
        {
            "day": 7,
            "tasks": [
                {"title": "Final evaluation of gall midge impact", "description": "Assess crop damage and yield loss. Document findings for next planting season.", "priority": "high", "category": "disease_management"},
                {"title": "Clean field of residues", "description": "Remove and destroy all infested plant material to break gall midge life cycle.", "priority": "medium", "category": "location_specific"},
                {"title": "Stop unnecessary irrigation before harvest", "description": "Maintain standard water level; avoid conditions favoring remaining pests.", "priority": "medium", "category": "irrigation"}
            ]
        }
    ]
},
{
    "crop": "rice",
    "disease": "Bacterial Blight",
    "location": "Islamabad",
    "temperature_range": {"min": 3, "max": 20},
    "day_plans": [
        {
            "day": 1,
            "tasks": [
                {"title": "Inspect leaves for yellowing and water-soaked streaks", "description": "Look for pale yellow to white streaks along leaf veins, especially in young leaves. Early detection is critical.", "priority": "high", "category": "disease_management"},
                {"title": "Remove severely infected leaves", "description": "Cut and destroy leaves showing extensive streaks to reduce bacterial spread.", "priority": "medium", "category": "crop_maintenance"},
                {"title": "Ensure field hygiene", "description": "Remove plant debris and weeds around the field which may harbor bacteria.", "priority": "medium", "category": "location_specific"}
            ]
        },
        {
            "day": 2,
            "tasks": [
                {"title": "Check irrigation water source", "description": "Ensure water is clean and not contaminated. Avoid using water from infected fields.", "priority": "high", "category": "irrigation"},
                {"title": "Monitor field edges", "description": "Infection often spreads from field borders. Inspect edges and note early signs.", "priority": "high", "category": "disease_management"},
                {"title": "Avoid excessive nitrogen application", "description": "High nitrogen promotes soft growth susceptible to bacterial attack.", "priority": "medium", "category": "crop_maintenance"}
            ]
        },
        {
            "day": 3,
            "tasks": [
                {"title": "Spray recommended bactericide if threshold exceeded", "description": "Apply copper-based bactericide or other approved chemicals on infected leaves in early morning.", "priority": "high", "category": "disease_management"},
                {"title": "Maintain uniform water level", "description": "Avoid water stress which increases susceptibility. Keep paddies at optimal level.", "priority": "medium", "category": "irrigation"},
                {"title": "Promote natural resistance", "description": "Use resistant varieties if possible in next planting cycle. Document effective varieties.", "priority": "low", "category": "crop_maintenance"}
            ]
        },
        {
            "day": 4,
            "tasks": [
                {"title": "Assess effectiveness of treatment", "description": "Check treated leaves for reduction in streaking or bacterial ooze. Decide on further action.", "priority": "high", "category": "disease_management"},
                {"title": "Monitor weather conditions", "description": "High humidity and rain favor bacterial blight. Adjust irrigation to reduce waterlogging.", "priority": "medium", "category": "irrigation"},
                {"title": "Document observations", "description": "Record infection level, affected area, treatments applied for future reference.", "priority": "low", "category": "crop_maintenance"}
            ]
        },
        {
            "day": 5,
            "tasks": [
                {"title": "Apply second bactericide spray if needed", "description": "If infection persists, spray a second round with rotation to prevent resistance.", "priority": "medium", "category": "disease_management"},
                {"title": "Inspect new growth", "description": "Check emerging leaves and tillers for streaks. Remove infected tissues immediately.", "priority": "high", "category": "disease_management"},
                {"title": "Check neighboring fields", "description": "Coordinate with adjacent farms to prevent spread of bacterial blight.", "priority": "medium", "category": "location_specific"}
            ]
        },
        {
            "day": 6,
            "tasks": [
                {"title": "Monitor panicle initiation and flowering", "description": "Ensure infection has not reached reproductive stage. Focus on preventing spread to panicles.", "priority": "high", "category": "disease_management"},
                {"title": "Maintain field sanitation", "description": "Remove weeds and debris that can act as bacterial reservoirs.", "priority": "medium", "category": "location_specific"},
                {"title": "Prepare for harvest", "description": "Ensure harvesting equipment is clean to avoid bacterial contamination.", "priority": "medium", "category": "crop_maintenance"}
            ]
        },
        {
            "day": 7,
            "tasks": [
                {"title": "Final evaluation of bacterial blight impact", "description": "Assess crop damage and yield loss. Document effective measures and lessons learned.", "priority": "high", "category": "disease_management"},
                {"title": "Stop unnecessary irrigation before harvest", "description": "Maintain normal water level; avoid excess moisture which favors bacteria.", "priority": "medium", "category": "irrigation"},
                {"title": "Clean field thoroughly", "description": "Remove all infected debris to prevent overwintering of bacteria.", "priority": "medium", "category": "location_specific"}
            ]
        }
    ]
},
{
    "crop": "rice",
    "disease": "Rice Hispa",
    "location": "Islamabad",
    "temperature_range": {"min": 3, "max": 20},
    "day_plans": [
        {
            "day": 1,
            "tasks": [
                {"title": "Inspect rice leaves for hispa damage", "description": "Look for white streaks on leaves caused by adult hispa scraping tissue. Early detection helps control.", "priority": "high", "category": "disease_management"},
                {"title": "Remove heavily infested leaves", "description": "Cut and destroy leaves with extensive streaks or larvae presence.", "priority": "medium", "category": "crop_maintenance"},
                {"title": "Maintain proper field hygiene", "description": "Remove weeds and crop residues that can host hispa.", "priority": "medium", "category": "location_specific"}
            ]
        },
        {
            "day": 2,
            "tasks": [
                {"title": "Check field edges and bunds", "description": "Rice hispa often colonizes from field edges. Inspect bunds and borders carefully.", "priority": "high", "category": "disease_management"},
                {"title": "Install yellow sticky traps", "description": "Use traps around the field to monitor adult hispa activity.", "priority": "medium", "category": "disease_management"},
                {"title": "Avoid excessive nitrogen", "description": "High nitrogen levels promote soft leaf growth which attracts hispa.", "priority": "high", "category": "crop_maintenance"}
            ]
        },
        {
            "day": 3,
            "tasks": [
                {"title": "Spray approved insecticide if threshold exceeded", "description": "Apply insecticide if >5 hispa per plant are observed, targeting larvae and adults.", "priority": "high", "category": "disease_management"},
                {"title": "Monitor water levels", "description": "Maintain optimum water level; avoid dry patches which increase hispa activity.", "priority": "medium", "category": "irrigation"},
                {"title": "Encourage natural predators", "description": "Promote spiders, ladybirds, and predatory bugs to reduce hispa population naturally.", "priority": "medium", "category": "disease_management"}
            ]
        },
        {
            "day": 4,
            "tasks": [
                {"title": "Assess insecticide effectiveness", "description": "Check leaves after 24–48 hours of treatment. Decide if additional sprays are required.", "priority": "high", "category": "disease_management"},
                {"title": "Maintain field hygiene", "description": "Remove dead leaves and infested debris to prevent further infestation.", "priority": "medium", "category": "location_specific"},
                {"title": "Record observations", "description": "Document infestation level, treatments applied, and affected areas.", "priority": "low", "category": "crop_maintenance"}
            ]
        },
        {
            "day": 5,
            "tasks": [
                {"title": "Apply second insecticide if needed", "description": "If hispa persists, spray a second round using rotation chemicals to prevent resistance.", "priority": "medium", "category": "disease_management"},
                {"title": "Inspect mid and upper leaves", "description": "Check all leaves for signs of streaking or larvae. Remove heavily damaged leaves.", "priority": "high", "category": "disease_management"},
                {"title": "Check neighboring fields", "description": "Coordinate with nearby farms to manage hispa migration.", "priority": "medium", "category": "location_specific"}
            ]
        },
        {
            "day": 6,
            "tasks": [
                {"title": "Monitor reproductive stage", "description": "Ensure hispa has not affected panicles. Remove any infested tillers immediately.", "priority": "high", "category": "disease_management"},
                {"title": "Maintain irrigation", "description": "Keep water levels uniform; avoid water stress that attracts hispa.", "priority": "medium", "category": "irrigation"},
                {"title": "Prepare for harvest", "description": "Clean harvesting tools to prevent spread of hispa to other fields.", "priority": "medium", "category": "crop_maintenance"}
            ]
        },
        {
            "day": 7,
            "tasks": [
                {"title": "Final evaluation of rice hispa impact", "description": "Assess overall crop damage and yield loss. Document lessons for next season.", "priority": "high", "category": "disease_management"},
                {"title": "Clean field residues", "description": "Remove all infested plant material to break the hispa life cycle.", "priority": "medium", "category": "location_specific"},
                {"title": "Stop unnecessary irrigation before harvest", "description": "Maintain normal water levels; avoid conditions that favor remaining pests.", "priority": "medium", "category": "irrigation"}
            ]
        }
    ]
},
{
    "crop": "rice",
    "disease": "Brown Spot",
    "location": "Islamabad",
    "temperature_range": {"min": 3, "max": 20},
    "day_plans": [
        {
            "day": 1,
            "tasks": [
                {"title": "Inspect leaves for brown lesions", "description": "Look for small, circular, dark brown spots on older leaves. Early detection helps prevent spread.", "priority": "high", "category": "disease_management"},
                {"title": "Remove severely infected leaves", "description": "Cut and destroy leaves with extensive spots to reduce inoculum.", "priority": "medium", "category": "crop_maintenance"},
                {"title": "Check soil fertility", "description": "Brown Spot is aggravated by low potassium and phosphorus. Ensure balanced soil nutrients.", "priority": "medium", "category": "crop_maintenance"}
            ]
        },
        {
            "day": 2,
            "tasks": [
                {"title": "Monitor field edges", "description": "Disease often spreads from field margins. Inspect edges for initial symptoms.", "priority": "high", "category": "disease_management"},
                {"title": "Ensure proper water management", "description": "Avoid water stress as it favors Brown Spot. Maintain optimum field water levels.", "priority": "high", "category": "irrigation"},
                {"title": "Apply preventive copper fungicide if needed", "description": "Spray copper fungicide on lightly infected fields to limit spread.", "priority": "medium", "category": "disease_management"}
            ]
        },
        {
            "day": 3,
            "tasks": [
                {"title": "Assess nutrient application", "description": "Check if potassium and phosphorus levels are sufficient. Deficient plants are more susceptible.", "priority": "high", "category": "crop_maintenance"},
                {"title": "Remove weeds and crop debris", "description": "Weeds and old plant material harbor the fungus. Clear the field to reduce infection sources.", "priority": "medium", "category": "location_specific"},
                {"title": "Monitor weather conditions", "description": "Brown Spot spreads faster in dry and cool conditions. Adjust irrigation to avoid stress.", "priority": "medium", "category": "irrigation"}
            ]
        },
        {
            "day": 4,
            "tasks": [
                {"title": "Spray fungicide if infection increases", "description": "Apply fungicide to affected leaves using recommended dose and timing.", "priority": "high", "category": "disease_management"},
                {"title": "Inspect mid-level leaves", "description": "Check all leaf levels for spreading spots. Remove heavily infected leaves.", "priority": "high", "category": "disease_management"},
                {"title": "Document observations", "description": "Record affected areas, severity, and applied measures for future planning.", "priority": "low", "category": "crop_maintenance"}
            ]
        },
        {
            "day": 5,
            "tasks": [
                {"title": "Apply second fungicide spray if needed", "description": "If disease persists, spray a second round using a rotation of chemicals.", "priority": "medium", "category": "disease_management"},
                {"title": "Inspect field edges again", "description": "Re-check margins for new lesions to prevent further spread.", "priority": "medium", "category": "disease_management"},
                {"title": "Maintain balanced irrigation", "description": "Avoid dry patches; keep consistent water levels to reduce stress and susceptibility.", "priority": "medium", "category": "irrigation"}
            ]
        },
        {
            "day": 6,
            "tasks": [
                {"title": "Monitor panicle initiation stage", "description": "Ensure infection has not reached panicles. Remove any infected tillers if necessary.", "priority": "high", "category": "disease_management"},
                {"title": "Maintain field sanitation", "description": "Clear remaining weeds and crop debris to prevent fungal survival.", "priority": "medium", "category": "location_specific"},
                {"title": "Prepare for harvest", "description": "Check harvesting equipment and clean them to avoid contamination.", "priority": "medium", "category": "crop_maintenance"}
            ]
        },
        {
            "day": 7,
            "tasks": [
                {"title": "Final evaluation of Brown Spot impact", "description": "Assess crop damage and yield loss. Document lessons learned for next season.", "priority": "high", "category": "disease_management"},
                {"title": "Clean field residues", "description": "Remove and destroy all infected leaves and plant material to reduce inoculum for next season.", "priority": "medium", "category": "location_specific"},
                {"title": "Stop unnecessary irrigation before harvest", "description": "Maintain normal water level; avoid excess dryness or waterlogging.", "priority": "medium", "category": "irrigation"}
            ]
        }
    ]
},
{
    "crop": "rice",
    "disease": "False Smut",
    "location": "Islamabad",
    "temperature_range": {"min": 3, "max": 20},
    "day_plans": [
        {
            "day": 1,
            "tasks": [
                {"title": "Inspect panicles for greenish spore balls", "description": "Look for swollen, greenish-yellow balls on spikelets. Early detection helps prevent spread.", "priority": "high", "category": "disease_management"},
                {"title": "Remove severely infected panicles", "description": "Cut and destroy panicles with visible smut balls to reduce inoculum.", "priority": "medium", "category": "crop_maintenance"},
                {"title": "Check field humidity", "description": "False smut spreads faster in high humidity. Monitor and adjust water management accordingly.", "priority": "medium", "category": "irrigation"}
            ]
        },
        {
            "day": 2,
            "tasks": [
                {"title": "Monitor field edges", "description": "Inspect edges and corners for early infections as disease often spreads from margins.", "priority": "high", "category": "disease_management"},
                {"title": "Apply preventive fungicide if needed", "description": "Spray recommended fungicide on lightly infected areas to prevent further spread.", "priority": "medium", "category": "disease_management"},
                {"title": "Avoid excessive nitrogen application", "description": "High nitrogen levels encourage lush growth and favor false smut infection.", "priority": "high", "category": "crop_maintenance"}
            ]
        },
        {
            "day": 3,
            "tasks": [
                {"title": "Inspect flowering stage panicles", "description": "Check all panicles for smut balls as infection occurs mostly during flowering.", "priority": "high", "category": "disease_management"},
                {"title": "Ensure proper irrigation", "description": "Avoid water stress; maintain uniform water level to reduce susceptibility.", "priority": "medium", "category": "irrigation"},
                {"title": "Maintain field hygiene", "description": "Remove weeds and crop residues which can harbor fungal spores.", "priority": "medium", "category": "location_specific"}
            ]
        },
        {
            "day": 4,
            "tasks": [
                {"title": "Spray fungicide on infected areas", "description": "Apply recommended fungicide on infected panicles and surrounding area.", "priority": "high", "category": "disease_management"},
                {"title": "Assess effectiveness of treatment", "description": "Check treated panicles after 24–48 hours to determine if additional spray is needed.", "priority": "high", "category": "disease_management"},
                {"title": "Record observations", "description": "Document infected panicles, treatment applied, and weather conditions for reference.", "priority": "low", "category": "crop_maintenance"}
            ]
        },
        {
            "day": 5,
            "tasks": [
                {"title": "Apply second fungicide spray if required", "description": "If disease persists, use a second round of fungicide with proper rotation.", "priority": "medium", "category": "disease_management"},
                {"title": "Inspect mid and upper panicles", "description": "Check all levels of panicles for smut balls and remove heavily infected spikelets.", "priority": "high", "category": "disease_management"},
                {"title": "Check neighboring fields", "description": "Coordinate with adjacent farms to prevent spread of false smut.", "priority": "medium", "category": "location_specific"}
            ]
        },
        {
            "day": 6,
            "tasks": [
                {"title": "Monitor grain filling stage", "description": "Ensure infection has not spread further. Remove any new infected spikelets.", "priority": "high", "category": "disease_management"},
                {"title": "Maintain field sanitation", "description": "Clear remaining weeds and crop residues to reduce fungal survival.", "priority": "medium", "category": "location_specific"},
                {"title": "Prepare for harvest", "description": "Check harvesting tools and clean them to avoid spreading fungal spores.", "priority": "medium", "category": "crop_maintenance"}
            ]
        },
        {
            "day": 7,
            "tasks": [
                {"title": "Final evaluation of False Smut impact", "description": "Assess crop damage and yield loss. Document effective measures and lessons for next season.", "priority": "high", "category": "disease_management"},
                {"title": "Clean field residues", "description": "Remove and destroy all infected spikelets and plant material to reduce inoculum for next season.", "priority": "medium", "category": "location_specific"},
                {"title": "Stop unnecessary irrigation before harvest", "description": "Maintain standard water level; avoid excessive moisture that favors fungal spread.", "priority": "medium", "category": "irrigation"}
            ]
        }
    ]
},
{
    "crop": "rice",
    "disease": "Leaf Scald",
    "location": "Islamabad",
    "temperature_range": {"min": 3, "max": 20},
    "day_plans": [
        {
            "day": 1,
            "tasks": [
                {"title": "Inspect leaves for pale or grayish lesions", "description": "Look for long, narrow, pale gray to white lesions with dark brown margins on leaves.", "priority": "high", "category": "disease_management"},
                {"title": "Remove severely infected leaves", "description": "Cut and destroy leaves with extensive lesions to reduce inoculum.", "priority": "medium", "category": "crop_maintenance"},
                {"title": "Check field drainage", "description": "Ensure proper water management; poorly drained fields favor leaf scald.", "priority": "medium", "category": "irrigation"}
            ]
        },
        {
            "day": 2,
            "tasks": [
                {"title": "Monitor field edges", "description": "Leaf scald often starts from field margins. Inspect edges and note early symptoms.", "priority": "high", "category": "disease_management"},
                {"title": "Maintain balanced fertilization", "description": "Avoid excessive nitrogen; high nitrogen encourages soft growth susceptible to leaf scald.", "priority": "medium", "category": "crop_maintenance"},
                {"title": "Remove weeds and debris", "description": "Clear weeds and crop residues which can harbor the pathogen.", "priority": "medium", "category": "location_specific"}
            ]
        },
        {
            "day": 3,
            "tasks": [
                {"title": "Spray recommended fungicide if threshold exceeded", "description": "Apply fungicide on infected leaves to control spread, especially on young plants.", "priority": "high", "category": "disease_management"},
                {"title": "Monitor irrigation", "description": "Avoid water stress or standing water; maintain optimal water level to reduce susceptibility.", "priority": "medium", "category": "irrigation"},
                {"title": "Promote airflow in field", "description": "Ensure proper spacing and reduce canopy density to minimize leaf wetness.", "priority": "medium", "category": "location_specific"}
            ]
        },
        {
            "day": 4,
            "tasks": [
                {"title": "Assess fungicide effectiveness", "description": "Check treated leaves after 24–48 hours to determine if additional spray is needed.", "priority": "high", "category": "disease_management"},
                {"title": "Inspect all leaf levels", "description": "Check mid and upper leaves for new lesions and remove heavily infected leaves.", "priority": "high", "category": "disease_management"},
                {"title": "Document observations", "description": "Record infection severity, weather conditions, and treatment applied for reference.", "priority": "low", "category": "crop_maintenance"}
            ]
        },
        {
            "day": 5,
            "tasks": [
                {"title": "Apply second fungicide spray if needed", "description": "If infection persists, use a second round of fungicide with proper chemical rotation.", "priority": "medium", "category": "disease_management"},
                {"title": "Inspect field edges again", "description": "Re-check margins for new lesions to prevent further spread.", "priority": "medium", "category": "disease_management"},
                {"title": "Maintain balanced irrigation", "description": "Keep uniform water levels; avoid water stress or puddling.", "priority": "medium", "category": "irrigation"}
            ]
        },
        {
            "day": 6,
            "tasks": [
                {"title": "Monitor tillering and panicle initiation", "description": "Ensure infection has not reached panicles; remove any infected tillers.", "priority": "high", "category": "disease_management"},
                {"title": "Maintain field hygiene", "description": "Clear remaining weeds and crop residues to reduce pathogen survival.", "priority": "medium", "category": "location_specific"},
                {"title": "Prepare for harvest", "description": "Ensure harvesting equipment is clean to avoid spreading pathogen.", "priority": "medium", "category": "crop_maintenance"}
            ]
        },
        {
            "day": 7,
            "tasks": [
                {"title": "Final evaluation of Leaf Scald impact", "description": "Assess crop damage and yield loss. Document lessons learned and effective measures for next season.", "priority": "high", "category": "disease_management"},
                {"title": "Clean field residues", "description": "Remove and destroy all infected leaves and plant material to reduce pathogen carryover.", "priority": "medium", "category": "location_specific"},
                {"title": "Stop unnecessary irrigation before harvest", "description": "Maintain standard water level; avoid conditions favoring fungal growth.", "priority": "medium", "category": "irrigation"}
            ]
        }
    ]
},
{
    "crop": "rice",
    "disease": "Leaf Smut",
    "location": "Islamabad",
    "temperature_range": {"min": 3, "max": 20},
    "day_plans": [
        {
            "day": 1,
            "tasks": [
                {"title": "Inspect leaves for black smut sori", "description": "Look for small, black, powdery sori (spore clusters) on the upper surface of young leaves. Early detection is key.", "priority": "high", "category": "disease_management"},
                {"title": "Remove heavily infected leaves", "description": "Cut and destroy infected leaves to reduce inoculum in the field.", "priority": "medium", "category": "crop_maintenance"},
                {"title": "Check seed health", "description": "Leaf smut can spread through infected seeds. Use certified disease-free seeds for next planting.", "priority": "medium", "category": "crop_maintenance"}
            ]
        },
        {
            "day": 2,
            "tasks": [
                {"title": "Monitor nursery and young plants", "description": "Leaf smut is more prevalent in seedlings. Inspect nurseries for any black sori.", "priority": "high", "category": "disease_management"},
                {"title": "Maintain proper spacing", "description": "Avoid dense planting; good airflow reduces humidity and disease spread.", "priority": "medium", "category": "location_specific"},
                {"title": "Remove weeds and debris", "description": "Clear the field of weeds and crop residues which can harbor spores.", "priority": "medium", "category": "location_specific"}
            ]
        },
        {
            "day": 3,
            "tasks": [
                {"title": "Apply recommended fungicide", "description": "Spray fungicide approved for leaf smut on infected seedlings or young plants.", "priority": "high", "category": "disease_management"},
                {"title": "Maintain proper irrigation", "description": "Avoid excessive moisture on leaves which favors fungal growth.", "priority": "medium", "category": "irrigation"},
                {"title": "Promote natural airflow", "description": "Ensure field ventilation by reducing canopy density and maintaining spacing.", "priority": "medium", "category": "location_specific"}
            ]
        },
        {
            "day": 4,
            "tasks": [
                {"title": "Assess fungicide effectiveness", "description": "Check treated seedlings for reduction in black sori. Apply additional treatment if necessary.", "priority": "high", "category": "disease_management"},
                {"title": "Inspect mid-level leaves", "description": "Check all leaves for new sori and remove heavily infected ones.", "priority": "high", "category": "disease_management"},
                {"title": "Record observations", "description": "Document infected areas, treatments, and effectiveness for future planning.", "priority": "low", "category": "crop_maintenance"}
            ]
        },
        {
            "day": 5,
            "tasks": [
                {"title": "Apply second fungicide spray if needed", "description": "Use rotation of chemicals to prevent resistance if disease persists.", "priority": "medium", "category": "disease_management"},
                {"title": "Inspect nursery edges", "description": "Re-check margins for new infections to prevent further spread.", "priority": "medium", "category": "disease_management"},
                {"title": "Maintain balanced irrigation", "description": "Keep water level consistent; avoid water stress or leaf wetness.", "priority": "medium", "category": "irrigation"}
            ]
        },
        {
            "day": 6,
            "tasks": [
                {"title": "Monitor tillering stage", "description": "Ensure infection has not reached tillers or panicles. Remove any newly infected leaves.", "priority": "high", "category": "disease_management"},
                {"title": "Maintain field hygiene", "description": "Clear remaining weeds and crop residues to reduce fungal survival.", "priority": "medium", "category": "location_specific"},
                {"title": "Prepare for harvest", "description": "Clean harvesting tools to avoid spreading spores to healthy plants.", "priority": "medium", "category": "crop_maintenance"}
            ]
        },
        {
            "day": 7,
            "tasks": [
                {"title": "Final evaluation of Leaf Smut impact", "description": "Assess crop damage and yield loss. Document lessons learned and effective measures.", "priority": "high", "category": "disease_management"},
                {"title": "Clean field residues", "description": "Remove and destroy all infected leaves and debris to reduce inoculum for next season.", "priority": "medium", "category": "location_specific"},
                {"title": "Stop unnecessary irrigation before harvest", "description": "Maintain standard water level; avoid excess moisture favoring fungal growth.", "priority": "medium", "category": "irrigation"}
            ]
        }
    ]
},
{
    "crop": "rice",
    "disease": "Sheath Blight",
    "location": "Islamabad",
    "temperature_range": {"min": 3, "max": 20},
    "day_plans": [
        {
            "day": 1,
            "tasks": [
                {"title": "Inspect lower leaf sheaths for lesions", "description": "Look for irregular, gray-green lesions on lower leaf sheaths. Early detection helps prevent spread.", "priority": "high", "category": "disease_management"},
                {"title": "Remove heavily infected plants", "description": "Uproot and destroy severely infected plants to reduce inoculum.", "priority": "medium", "category": "crop_maintenance"},
                {"title": "Check field drainage", "description": "Poor drainage and standing water favor sheath blight development. Ensure proper water management.", "priority": "medium", "category": "irrigation"}
            ]
        },
        {
            "day": 2,
            "tasks": [
                {"title": "Monitor field edges and dense patches", "description": "Sheath blight often spreads in dense areas. Inspect edges and dense clusters.", "priority": "high", "category": "disease_management"},
                {"title": "Avoid excessive nitrogen application", "description": "High nitrogen promotes lush growth susceptible to sheath blight.", "priority": "medium", "category": "crop_maintenance"},
                {"title": "Remove crop residues", "description": "Clear debris and weeds which may harbor fungal sclerotia.", "priority": "medium", "category": "location_specific"}
            ]
        },
        {
            "day": 3,
            "tasks": [
                {"title": "Spray recommended fungicide", "description": "Apply fungicide targeting sheath blight on affected areas. Focus on lower sheaths and dense canopy.", "priority": "high", "category": "disease_management"},
                {"title": "Maintain uniform irrigation", "description": "Avoid excess water on lower leaves which encourages fungal growth.", "priority": "medium", "category": "irrigation"},
                {"title": "Promote airflow", "description": "Reduce canopy density by proper spacing to improve ventilation and reduce humidity.", "priority": "medium", "category": "location_specific"}
            ]
        },
        {
            "day": 4,
            "tasks": [
                {"title": "Assess effectiveness of fungicide", "description": "Check treated plants after 24–48 hours to see if lesion spread has stopped.", "priority": "high", "category": "disease_management"},
                {"title": "Inspect mid-level sheaths", "description": "Check for new lesions and remove heavily infected leaves if necessary.", "priority": "high", "category": "disease_management"},
                {"title": "Record observations", "description": "Document affected area, weather conditions, and treatment applied.", "priority": "low", "category": "crop_maintenance"}
            ]
        },
        {
            "day": 5,
            "tasks": [
                {"title": "Apply second fungicide spray if required", "description": "Use chemical rotation to prevent resistance if infection persists.", "priority": "medium", "category": "disease_management"},
                {"title": "Inspect field edges again", "description": "Check margins for new infections to prevent further spread.", "priority": "medium", "category": "disease_management"},
                {"title": "Maintain balanced irrigation", "description": "Keep water level consistent; avoid water stress or puddling.", "priority": "medium", "category": "irrigation"}
            ]
        },
        {
            "day": 6,
            "tasks": [
                {"title": "Monitor tillering and panicle initiation", "description": "Ensure infection has not reached panicles; remove any newly infected sheaths.", "priority": "high", "category": "disease_management"},
                {"title": "Maintain field sanitation", "description": "Clear remaining weeds and debris to reduce fungal survival.", "priority": "medium", "category": "location_specific"},
                {"title": "Prepare for harvest", "description": "Clean harvesting equipment to avoid spreading fungal sclerotia.", "priority": "medium", "category": "crop_maintenance"}
            ]
        },
        {
            "day": 7,
            "tasks": [
                {"title": "Final evaluation of Sheath Blight impact", "description": "Assess crop damage and yield loss. Document lessons learned and effective measures for next season.", "priority": "high", "category": "disease_management"},
                {"title": "Clean field residues", "description": "Remove and destroy all infected plant material to reduce inoculum for next season.", "priority": "medium", "category": "location_specific"},
                {"title": "Stop unnecessary irrigation before harvest", "description": "Maintain standard water level; avoid excess moisture favoring fungal growth.", "priority": "medium", "category": "irrigation"}
            ]
        }
    ]
},
{
    "crop": "rice",
    "disease": "Narrow Brown Leaf Spot",
    "location": "Islamabad",
    "temperature_range": {"min": 3, "max": 20},
    "day_plans": [
        {
            "day": 1,
            "tasks": [
                {"title": "Inspect leaves for narrow brown lesions", "description": "Look for small, narrow, brown to reddish-brown spots along leaf veins. Early detection prevents severe infection.", "priority": "high", "category": "disease_management"},
                {"title": "Remove heavily infected leaves", "description": "Cut and destroy leaves with extensive lesions to reduce pathogen load.", "priority": "medium", "category": "crop_maintenance"},
                {"title": "Check field drainage", "description": "Ensure proper water management; poorly drained or waterlogged fields favor disease development.", "priority": "medium", "category": "irrigation"}
            ]
        },
        {
            "day": 2,
            "tasks": [
                {"title": "Monitor field edges", "description": "The disease often spreads from margins. Inspect edges and note early symptoms.", "priority": "high", "category": "disease_management"},
                {"title": "Maintain balanced fertilization", "description": "Avoid excessive nitrogen; high nitrogen encourages soft, susceptible growth.", "priority": "medium", "category": "crop_maintenance"},
                {"title": "Remove weeds and debris", "description": "Clear the field of weeds and crop residues which can harbor fungal spores.", "priority": "medium", "category": "location_specific"}
            ]
        },
        {
            "day": 3,
            "tasks": [
                {"title": "Spray recommended fungicide if threshold exceeded", "description": "Apply fungicide on affected leaves using proper dosage and timing.", "priority": "high", "category": "disease_management"},
                {"title": "Maintain uniform irrigation", "description": "Avoid water stress and standing water; keep optimal moisture levels.", "priority": "medium", "category": "irrigation"},
                {"title": "Promote airflow", "description": "Ensure proper spacing and reduce canopy density to minimize leaf wetness.", "priority": "medium", "category": "location_specific"}
            ]
        },
        {
            "day": 4,
            "tasks": [
                {"title": "Assess effectiveness of fungicide", "description": "Check treated leaves after 24–48 hours for reduction in new lesions.", "priority": "high", "category": "disease_management"},
                {"title": "Inspect all leaf levels", "description": "Check mid and upper leaves for new spots; remove heavily infected leaves.", "priority": "high", "category": "disease_management"},
                {"title": "Record observations", "description": "Document affected area, weather, and treatment applied for reference.", "priority": "low", "category": "crop_maintenance"}
            ]
        },
        {
            "day": 5,
            "tasks": [
                {"title": "Apply second fungicide spray if needed", "description": "If disease persists, use a second fungicide application with chemical rotation.", "priority": "medium", "category": "disease_management"},
                {"title": "Inspect field edges again", "description": "Check margins for new spots to prevent further spread.", "priority": "medium", "category": "disease_management"},
                {"title": "Maintain balanced irrigation", "description": "Keep water level consistent; avoid stress or excessive moisture.", "priority": "medium", "category": "irrigation"}
            ]
        },
        {
            "day": 6,
            "tasks": [
                {"title": "Monitor panicle initiation stage", "description": "Ensure infection has not spread to reproductive parts. Remove infected tillers if necessary.", "priority": "high", "category": "disease_management"},
                {"title": "Maintain field hygiene", "description": "Clear remaining weeds and crop residues to reduce fungal survival.", "priority": "medium", "category": "location_specific"},
                {"title": "Prepare for harvest", "description": "Ensure harvesting equipment is clean to avoid pathogen spread.", "priority": "medium", "category": "crop_maintenance"}
            ]
        },
        {
            "day": 7,
            "tasks": [
                {"title": "Final evaluation of Narrow Brown Leaf Spot impact", "description": "Assess crop damage and yield loss. Document lessons learned for future seasons.", "priority": "high", "category": "disease_management"},
                {"title": "Clean field residues", "description": "Remove and destroy all infected plant material to reduce inoculum for next season.", "priority": "medium", "category": "location_specific"},
                {"title": "Stop unnecessary irrigation before harvest", "description": "Maintain standard water level; avoid excess moisture favoring fungal spread.", "priority": "medium", "category": "irrigation"}
            ]
        }
    ]
},
{
    "crop": "rice",
    "disease": "Sheath Rot",
    "location": "Islamabad",
    "temperature_range": {"min": 3, "max": 20},
    "day_plans": [
        {
            "day": 1,
            "tasks": [
                {"title": "Inspect upper leaf sheaths and panicles", "description": "Look for grayish-white lesions with dark margins at the base of panicles and upper leaf sheaths.", "priority": "high", "category": "disease_management"},
                {"title": "Remove severely infected panicles", "description": "Cut and destroy affected panicles to reduce inoculum and prevent spread.", "priority": "medium", "category": "crop_maintenance"},
                {"title": "Check water management", "description": "Avoid waterlogging; high humidity and stagnant water favor sheath rot development.", "priority": "medium", "category": "irrigation"}
            ]
        },
        {
            "day": 2,
            "tasks": [
                {"title": "Monitor dense clumps and field edges", "description": "Sheath rot often starts in dense plant clusters or field margins; inspect carefully.", "priority": "high", "category": "disease_management"},
                {"title": "Avoid excessive nitrogen application", "description": "High nitrogen encourages lush growth which is more susceptible to sheath rot.", "priority": "medium", "category": "crop_maintenance"},
                {"title": "Remove crop residues", "description": "Clear weeds and debris that can harbor the fungal pathogen.", "priority": "medium", "category": "location_specific"}
            ]
        },
        {
            "day": 3,
            "tasks": [
                {"title": "Apply recommended fungicide", "description": "Spray fungicide on infected sheaths and panicles, focusing on the base of tillers.", "priority": "high", "category": "disease_management"},
                {"title": "Maintain proper irrigation", "description": "Keep water level uniform; avoid excess water on leaf sheaths.", "priority": "medium", "category": "irrigation"},
                {"title": "Promote airflow", "description": "Reduce canopy density and maintain proper spacing to minimize humidity.", "priority": "medium", "category": "location_specific"}
            ]
        },
        {
            "day": 4,
            "tasks": [
                {"title": "Assess effectiveness of fungicide", "description": "Check treated plants after 24–48 hours to see if lesion spread has stopped.", "priority": "high", "category": "disease_management"},
                {"title": "Inspect mid and upper sheaths", "description": "Check all sheaths for new lesions; remove heavily infected ones.", "priority": "high", "category": "disease_management"},
                {"title": "Document observations", "description": "Record infection severity, weather conditions, and treatments applied.", "priority": "low", "category": "crop_maintenance"}
            ]
        },
        {
            "day": 5,
            "tasks": [
                {"title": "Apply second fungicide spray if needed", "description": "If infection persists, use a second round of fungicide with proper chemical rotation.", "priority": "medium", "category": "disease_management"},
                {"title": "Inspect field edges again", "description": "Check margins for new lesions to prevent further spread.", "priority": "medium", "category": "disease_management"},
                {"title": "Maintain balanced irrigation", "description": "Keep water level consistent and avoid stress or puddling.", "priority": "medium", "category": "irrigation"}
            ]
        },
        {
            "day": 6,
            "tasks": [
                {"title": "Monitor panicle emergence and grain filling", "description": "Ensure infection has not spread further. Remove any newly infected sheaths.", "priority": "high", "category": "disease_management"},
                {"title": "Maintain field hygiene", "description": "Clear remaining weeds and crop residues to reduce fungal survival.", "priority": "medium", "category": "location_specific"},
                {"title": "Prepare for harvest", "description": "Clean harvesting tools to avoid spreading spores.", "priority": "medium", "category": "crop_maintenance"}
            ]
        },
        {
            "day": 7,
            "tasks": [
                {"title": "Final evaluation of Sheath Rot impact", "description": "Assess crop damage and yield loss. Document effective measures and lessons for next season.", "priority": "high", "category": "disease_management"},
                {"title": "Clean field residues", "description": "Remove and destroy all infected plant material to reduce inoculum for next season.", "priority": "medium", "category": "location_specific"},
                {"title": "Stop unnecessary irrigation before harvest", "description": "Maintain standard water level; avoid excess moisture favoring fungal growth.", "priority": "medium", "category": "irrigation"}
            ]
        }
    ]
},
{
    "crop": "rice",
    "disease": "Rice Blast",
    "location": "Islamabad",
    "temperature_range": {"min": 3, "max": 20},
    "day_plans": [
        {
            "day": 1,
            "tasks": [
                {"title": "Inspect leaves, nodes, and panicles for lesions", "description": "Look for diamond-shaped or spindle-shaped lesions on leaves, gray centers with brown borders. Check nodes and panicles for lesions.", "priority": "high", "category": "disease_management"},
                {"title": "Remove heavily infected leaves", "description": "Cut and destroy leaves with large lesions to reduce inoculum.", "priority": "medium", "category": "crop_maintenance"},
                {"title": "Check field drainage", "description": "Ensure proper water management; standing water and poor drainage increase blast risk.", "priority": "medium", "category": "irrigation"}
            ]
        },
        {
            "day": 2,
            "tasks": [
                {"title": "Monitor field edges and dense areas", "description": "Rice blast often starts in field margins or dense clumps. Inspect carefully.", "priority": "high", "category": "disease_management"},
                {"title": "Maintain balanced fertilization", "description": "Avoid excessive nitrogen, which promotes soft tissue susceptible to blast.", "priority": "medium", "category": "crop_maintenance"},
                {"title": "Remove weeds and crop residues", "description": "Weeds and old residues can harbor the fungus. Clear them from the field.", "priority": "medium", "category": "location_specific"}
            ]
        },
        {
            "day": 3,
            "tasks": [
                {"title": "Apply recommended fungicide", "description": "Spray fungicide approved for rice blast on leaves, nodes, and panicles, focusing on early lesions.", "priority": "high", "category": "disease_management"},
                {"title": "Maintain proper irrigation", "description": "Keep water levels consistent; avoid water stress or excess moisture on leaves.", "priority": "medium", "category": "irrigation"},
                {"title": "Promote airflow", "description": "Ensure proper spacing and reduce canopy density to minimize humidity.", "priority": "medium", "category": "location_specific"}
            ]
        },
        {
            "day": 4,
            "tasks": [
                {"title": "Assess effectiveness of fungicide", "description": "Check treated areas after 24–48 hours to see if lesion spread has stopped.", "priority": "high", "category": "disease_management"},
                {"title": "Inspect all leaf and panicle levels", "description": "Check for new lesions and remove heavily infected leaves or panicles.", "priority": "high", "category": "disease_management"},
                {"title": "Document observations", "description": "Record affected areas, weather conditions, and treatment applied for reference.", "priority": "low", "category": "crop_maintenance"}
            ]
        },
        {
            "day": 5,
            "tasks": [
                {"title": "Apply second fungicide spray if needed", "description": "Use chemical rotation to prevent resistance if infection persists.", "priority": "medium", "category": "disease_management"},
                {"title": "Inspect field edges again", "description": "Re-check margins and dense areas for new lesions to prevent spread.", "priority": "medium", "category": "disease_management"},
                {"title": "Maintain balanced irrigation", "description": "Keep water levels consistent; avoid stress or puddling.", "priority": "medium", "category": "irrigation"}
            ]
        },
        {
            "day": 6,
            "tasks": [
                {"title": "Monitor panicle emergence and grain filling", "description": "Ensure infection has not reached reproductive parts; remove newly infected panicles.", "priority": "high", "category": "disease_management"},
                {"title": "Maintain field hygiene", "description": "Clear remaining weeds and crop residues to reduce fungal survival.", "priority": "medium", "category": "location_specific"},
                {"title": "Prepare for harvest", "description": "Clean harvesting tools to avoid spreading spores.", "priority": "medium", "category": "crop_maintenance"}
            ]
        },
        {
            "day": 7,
            "tasks": [
                {"title": "Final evaluation of Rice Blast impact", "description": "Assess crop damage and yield loss. Document effective measures and lessons for next season.", "priority": "high", "category": "disease_management"},
                {"title": "Clean field residues", "description": "Remove and destroy all infected plant material to reduce inoculum for next season.", "priority": "medium", "category": "location_specific"},
                {"title": "Stop unnecessary irrigation before harvest", "description": "Maintain standard water level; avoid excess moisture favoring fungal spread.", "priority": "medium", "category": "irrigation"}
            ]
        }
    ]
},
{
    "crop": "rice",
    "disease": "Tangro",
    "location": "Islamabad",
    "temperature_range": {"min": 3, "max": 20},
    "day_plans": [
        {
            "day": 1,
            "tasks": [
                {"title": "Inspect plants for yellowing and stunted growth", "description": "Look for yellowing leaves, stunted tillers, and weak plants. Early detection is critical for Tangro management.", "priority": "high", "category": "disease_management"},
                {"title": "Remove severely infected plants", "description": "Uproot and destroy severely affected plants to reduce pathogen load.", "priority": "medium", "category": "crop_maintenance"},
                {"title": "Check field drainage", "description": "Ensure proper water management; stagnant water can worsen disease symptoms.", "priority": "medium", "category": "irrigation"}
            ]
        },
        {
            "day": 2,
            "tasks": [
                {"title": "Monitor nursery and young plants", "description": "Tangro often affects seedlings; inspect nurseries and young plants carefully.", "priority": "high", "category": "disease_management"},
                {"title": "Maintain balanced fertilization", "description": "Avoid excessive nitrogen; use recommended doses of phosphorus and potassium to strengthen plants.", "priority": "medium", "category": "crop_maintenance"},
                {"title": "Remove weeds and debris", "description": "Clear weeds and crop residues to prevent disease spread.", "priority": "medium", "category": "location_specific"}
            ]
        },
        {
            "day": 3,
            "tasks": [
                {"title": "Apply recommended treatment", "description": "Spray fungicides or bactericides approved for Tangro if infection threshold is exceeded.", "priority": "high", "category": "disease_management"},
                {"title": "Maintain proper irrigation", "description": "Avoid overwatering; keep optimal moisture levels to reduce disease severity.", "priority": "medium", "category": "irrigation"},
                {"title": "Promote airflow", "description": "Maintain plant spacing and reduce canopy density to improve ventilation.", "priority": "medium", "category": "location_specific"}
            ]
        },
        {
            "day": 4,
            "tasks": [
                {"title": "Assess effectiveness of treatment", "description": "Check treated plants after 24–48 hours to see if disease progression has slowed.", "priority": "high", "category": "disease_management"},
                {"title": "Inspect all plant levels", "description": "Check tillers, leaves, and panicles for new symptoms; remove affected parts.", "priority": "high", "category": "disease_management"},
                {"title": "Document observations", "description": "Record severity, treatment applied, and weather conditions for future reference.", "priority": "low", "category": "crop_maintenance"}
            ]
        },
        {
            "day": 5,
            "tasks": [
                {"title": "Apply second treatment if needed", "description": "Use proper chemical rotation if infection persists.", "priority": "medium", "category": "disease_management"},
                {"title": "Inspect field edges and dense patches", "description": "Re-check margins and crowded areas for new infections.", "priority": "medium", "category": "disease_management"},
                {"title": "Maintain balanced irrigation", "description": "Ensure consistent water level; avoid water stress or puddling.", "priority": "medium", "category": "irrigation"}
            ]
        },
        {
            "day": 6,
            "tasks": [
                {"title": "Monitor panicle initiation and grain filling", "description": "Ensure infection has not reached reproductive parts. Remove newly affected tillers if necessary.", "priority": "high", "category": "disease_management"},
                {"title": "Maintain field hygiene", "description": "Clear remaining weeds and crop residues to reduce pathogen survival.", "priority": "medium", "category": "location_specific"},
                {"title": "Prepare for harvest", "description": "Clean harvesting equipment to avoid spreading infection.", "priority": "medium", "category": "crop_maintenance"}
            ]
        },
        {
            "day": 7,
            "tasks": [
                {"title": "Final evaluation of Tangro impact", "description": "Assess crop damage and yield loss. Document effective measures and lessons for next season.", "priority": "high", "category": "disease_management"},
                {"title": "Clean field residues", "description": "Remove and destroy all infected plant material to reduce pathogen carryover.", "priority": "medium", "category": "location_specific"},
                {"title": "Stop unnecessary irrigation before harvest", "description": "Maintain standard water level; avoid excess moisture that favors disease.", "priority": "medium", "category": "irrigation"}
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

