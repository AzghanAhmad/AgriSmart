# Personalized Farming Schedule Setup Guide

## Overview
The personalized farming schedule feature generates AI-driven daily/weekly tasks based on:
1. **Crop Disease Status** - From recent disease detections
2. **Cure Guidance** - Treatment recommendations from detections
3. **Weather Forecast** - 7-day forecast from OpenWeather API
4. **Location/Land Type** - Region-specific recommendations

## Backend Setup

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure OpenWeather API
Add to your `.env` file:
```
OPENWEATHER_API_KEY=your_api_key_here
```

Get your free API key from: https://openweathermap.org/api

### 3. Database Schema
The following tables are automatically created:
- `Schedules` - Stores generated schedules
- `ScheduleProgress` - Tracks weekly completion rates

### 4. API Endpoints

#### Generate Schedule
```
POST /api/farmer/schedule/generate
Body: {
  "farmerId": "string",
  "cropType": "wheat|rice|cotton",
  "location": "Punjab, Pakistan",
  "weekNumber": "week1",
  "latitude": 31.5204,  // Optional
  "longitude": 74.3587  // Optional
}
```

#### Get Current Schedule
```
GET /api/farmer/schedule/current?farmerId=xxx&weekNumber=week1
```

#### Update Progress
```
POST /api/farmer/schedule/progress
Body: {
  "scheduleId": "string",
  "weekNumber": "week1",
  "completionRate": "0.75",
  "notes": "Optional notes"
}
```

#### Get Weather Forecast
```
GET /api/farmer/schedule/weather?lat=31.5204&lon=74.3587
```

## How It Works

### Week 1
1. Fetches recent disease detections for the farmer
2. Gets 7-day weather forecast from OpenWeather
3. Generates location-specific recommendations
4. Creates crop-specific maintenance tasks
5. Combines all factors into prioritized schedule

### After Week 1
1. Checks previous week's completion rate
2. Adjusts task priorities based on progress
3. Adds review tasks if completion was low
4. Generates new schedule considering previous results

## Frontend Integration

The schedule screen automatically:
- Loads current week's schedule on mount
- Displays weather forecast if available
- Shows tasks grouped by priority
- Allows marking tasks as complete
- Tracks weekly progress

## Task Categories

- **disease_management** - Tasks from disease detections
- **weather_advisory** - Weather-based recommendations
- **location_specific** - Region-specific tasks
- **maintenance** - Standard crop maintenance

## Task Sources

- **disease_detection** - From AI disease detection
- **weather_forecast** - From OpenWeather API
- **location_analysis** - From location data
- **crop_schedule** - Standard crop schedule

## Notes

- Weather API requires valid API key
- Location coordinates improve accuracy (uses geocoding if not provided)
- Progress tracking enables adaptive scheduling for future weeks
- All tasks are stored in database for persistence

