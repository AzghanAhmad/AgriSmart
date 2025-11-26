import requests
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional
try:
    from ..config import get_weather_api_key
except ImportError:
    from config import get_weather_api_key

def get_weather_forecast(lat: float, lon: float, days: int = 7) -> Optional[Dict]:
    """Fetch weather forecast from OpenWeather API for specified days (7 days from today)"""
    api_key = get_weather_api_key()
    if not api_key:
        print("⚠️ OpenWeather API key not configured")
        return None
    
    try:
        # Try One Call API 2.5 first (gives 7-day daily forecast)
        try:
            url = "https://api.openweathermap.org/data/2.5/onecall"
            params = {
                'lat': lat,
                'lon': lon,
                'exclude': 'current,minutely,hourly,alerts',
                'appid': api_key,
                'units': 'metric'
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            # Process daily forecast (7 days)
            forecast_list = []
            today = datetime.now().date()
            
            for i, day_data in enumerate(data.get('daily', [])[:days]):
                forecast_date = datetime.fromtimestamp(day_data['dt']).date()
                forecast_list.append({
                    'date': forecast_date.isoformat(),
                    'temp_min': day_data['temp']['min'],
                    'temp_max': day_data['temp']['max'],
                    'humidity': day_data.get('humidity', 0),
                    'precipitation': day_data.get('rain', 0) + day_data.get('snow', 0),
                    'wind_speed': day_data.get('wind_speed', 0),
                    'description': day_data['weather'][0]['description'],
                    'main': day_data['weather'][0]['main'],
                    'icon': day_data['weather'][0]['icon']
                })
            
            return {
                'location': {
                    'lat': lat,
                    'lon': lon,
                    'city': 'Unknown'  # One Call API doesn't provide city name
                },
                'forecast': forecast_list
            }
        except Exception as onecall_error:
            # Fallback to 5-day/3-hour forecast if One Call API fails
            print(f"⚠️ One Call API failed, using 5-day forecast: {str(onecall_error)}")
            
            url = f"https://api.openweathermap.org/data/2.5/forecast"
            params = {
                'lat': lat,
                'lon': lon,
                'appid': api_key,
                'units': 'metric'
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            # Process forecast data into daily summaries
            daily_forecasts = {}
            today = datetime.now().date()
            
            for item in data.get('list', []):
                dt = datetime.fromtimestamp(item['dt'])
                date_key = dt.date()
                
                # Only include dates from today onwards, up to 7 days
                days_diff = (date_key - today).days
                if days_diff < 0 or days_diff >= days:
                    continue
                
                date_str = date_key.isoformat()
                
                if date_str not in daily_forecasts:
                    daily_forecasts[date_str] = {
                        'date': date_str,
                        'temp_min': item['main']['temp_min'],
                        'temp_max': item['main']['temp_max'],
                        'humidity': item['main']['humidity'],
                        'precipitation': item.get('rain', {}).get('3h', 0) + item.get('snow', {}).get('3h', 0),
                        'wind_speed': item.get('wind', {}).get('speed', 0),
                        'description': item['weather'][0]['description'],
                        'main': item['weather'][0]['main'],
                        'icon': item['weather'][0]['icon']
                    }
                else:
                    # Update min/max temps
                    daily_forecasts[date_str]['temp_min'] = min(
                        daily_forecasts[date_str]['temp_min'], 
                        item['main']['temp_min']
                    )
                    daily_forecasts[date_str]['temp_max'] = max(
                        daily_forecasts[date_str]['temp_max'], 
                        item['main']['temp_max']
                    )
                    # Accumulate precipitation
                    daily_forecasts[date_str]['precipitation'] += (
                        item.get('rain', {}).get('3h', 0) + 
                        item.get('snow', {}).get('3h', 0)
                    )
            
            # Sort by date and ensure we have exactly 7 days from today
            forecast_list = []
            for i in range(days):
                target_date = (today + timedelta(days=i)).isoformat()
                if target_date in daily_forecasts:
                    forecast_list.append(daily_forecasts[target_date])
                else:
                    # If missing a day, use the last available day's data
                    if forecast_list:
                        last_day = forecast_list[-1].copy()
                        last_day['date'] = target_date
                        forecast_list.append(last_day)
            
            return {
                'location': {
                    'lat': lat,
                    'lon': lon,
                    'city': data.get('city', {}).get('name', 'Unknown')
                },
                'forecast': forecast_list[:days]  # Ensure exactly requested days
            }
    except Exception as e:
        print(f"❌ Weather API error: {str(e)}")
        return None

def get_weather_recommendations(forecast: Dict) -> List[str]:
    """Generate farming recommendations based on weather forecast"""
    recommendations = []
    
    for day in forecast.get('forecast', []):
        temp_avg = (day['temp_min'] + day['temp_max']) / 2
        precipitation = day['precipitation']
        wind_speed = day['wind_speed']
        main_weather = day['main']
        
        day_recs = []
        
        # Temperature-based recommendations
        if temp_avg < 10:
            day_recs.append("🌡️ Low temperature: Protect crops from frost, consider covering sensitive plants")
        elif temp_avg > 35:
            day_recs.append("🌡️ High temperature: Increase irrigation frequency, provide shade if possible")
        
        # Precipitation-based recommendations
        if precipitation > 5:
            day_recs.append("🌧️ Heavy rain expected: Avoid irrigation, ensure proper drainage, delay fertilizer application")
        elif precipitation > 0:
            day_recs.append("🌧️ Light rain expected: Reduce irrigation, good for natural watering")
        elif precipitation == 0 and temp_avg > 25:
            day_recs.append("☀️ Dry conditions: Increase irrigation, monitor soil moisture")
        
        # Wind-based recommendations
        if wind_speed > 15:
            day_recs.append("💨 Strong winds: Secure plants, avoid spraying pesticides, protect young crops")
        
        # Weather type recommendations
        if main_weather in ['Rain', 'Drizzle']:
            day_recs.append("🌧️ Rainy day: Postpone field work, focus on indoor tasks")
        elif main_weather == 'Clear':
            day_recs.append("☀️ Clear day: Good for field work, irrigation, and fertilizer application")
        elif main_weather in ['Clouds', 'Fog']:
            day_recs.append("☁️ Cloudy conditions: Moderate field activities, good for transplanting")
        
        if day_recs:
            recommendations.append({
                'date': day['date'],
                'recommendations': day_recs
            })
    
    return recommendations

