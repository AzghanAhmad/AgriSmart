# Farming Schedule Feature - Major Update

## Overview
The farming schedule feature has been completely redesigned to be more personalized and detection-based. Instead of generating a generic schedule, farmers now select a specific disease detection from their history, and the system generates a customized schedule based on 4 key factors.

## What Changed

### 1. New Detection Selection Page (`schedule-select.tsx`)
- **Location**: `project/app/(farmer)/schedule-select.tsx`
- **Features**:
  - Displays 7-day weather forecast at the top
  - Shows all farmer's disease detections in a grid layout
  - Each detection card shows:
    - Disease image
    - Disease name
    - Crop type
    - Confidence score
    - Detection date
  - Farmer selects one detection to generate schedule
  - Shows summary of 4 factors that will be considered:
    1. Location
    2. Weather (Temperature)
    3. Crop Type
    4. Disease

### 2. Updated Schedule Screen (`schedule.tsx`)
- Added "Create New Schedule" button at the top
- Button navigates to the new selection page
- Kept existing schedule display functionality
- Added secondary "7-Day Weather" button

### 3. New Backend Endpoint
- **Route**: `POST /api/farmer/schedule/generate-from-detection`
- **Location**: `Backend/routes/schedule.py`
- **Parameters**:
  ```json
  {
    "farmerId": "string",
    "detectionId": "string",
    "cropType": "wheat|rice|cotton",
    "disease": "string",
    "location": "string",
    "latitude": number,
    "longitude": number,
    "weekNumber": "week1"
  }
  ```

### 4. New Schedule Generator Function
- **Function**: `generate_schedule_from_detection()`
- **Location**: `Backend/core/schedule_generator.py`
- **Logic**:

#### Factor 1: Location
- Checks location string (Punjab, Sindh, etc.)
- Generates location-specific tasks:
  - Punjab: Soil pH checks, water table monitoring
  - Sindh: Salinity management
  - General: Field inspections

#### Factor 2: Weather (Temperature)
- Fetches 7-day weather forecast
- Temperature-based tasks:
  - **> 35°C**: Increase irrigation, monitor soil moisture
  - **< 10°C**: Protect from frost, consider covering
- Precipitation-based tasks:
  - **> 5mm**: Skip irrigation, ensure drainage
  - **0mm + high temp**: Increase irrigation

#### Factor 3: Crop Type
- Crop-specific maintenance tasks:
  - **Wheat**: Inspect for spread, adjust nitrogen, drainage, remove debris
  - **Rice**: Monitor water levels, check pest vectors, apply silicon, inspect bunds
  - **Cotton**: Scout for pests, prune branches, apply potassium, check irrigation

#### Factor 4: Disease
- Queries disease guidance database
- Creates high-priority tasks:
  - **Treatment**: Apply chemical control (with brand names)
  - **Prevention**: Cultural control measures
  - **Monitoring**: Check for symptoms (3 days later)
- Disease-specific crop tasks based on the detected disease

### 5. Database Changes

#### Added Column to Detections Table
```sql
ALTER TABLE Detections ADD COLUMN crop_type VARCHAR(50);
```

#### Updated Detection Schema
- File: `Backend/schemas/detection.py`
- Added `crop_type` field to store crop information

#### Updated Migration Script
- File: `Backend/migrate_db.py`
- Automatically adds `crop_type` column on startup

### 6. Updated Detection Storage
- File: `Backend/routes/farmer.py`
- Now stores:
  - `disease_id`: Disease name
  - `crop_type`: Crop type (wheat/rice/cotton)
  - Both used for schedule generation

### 7. Updated Detection API Response
- Endpoint: `GET /api/farmer/detections/recent`
- Now returns:
  ```json
  {
    "detections": [
      {
        "id": "detection-id",
        "name": "Disease Name",
        "cropType": "wheat",
        "confidence": 87,
        "imageUrl": "url",
        "detectedAt": "2024-01-15T10:30:00",
        "latitude": 31.5204,
        "longitude": 74.3587
      }
    ]
  }
  ```

## User Flow

### Old Flow:
1. Go to Schedule screen
2. Click "Generate Schedule"
3. Get generic schedule

### New Flow:
1. Go to Schedule screen
2. Click "Create New Schedule"
3. See 7-day weather forecast
4. See all disease detections in grid
5. Select one detection
6. See summary of 4 factors
7. Click "Generate Personalized Schedule"
8. Get customized schedule based on:
   - Selected disease
   - Crop type
   - Current weather/temperature
   - Farmer's location

## Task Priority System

### High Priority Tasks:
- Disease treatment (immediate)
- Disease prevention measures
- Temperature extremes (>35°C or <10°C)
- Heavy rain warnings
- Pest monitoring
- Field inspections for disease spread

### Medium Priority Tasks:
- Weather advisories
- Fertilizer applications
- Location-specific recommendations
- Crop maintenance

### Low Priority Tasks:
- General field maintenance
- Infrastructure checks

## Example Generated Schedule

For a farmer in Punjab who detected **Wheat Rust** with **35°C temperature**:

**Day 1 (Today):**
- ⚠️ HIGH: Apply fungicide treatment for Wheat Rust (Propiconazole 200ml/acre)
- ⚠️ HIGH: Increase irrigation due to high temperature (35°C)

**Day 2:**
- ⚠️ HIGH: Implement preventive measures (use resistant varieties, proper spacing)
- 🌡️ MEDIUM: Monitor soil moisture levels

**Day 3:**
- 🔍 MEDIUM: Monitor wheat for Wheat Rust symptoms (check for orange-brown pustules)
- 📍 MEDIUM: Check soil pH levels (Punjab-specific)

**Day 4:**
- 🌾 MEDIUM: Inspect wheat field for disease spread
- 🌡️ MEDIUM: Adjust nitrogen fertilizer application

**Day 5-7:**
- Additional crop maintenance and monitoring tasks

## Files Modified/Created

### Frontend (React Native):
1. ✅ **Created**: `project/app/(farmer)/schedule-select.tsx` (New selection page)
2. ✅ **Modified**: `project/app/(farmer)/schedule.tsx` (Added navigation button)

### Backend (Python/Flask):
1. ✅ **Modified**: `Backend/routes/schedule.py` (New endpoint)
2. ✅ **Modified**: `Backend/core/schedule_generator.py` (New function)
3. ✅ **Modified**: `Backend/routes/farmer.py` (Updated detection response)
4. ✅ **Modified**: `Backend/schemas/detection.py` (Added crop_type field)
5. ✅ **Modified**: `Backend/migrate_db.py` (Added migration)

## Testing Instructions

### 1. Run Database Migration
```bash
cd Backend
python migrate_db.py
```

### 2. Start Backend
```bash
cd Backend
python app.py
```

### 3. Start Frontend
```bash
cd project
npm run dev
```

### 4. Test the Feature
1. Login as a farmer
2. Go to Disease Detection
3. Scan 2-3 crops (different diseases if possible)
4. Go to Schedule tab
5. Click "Create New Schedule"
6. See your detections displayed
7. Select one detection
8. Review the 4 factors summary
9. Click "Generate Personalized Schedule"
10. View the customized schedule

## Benefits

### For Farmers:
- ✅ More relevant and actionable tasks
- ✅ Disease-specific treatment recommendations
- ✅ Weather-aware irrigation guidance
- ✅ Location-specific advice
- ✅ Crop-specific maintenance tasks

### For the System:
- ✅ Better data utilization (uses detection history)
- ✅ More intelligent recommendations
- ✅ Integrates multiple data sources
- ✅ Personalized to each farmer's situation

## Future Enhancements

1. **Multi-Detection Schedules**: Allow selecting multiple detections
2. **Schedule History**: Track and compare past schedules
3. **Task Completion Analytics**: Show which tasks improve outcomes
4. **Push Notifications**: Remind farmers of high-priority tasks
5. **Offline Support**: Cache schedules for offline access
6. **Voice Commands**: Generate schedules via voice input (Urdu support)

## Notes

- The system prioritizes disease management tasks
- Weather data is fetched in real-time
- Location recommendations are region-specific (Punjab, Sindh, etc.)
- Crop-specific tasks consider the detected disease
- All tasks are sorted by priority and date
- Maximum 14 tasks (2 weeks) are generated

---

**Status**: ✅ Fully Implemented and Ready for Testing
**Last Updated**: December 2024
