# Extended Unit Testing - AgriSmart Project (Part 2)

## Additional Test Cases - Weather, Schedule, and Frontend Integration

---

## Module 8: Weather Integration & Recommendations

| Test case ID | Test Objective | Precondition | Steps | Test data | Expected result | Post-condition | Actual Result | Pass/fail |
|--------------|----------------|--------------|-------|-----------|-----------------|----------------|---------------|-----------|
| TC076 | Verify weather API call with valid coordinates | OpenWeather API key configured | 1. Call get_weather_forecast()<br>2. Provide valid lat/lon<br>3. Verify 7-day forecast returned | lat: 31.5204<br>lon: 74.3587<br>days: 7 | Returns forecast for 7 days<br>Each day has temp, humidity, precipitation | Weather data retrieved | | |
| TC077 | Verify weather API fallback mechanism | One Call API fails | 1. Simulate One Call API failure<br>2. Verify fallback to 5-day forecast<br>3. Check data aggregation | lat: 31.5204<br>lon: 74.3587 | Falls back to 5-day/3-hour API<br>Aggregates to daily summaries<br>Returns 7 days | Fallback works correctly | | |
| TC078 | Verify weather API with missing API key | API key not configured | 1. Call get_weather_forecast()<br>2. Verify null returned<br>3. Check warning logged | OPENWEATHER_API_KEY: null | Returns None<br>Logs warning message<br>No exception thrown | Graceful degradation | | |
| TC079 | Verify weather recommendations for high temperature | Forecast shows temp >35°C | 1. Get weather forecast<br>2. Call get_weather_recommendations()<br>3. Verify high temp advice | temp_avg: 38°C | Returns: "High temperature: Increase irrigation frequency" | Recommendation generated | | |
| TC080 | Verify weather recommendations for low temperature | Forecast shows temp <10°C | 1. Get weather forecast<br>2. Generate recommendations<br>3. Verify frost protection advice | temp_avg: 5°C | Returns: "Low temperature: Protect crops from frost" | Recommendation generated | | |
| TC081 | Verify weather recommendations for heavy rain | Forecast shows precipitation >5mm | 1. Get weather forecast<br>2. Generate recommendations<br>3. Verify rain advice | precipitation: 15mm | Returns: "Heavy rain: Avoid irrigation, ensure drainage" | Recommendation generated | | |
| TC082 | Verify weather recommendations for strong winds | Forecast shows wind >15 m/s | 1. Get weather forecast<br>2. Generate recommendations<br>3. Verify wind advice | wind_speed: 20 m/s | Returns: "Strong winds: Secure plants, avoid spraying" | Recommendation generated | | |
| TC083 | Verify weather data daily aggregation | 3-hour forecast data received | 1. Receive 5-day/3-hour data<br>2. Aggregate to daily<br>3. Verify min/max temps | Multiple 3-hour intervals | Daily min = lowest temp<br>Daily max = highest temp<br>Precipitation summed | Aggregation correct | | |
| TC084 | Verify weather forecast date range | Request 7-day forecast | 1. Call weather API<br>2. Verify dates returned<br>3. Check date range | days: 7 | Returns exactly 7 days<br>Starting from today<br>Sequential dates | Date range correct | | |
| TC085 | Verify weather API timeout handling | API takes >10 seconds | 1. Simulate slow API<br>2. Verify timeout<br>3. Check error handling | timeout: 10s | Request times out<br>Returns None<br>Error logged | Timeout handled | | |

---

## Module 9: Schedule Generation & Progress Tracking

| Test case ID | Test Objective | Precondition | Steps | Test data | Expected result | Post-condition | Actual Result | Pass/fail |
|--------------|----------------|--------------|-------|-----------|-----------------|----------------|---------------|-----------|
| TC086 | Verify schedule generation endpoint | Farmer is logged in | 1. Call /api/farmer/schedule/generate<br>2. Provide required data<br>3. Verify schedule created | farmerId: test-farmer-1<br>cropType: wheat<br>location: Lahore | Schedule created with unique ID<br>Tasks generated<br>Status: 201 | Schedule saved to database | | |
| TC087 | Verify schedule generation with missing farmerId | Backend is running | 1. Call schedule generation<br>2. Omit farmerId<br>3. Verify error | farmerId: null<br>cropType: wheat | Returns error 400<br>Message: "Missing farmerId" | No schedule created | | |
| TC088 | Verify schedule generation with missing cropType | Backend is running | 1. Call schedule generation<br>2. Omit cropType<br>3. Verify error | farmerId: test-farmer-1<br>cropType: null | Returns error 400<br>Message: "Missing cropType" | No schedule created | | |
| TC089 | Verify schedule includes disease management tasks | Farmer has recent detections | 1. Create detections<br>2. Generate schedule<br>3. Verify disease tasks included | Recent detections: 2<br>Confidence: >50% | Schedule includes disease treatment tasks<br>Priority: high<br>Category: disease_management | Disease tasks generated | | |
| TC090 | Verify schedule includes weather-based tasks | GPS coordinates provided | 1. Provide lat/lon<br>2. Generate schedule<br>3. Verify weather tasks | lat: 31.5204<br>lon: 74.3587 | Schedule includes weather advisory tasks<br>Based on 7-day forecast | Weather tasks generated | | |
| TC091 | Verify schedule without GPS coordinates | No GPS data provided | 1. Generate schedule without lat/lon<br>2. Verify weather tasks skipped<br>3. Check other tasks included | lat: null<br>lon: null | Schedule generated without weather tasks<br>Includes disease, location, maintenance tasks | Schedule works without GPS | | |
| TC092 | Verify schedule task prioritization | Multiple task types generated | 1. Generate full schedule<br>2. Verify task order<br>3. Check priority sorting | All task types | High priority tasks first<br>Then medium, then low<br>Within priority, sorted by date | Prioritization correct | | |
| TC093 | Verify schedule limited to 14 tasks | Many tasks generated | 1. Generate schedule<br>2. Count returned tasks<br>3. Verify limit | Generated: 20+ tasks | Returns maximum 14 tasks<br>Most important tasks selected | Task limit enforced | | |
| TC094 | Verify schedule progress update | Schedule exists | 1. Call /api/farmer/schedule/progress<br>2. Update completion rate<br>3. Verify saved | scheduleId: test-schedule-1<br>completionRate: 75<br>notes: "Good progress" | Progress updated successfully<br>Status: 200 | Progress saved to database | | |
| TC095 | Verify schedule progress with missing scheduleId | Backend is running | 1. Call progress update<br>2. Omit scheduleId<br>3. Verify error | scheduleId: null | Returns error 400<br>Message: "Missing scheduleId or weekNumber" | No progress saved | | |
| TC096 | Verify get current schedule | Schedule exists for farmer | 1. Call /api/farmer/schedule/current<br>2. Provide farmerId and weekNumber<br>3. Verify schedule returned | farmerId: test-farmer-1<br>weekNumber: week1 | Returns schedule with tasks<br>Includes scheduleId, weekNumber, generatedAt | Schedule retrieved | | |
| TC097 | Verify get schedule for non-existent week | No schedule for requested week | 1. Call get current schedule<br>2. Request non-existent week<br>3. Verify error | weekNumber: week99 | Returns error 404<br>Message: "Schedule not found" | Error handled gracefully | | |
| TC098 | Verify adaptive scheduling with previous progress | Previous week has low completion | 1. Set previous week completion <50%<br>2. Generate new schedule<br>3. Verify adjustment task | previousProgress: 40% | Schedule includes "Review and adjust schedule" task<br>Priority: high | Adaptive scheduling works | | |
| TC099 | Verify crop-specific maintenance tasks for wheat | Crop type is wheat | 1. Generate schedule<br>2. Verify wheat-specific tasks<br>3. Check task content | cropType: wheat | Includes: Irrigation check, Fertilizer application, Weed control | Wheat tasks generated | | |
| TC100 | Verify crop-specific maintenance tasks for rice | Crop type is rice | 1. Generate schedule<br>2. Verify rice-specific tasks<br>3. Check task content | cropType: rice | Includes: Water level management, Fertilizer top-dressing, Pest monitoring | Rice tasks generated | | |
| TC101 | Verify crop-specific maintenance tasks for cotton | Crop type is cotton | 1. Generate schedule<br>2. Verify cotton-specific tasks<br>3. Check task content | cropType: cotton | Includes: Irrigation scheduling, Pest control, Fertilizer application | Cotton tasks generated | | |
| TC102 | Verify location-based tasks for Punjab | Location contains "Punjab" | 1. Generate schedule<br>2. Verify Punjab-specific tasks<br>3. Check recommendations | location: "Lahore, Punjab" | Includes: Check soil pH, Monitor water table | Punjab tasks generated | | |
| TC103 | Verify location-based tasks for Sindh | Location contains "Sindh" | 1. Generate schedule<br>2. Verify Sindh-specific tasks<br>3. Check recommendations | location: "Karachi, Sindh" | Includes: Salinity management<br>Priority: high | Sindh tasks generated | | |
| TC104 | Verify schedule JSON storage | Schedule is created | 1. Generate schedule<br>2. Check database<br>3. Verify JSON format | farmerId: test-farmer-1 | Tasks stored as JSON in database<br>Valid JSON structure<br>All fields present | JSON storage works | | |
| TC105 | Verify schedule timestamp | Schedule is created | 1. Generate schedule<br>2. Check timestamp<br>3. Verify current time | farmerId: test-farmer-1 | Timestamp is current datetime<br>Format: ISO 8601 | Timestamp correct | | |

---

## Module 10: Frontend Integration & UI Components

| Test case ID | Test Objective | Precondition | Steps | Test data | Expected result | Post-condition | Actual Result | Pass/fail |
|--------------|----------------|--------------|-------|-----------|-----------------|----------------|---------------|-----------|
| TC106 | Verify signup form GPS capture button | User on signup screen | 1. Tap GPS icon<br>2. Grant location permission<br>3. Verify coordinates captured | User location: 31.5204, 74.3587 | Latitude and longitude fields populated<br>Location field auto-filled | GPS data ready for signup | | |
| TC107 | Verify signup form location permission denial | User on signup screen | 1. Tap GPS icon<br>2. Deny location permission<br>3. Verify error handling | Permission: denied | Alert shown: "Permission Denied"<br>User can still manually enter location | Graceful permission handling | | |
| TC108 | Verify signup form role selection | User on signup screen | 1. Tap farmer role button<br>2. Tap admin role button<br>3. Verify selection | role: farmer / admin | Selected role highlighted<br>Background color changes<br>Border color changes | Role selection works | | |
| TC109 | Verify signup form password visibility toggle | User on signup screen | 1. Enter password<br>2. Tap eye icon<br>3. Verify password shown/hidden | password: "Test123" | Password toggles between visible and hidden<br>Eye icon changes | Password toggle works | | |
| TC110 | Verify disease detection crop selection | User on detection screen | 1. View crop grid<br>2. Tap wheat card<br>3. Verify crop selected | crop: wheat | Wheat selected<br>Upload options displayed<br>Back button shown | Crop selection works | | |
