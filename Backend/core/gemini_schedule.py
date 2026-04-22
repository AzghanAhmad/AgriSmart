"""
Gemini API integration for generating farming schedules for diseases not in seed data
"""
import json
from typing import Dict, List, Optional

try:
    from ..config import get_gemini_api_key, get_gemini_model
except ImportError:
    from config import get_gemini_api_key, get_gemini_model


def generate_schedule_with_gemini(
    crop_type: str,
    disease: str,
    location: str,
    temperature: float,
    days: int = 7
) -> Optional[List[Dict]]:
    """
    Generate a 7-day farming schedule using Gemini API for diseases not in seed data.
    
    Args:
        crop_type: Type of crop (wheat, rice, cotton)
        disease: Name of the disease
        location: Location name (e.g., 'Islamabad')
        temperature: Current/average temperature
        days: Number of days for schedule (default 7)
    
    Returns:
        List of day plans with tasks, or None if API call fails
    """
    api_key = get_gemini_api_key()
    if not api_key:
        print("⚠️ Gemini API key not configured. Cannot generate schedule.")
        return None
    
    try:
        import google.generativeai as genai
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(get_gemini_model())
        
        prompt = f"""Generate a personalized 7-day farming schedule for managing {disease} in {crop_type} crops in {location} location.

Current temperature: {temperature}°C

Requirements:
1. Create a detailed 7-day plan with specific tasks for each day
2. Consider location-specific factors for {location}
3. Adjust tasks based on temperature ({temperature}°C)
4. Include disease management, weather advisory, location-specific, and crop maintenance tasks
5. Each day should have 2-4 tasks with priorities (high/medium/low) and categories

Format the response as JSON with this structure:
{{
  "day_plans": [
    {{
      "day": 1,
      "tasks": [
        {{
          "title": "Task title",
          "description": "Detailed task description",
          "priority": "high|medium|low",
          "category": "disease_management|weather_advisory|location_specific|crop_maintenance"
        }}
      ]
    }},
    ... (for days 2-7)
  ]
}}

Focus on practical, actionable tasks that farmers can follow daily. Consider:
- Disease-specific treatment recommendations
- Weather-based adjustments
- Location-specific soil and water management
- General crop maintenance activities

Return ONLY valid JSON, no additional text."""

        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Clean response text (remove markdown code blocks if present)
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        if response_text.startswith('```'):
            response_text = response_text[3:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        # Parse JSON response
        schedule_data = json.loads(response_text)
        
        if 'day_plans' in schedule_data and isinstance(schedule_data['day_plans'], list):
            return schedule_data['day_plans']
        else:
            print("⚠️ Invalid response format from Gemini API")
            return None
            
    except ImportError:
        print("⚠️ google-generativeai package not installed. Install with: pip install google-generativeai")
        return None
    except json.JSONDecodeError as e:
        print(f"⚠️ Failed to parse Gemini API response: {str(e)}")
        print(f"Response text: {response_text[:200]}...")
        return None
    except Exception as e:
        print(f"⚠️ Error calling Gemini API: {str(e)}")
        return None

