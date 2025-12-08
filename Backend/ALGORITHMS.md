# Algorithm Design Documentation
## AgriSmart - Core Algorithms and Pseudocode

This document describes the algorithms used in the current iteration of the AgriSmart project, covering the five major implemented features.

---

## Algorithm 1: YOLO-Based Crop Disease Detection

**Purpose:** Detect crop diseases from smartphone-captured images using fine-tuned YOLO (You Only Look Once) deep learning models.

**Input:** 
- Image file (I) from smartphone camera
- Crop type (C) ∈ {wheat, rice, cotton}

**Output:** 
- Disease label (D)
- Confidence score (Conf) ∈ [0, 100]
- Severity level (S) ∈ {Low, Medium, High}
- Treatment recommendations (T)

**Pseudocode:**

```
Algorithm 1: YOLO-Based Crop Disease Detection

1.  LoadModel(C)
2.  if (C not in ['wheat', 'rice', 'cotton']) then
3.      return Error("Invalid crop type")
4.  end if
5.  if (ModelCache[C] exists) then
6.      Model ← ModelCache[C]
7.  else
8.      ModelPath ← "models/" + C + "/best.pt"
9.      if (ModelPath not exists) then
10.         return Error("Model not found")
11.     end if
12.     Model ← YOLO.Load(ModelPath)
13.     ModelCache[C] ← Model
14. end if
15. 
16. Image ← Preprocess(I)  // Convert to RGB, normalize
17. Results ← Model.Predict(Image)
18. Detections ← Results[0]
19. 
20. PredictionList ← []
21. for each Box in Detections.Boxes do
22.     ClassID ← int(Box.Class)
23.     Confidence ← float(Box.Confidence)
24.     Label ← Detections.Names[ClassID]
25.     PredictionList.Append({Label, Confidence * 100})
26. end for
27. 
28. if (PredictionList is empty) then
29.     Disease ← "Healthy Crop"
30.     Confidence ← 100.0
31.     Severity ← "Low"
32. else
33.     TopPrediction ← PredictionList[0]  // Highest confidence
34.     Disease ← TopPrediction.Label
35.     Confidence ← TopPrediction.Confidence
36.     if (Confidence > 80) then
37.         Severity ← "High"
38.     else if (Confidence > 50) then
39.         Severity ← "Medium"
40.     else
41.         Severity ← "Low"
42.     end if
43. end if
44. 
45. Treatment ← QueryGuidance(C, Disease)
46. SaveDetection(FarmerID, Disease, Confidence, Image)
47. 
48. return {Disease, Confidence, Severity, Treatment}
```

**Key Components:**
- **Model Caching:** Prevents reloading models on each request (line 5-14)
- **YOLO Inference:** Single-pass object detection (line 17)
- **Confidence Thresholding:** Maps confidence scores to severity levels (line 36-42)
- **Database Persistence:** Saves detection record with image reference (line 46)

---

## Algorithm 2: Disease Cure Guidance Matching

**Purpose:** Retrieve localized treatment recommendations from database based on detected disease and crop type.

**Input:**
- Crop type (C)
- Disease name (D)

**Output:**
- Treatment instructions (T)
- Symptoms list (S)
- Prevention measures (P)

**Pseudocode:**

```
Algorithm 2: Disease Cure Guidance Matching

1.  NormalizeCrop ← LowerCase(Trim(C))
2.  NormalizeDisease ← LowerCase(Trim(D))
3.  NormalizeDisease ← Replace(NormalizeDisease, "_", " ")
4.  NormalizeDisease ← Replace(NormalizeDisease, "-", " ")
5.  
6.  DB ← OpenDatabaseConnection()
7.  Guidance ← DB.Query(
8.      SELECT * FROM DiseaseGuidance
9.      WHERE LOWER(crop) = NormalizeCrop
10.     AND LOWER(REPLACE(REPLACE(name, "_", " "), "-", " ")) = NormalizeDisease
11. )
12. 
13. if (Guidance is not NULL) then
14.     Treatment ← Guidance.Treatment
15.     Symptoms ← Split(Guidance.Symptoms, ",")
16.     Prevention ← Split(Guidance.Prevention, ",")
17. else
18.     Treatment ← "Apply recommended pesticide/fungicide as per NARC or FAO guidelines"
19.     Symptoms ← ["Lesions or discoloration detected", "Possible fungal or bacterial infection"]
20.     Prevention ← ["Use resistant crop variety", "Avoid overwatering", "Ensure balanced fertilization"]
21. end if
22. 
23. DB.Close()
24. return {Treatment, Symptoms, Prevention}
```

**Key Components:**
- **Name Normalization:** Handles variations in disease naming (underscores, hyphens, case) (line 1-4)
- **Fuzzy Matching:** Uses SQL functions for case-insensitive matching (line 9-10)
- **Fallback Logic:** Provides default recommendations if no match found (line 18-20)

---

## Algorithm 3: Personalized Farming Schedule Generation

**Purpose:** Generate AI-driven weekly farming tasks by combining disease status, weather forecast, location, and previous progress.

**Input:**
- Farmer ID (FID)
- Crop type (C)
- Location (L)
- Latitude (Lat), Longitude (Lon)
- Previous week progress (PWP) [Optional]

**Output:**
- List of tasks (T) for 7 days, prioritized and categorized

**Pseudocode:**

```
Algorithm 3: Personalized Farming Schedule Generation

1.  Tasks ← []
2.  Today ← CurrentDate()
3.  
4.  // Step 1: Get recent disease detections
5.  DB ← OpenDatabaseConnection()
6.  RecentDetections ← DB.Query(
7.      SELECT * FROM Detections
8.      WHERE farmer_id = FID
9.      ORDER BY timestamp DESC
10.     LIMIT 5
11. )
12. 
13. ActiveDiseases ← []
14. for each Detection in RecentDetections do
15.     if (Detection.Status = "pending" OR Detection.Confidence > 50) then
16.         Severity ← "high" if (Detection.Confidence > 80) else "medium"
17.         ActiveDiseases.Append({
18.             Disease: Detection.Disease,
19.             Confidence: Detection.Confidence,
20.             Severity: Severity
21.         })
22.     end if
23. end for
24. 
25. // Step 2: Generate disease management tasks
26. for i = 0 to min(2, ActiveDiseases.Length - 1) do
27.     TaskDate ← Today + i days
28.     Tasks.Append({
29.         ID: "disease-" + i,
30.         Title: "Apply treatment for " + ActiveDiseases[i].Disease,
31.         Description: "High priority: " + ActiveDiseases[i].Disease + 
32.                      " detected with " + ActiveDiseases[i].Confidence + "% confidence",
33.         DueDate: TaskDate,
34.         Priority: ActiveDiseases[i].Severity,
35.         Category: "disease_management",
36.         Source: "disease_detection"
37.     })
38. end for
39. 
40. // Step 3: Get weather forecast and generate weather-based tasks
41. if (Lat ≠ NULL AND Lon ≠ NULL) then
42.     WeatherData ← GetWeatherForecast(Lat, Lon, 7)
43.     if (WeatherData ≠ NULL) then
44.         WeatherRecs ← GetWeatherRecommendations(WeatherData)
45.         for each Recommendation in WeatherRecs do
46.             RecDate ← ParseDate(Recommendation.Date)
47.             if (RecDate ≥ Today) then
48.                 for each RecText in Recommendation.Recommendations do
49.                     Tasks.Append({
50.                         ID: "weather-" + RecDate + "-" + idx,
51.                         Title: ExtractTitle(RecText),
52.                         Description: RecText,
53.                         DueDate: RecDate,
54.                         Priority: "medium",
55.                         Category: "weather_advisory",
56.                         Source: "weather_forecast"
57.                     })
58.                 end for
59.             end if
60.         end for
61.     end if
62. end if
63. 
64. // Step 4: Generate location-based tasks
65. LocationTasks ← GetLocationBasedTasks(L, C)
66. for i = 0 to LocationTasks.Length - 1 do
67.     TaskDate ← Today + (i mod 7) days
68.     Tasks.Append({
69.         ID: "location-" + i,
70.         Title: LocationTasks[i].Title,
71.         Description: LocationTasks[i].Description,
72.         DueDate: TaskDate,
73.         Priority: LocationTasks[i].Priority,
74.         Category: "location_specific",
75.         Source: "location_analysis"
76.     })
77. end for
78. 
79. // Step 5: Generate crop maintenance tasks
80. MaintenanceTasks ← GetCropMaintenanceTasks(C, PWP)
81. for i = 0 to MaintenanceTasks.Length - 1 do
82.     TaskDate ← Today + (i mod 7) days
83.     Tasks.Append({
84.         ID: "maintenance-" + i,
85.         Title: MaintenanceTasks[i].Title,
86.         Description: MaintenanceTasks[i].Description,
87.         DueDate: TaskDate,
88.         Priority: MaintenanceTasks[i].Priority,
89.         Category: "maintenance",
90.         Source: "crop_schedule"
91.     })
92. end for
93. 
94. // Step 6: Prioritize and sort tasks
95. PriorityOrder ← {"high": 3, "medium": 2, "low": 1}
96. Tasks.Sort(Key: (Task) => (
97.     -PriorityOrder[Task.Priority],
98.     Task.DueDate
99. ))
100. 
101. // Step 7: Limit to 7 days (14 tasks max for 2 weeks)
102. FinalTasks ← Tasks[0:14]
103. 
104. DB.Close()
105. return FinalTasks
```

**Key Components:**
- **Multi-Factor Integration:** Combines 4 data sources (disease, weather, location, maintenance) (line 4-92)
- **Adaptive Scheduling:** Adjusts based on previous week progress (line 80)
- **Priority-Based Sorting:** Orders tasks by severity and date (line 95-99)
- **Time-Bounded:** Generates exactly 7 days of tasks (line 102)

---

## Algorithm 4: Weather-Based Task Recommendation Generation

**Purpose:** Generate farming recommendations based on 7-day weather forecast from OpenWeather API.

**Input:**
- Latitude (Lat)
- Longitude (Lon)
- Days (D) = 7

**Output:**
- Weather forecast data (WFD)
- Daily recommendations (Rec)

**Pseudocode:**

```
Algorithm 4: Weather-Based Task Recommendation Generation

1.  APIKey ← GetWeatherAPIKey()
2.  if (APIKey = NULL) then
3.      return NULL
4.  end if
5.  
6.  // Try One Call API 2.5 (7-day daily forecast)
7.  try
8.      URL ← "https://api.openweathermap.org/data/2.5/onecall"
9.      Params ← {
10.         lat: Lat,
11.         lon: Lon,
12.         exclude: "current,minutely,hourly,alerts",
13.         appid: APIKey,
14.         units: "metric"
15.     }
16.     Response ← HTTP.Get(URL, Params)
17.     Data ← Response.JSON()
18.     
19.     ForecastList ← []
20.     Today ← CurrentDate()
21.     for i = 0 to min(D, Data.Daily.Length) - 1 do
22.         DayData ← Data.Daily[i]
23.         ForecastDate ← TimestampToDate(DayData.dt)
24.         ForecastList.Append({
25.             Date: ForecastDate,
26.             TempMin: DayData.Temp.Min,
27.             TempMax: DayData.Temp.Max,
28.             Humidity: DayData.Humidity,
29.             Precipitation: DayData.Rain + DayData.Snow,
30.             WindSpeed: DayData.WindSpeed,
31.             Description: DayData.Weather[0].Description,
32.             Main: DayData.Weather[0].Main,
33.             Icon: DayData.Weather[0].Icon
34.         })
35.     end for
36.     
37.     return {Location: {Lat, Lon}, Forecast: ForecastList}
38. catch
39.     // Fallback to 5-day/3-hour forecast
40.     URL ← "https://api.openweathermap.org/data/2.5/forecast"
41.     Response ← HTTP.Get(URL, {lat: Lat, lon: Lon, appid: APIKey, units: "metric"})
42.     Data ← Response.JSON()
43.     
44.     DailyForecasts ← {}
45.     Today ← CurrentDate()
46.     for each Item in Data.List do
47.         ItemDate ← TimestampToDate(Item.dt)
48.         DaysDiff ← (ItemDate - Today).Days
49.         if (DaysDiff < 0 OR DaysDiff ≥ D) then
50.             continue
51.         end if
52.         
53.         DateStr ← ItemDate.ToString()
54.         if (DateStr not in DailyForecasts) then
55.             DailyForecasts[DateStr] ← {
56.                 Date: DateStr,
57.                 TempMin: Item.Main.TempMin,
58.                 TempMax: Item.Main.TempMax,
59.                 Humidity: Item.Main.Humidity,
60.                 Precipitation: Item.Rain.3h + Item.Snow.3h,
61.                 WindSpeed: Item.Wind.Speed,
62.                 Description: Item.Weather[0].Description,
63.                 Main: Item.Weather[0].Main
64.             }
65.         else
66.             DailyForecasts[DateStr].TempMin ← Min(
67.                 DailyForecasts[DateStr].TempMin,
68.                 Item.Main.TempMin
69.             )
70.             DailyForecasts[DateStr].TempMax ← Max(
71.                 DailyForecasts[DateStr].TempMax,
72.                 Item.Main.TempMax
73.             )
74.             DailyForecasts[DateStr].Precipitation += (Item.Rain.3h + Item.Snow.3h)
75.         end if
76.     end for
77.     
78.     // Ensure exactly D days
79.     ForecastList ← []
80.     for i = 0 to D - 1 do
81.         TargetDate ← (Today + i days).ToString()
82.         if (TargetDate in DailyForecasts) then
83.             ForecastList.Append(DailyForecasts[TargetDate])
84.         else
85.             // Use last available day's data
86.             if (ForecastList.Length > 0) then
87.                 LastDay ← ForecastList[ForecastList.Length - 1].Copy()
88.                 LastDay.Date ← TargetDate
89.                 ForecastList.Append(LastDay)
90.             end if
91.         end if
92.     end for
93.     
94.     return {Location: {Lat, Lon}, Forecast: ForecastList}
95. end try
96. 
97. // Generate recommendations from forecast
98. Recommendations ← []
99. for each Day in ForecastList do
100.     TempAvg ← (Day.TempMin + Day.TempMax) / 2
101.     Precip ← Day.Precipitation
102.     Wind ← Day.WindSpeed
103.     MainWeather ← Day.Main
104.     
105.     DayRecs ← []
106.     
107.     // Temperature-based rules
108.     if (TempAvg < 10) then
109.         DayRecs.Append("Low temperature: Protect crops from frost")
110.     else if (TempAvg > 35) then
111.         DayRecs.Append("High temperature: Increase irrigation frequency")
112.     end if
113.     
114.     // Precipitation-based rules
115.     if (Precip > 5) then
116.         DayRecs.Append("Heavy rain: Avoid irrigation, ensure drainage")
117.     else if (Precip > 0) then
118.         DayRecs.Append("Light rain: Reduce irrigation")
119.     else if (Precip = 0 AND TempAvg > 25) then
120.         DayRecs.Append("Dry conditions: Increase irrigation")
121.     end if
122.     
123.     // Wind-based rules
124.     if (Wind > 15) then
125.         DayRecs.Append("Strong winds: Secure plants, avoid spraying")
126.     end if
127.     
128.     // Weather type rules
128.     if (MainWeather = "Rain") then
129.         DayRecs.Append("Rainy day: Postpone field work")
130.     else if (MainWeather = "Clear") then
131.         DayRecs.Append("Clear day: Good for field work")
132.     end if
133.     
134.     if (DayRecs.Length > 0) then
135.         Recommendations.Append({Date: Day.Date, Recommendations: DayRecs})
136.     end if
137. end for
138. 
139. return Recommendations
```

**Key Components:**
- **API Fallback Strategy:** Uses One Call API 2.5, falls back to 5-day/3-hour forecast (line 7-95)
- **Daily Aggregation:** Converts 3-hour intervals to daily summaries (line 44-76)
- **Rule-Based Recommendations:** Temperature, precipitation, wind, and weather type rules (line 107-132)
- **Data Completeness:** Ensures exactly 7 days of forecast (line 79-92)

---

## Algorithm 5: Disease Heatmap Aggregation and Visualization

**Purpose:** Aggregate disease detection data by geographic location to generate regional heatmaps showing disease spread patterns.

**Input:**
- Detection records (DR) with latitude, longitude, disease, severity
- Crop filter (CF) ∈ {all, wheat, rice, cotton}
- Region boundaries (RB)

**Output:**
- Disease hotspots (DH) with location, severity, case count
- Regional statistics (RS)

**Pseudocode:**

```
Algorithm 5: Disease Heatmap Aggregation and Visualization

1.  DB ← OpenDatabaseConnection()
2.  
3.  // Step 1: Query detections with geotagging
4.  if (CF = "all") then
5.      Detections ← DB.Query(
6.          SELECT detection_id, latitude, longitude, 
7.                 disease_id, confidence_score, crop_type
8.          FROM Detections
9.          WHERE latitude IS NOT NULL 
10.         AND longitude IS NOT NULL
11.         AND confidence_score > 50
12.     )
13. else
14.     Detections ← DB.Query(
15.         SELECT detection_id, latitude, longitude,
16.                disease_id, confidence_score, crop_type
17.         FROM Detections
18.         WHERE crop_type = CF
19.         AND latitude IS NOT NULL
20.         AND longitude IS NOT NULL
21.         AND confidence_score > 50
22.     )
23. end if
24. 
25. // Step 2: Spatial clustering/aggregation
26. Hotspots ← {}
27. for each Detection in Detections do
28.     // Group by region (simplified: can use grid-based or distance-based clustering)
29.     RegionKey ← GetRegionKey(Detection.Latitude, Detection.Longitude, RB)
30.     
31.     if (RegionKey not in Hotspots) then
32.         Hotspots[RegionKey] ← {
33.             Region: RegionKey,
34.             Latitude: Detection.Latitude,
35.             Longitude: Detection.Longitude,
36.             Diseases: {},
37.             TotalCases: 0,
38.             MaxSeverity: "low"
39.         }
40.     end if
41.     
42.     DiseaseName ← GetDiseaseName(Detection.DiseaseID)
43.     if (DiseaseName not in Hotspots[RegionKey].Diseases) then
44.         Hotspots[RegionKey].Diseases[DiseaseName] ← 0
45.     end if
46.     Hotspots[RegionKey].Diseases[DiseaseName] += 1
47.     Hotspots[RegionKey].TotalCases += 1
48.     
49.     // Update severity
50.     Severity ← "high" if (Detection.Confidence > 80) 
51.                 else ("medium" if Detection.Confidence > 60 else "low")
52.     if (SeverityRank(Hotspots[RegionKey].MaxSeverity) < SeverityRank(Severity)) then
53.         Hotspots[RegionKey].MaxSeverity ← Severity
54.     end if
55. end for
56. 
57. // Step 3: Generate hotspot list
58. HotspotList ← []
59. for each RegionKey in Hotspots do
60.     Hotspot ← Hotspots[RegionKey]
61.     PrimaryDisease ← GetMaxDisease(Hotspot.Diseases)
62.     HotspotList.Append({
63.         ID: GenerateID(),
64.         Name: PrimaryDisease,
65.         Location: Hotspot.Region,
66.         Severity: Hotspot.MaxSeverity,
67.         Cases: Hotspot.TotalCases,
68.         Latitude: Hotspot.Latitude,
69.         Longitude: Hotspot.Longitude
70.     })
71. end for
72. 
73. // Step 4: Calculate regional statistics
74. TotalCases ← Sum(HotspotList.Cases)
75. AffectedRegions ← HotspotList.Length
76. WeeklyIncrease ← CalculateWeeklyIncrease(DB, CF)
77. AffectedAcres ← EstimateAcres(HotspotList)
78. 
79. RegionalStats ← {
80.     TotalCases: TotalCases,
81.     AffectedRegions: AffectedRegions,
82.     WeeklyIncrease: WeeklyIncrease,
83.     AffectedAcres: AffectedAcres
84. }
85. 
86. DB.Close()
87. return {Hotspots: HotspotList, Statistics: RegionalStats}
```

**Key Components:**
- **Spatial Aggregation:** Groups detections by geographic region (line 29)
- **Severity Calculation:** Determines maximum severity per region (line 50-54)
- **Disease Counting:** Tracks case counts per disease per region (line 42-46)
- **Statistical Analysis:** Computes regional metrics (line 74-84)

**Note:** Current implementation uses mock data for visualization. Full implementation requires:
- Geotagging in detection records (latitude/longitude storage)
- Spatial clustering algorithm (grid-based or distance-based)
- Region boundary mapping (Pakistan provinces/districts)

---

## Algorithm 6: Crop Health Statistics Calculation

**Purpose:** Calculate crop health metrics for farmer dashboard based on detection history.

**Input:**
- Farmer ID (FID)

**Output:**
- Health percentages (Healthy, AtRisk, Diseased)
- Total scan count

**Pseudocode:**

```
Algorithm 6: Crop Health Statistics Calculation

1.  DB ← OpenDatabaseConnection()
2.  Detections ← DB.Query(
3.      SELECT confidence_score FROM Detections
4.      WHERE farmer_id = FID
5.  )
6.  
7.  Total ← Detections.Length
8.  if (Total = 0) then
9.      return {Healthy: 100, AtRisk: 0, Diseased: 0, TotalScans: 0}
10. end if
11. 
12. Healthy ← 0
13. AtRisk ← 0
14. Diseased ← 0
15. 
16. for each Detection in Detections do
17.     Confidence ← Detection.ConfidenceScore OR 0
18.     if (Confidence = 0 OR Confidence < 50) then
19.         Healthy += 1
20.     else if (Confidence < 80) then
21.         AtRisk += 1
22.     else
23.         Diseased += 1
24.     end if
25. end for
26. 
27. return {
28.     Healthy: Round((Healthy / Total) * 100, 1),
29.     AtRisk: Round((AtRisk / Total) * 100, 1),
30.     Diseased: Round((Diseased / Total) * 100, 1),
31.     TotalScans: Total
32. }
```

**Key Components:**
- **Confidence Thresholding:** Uses 50% and 80% thresholds for categorization (line 18-24)
- **Percentage Calculation:** Normalizes counts to percentages (line 28-30)

---

## Summary of Algorithms

| Algorithm | Type | Complexity | Key Technique |
|-----------|------|------------|---------------|
| Disease Detection | Deep Learning | O(n) | YOLO object detection |
| Guidance Matching | Database Query | O(1) | Normalized string matching |
| Schedule Generation | Multi-Factor Decision | O(n*m) | Rule-based aggregation |
| Weather Recommendations | API Integration | O(d) | Rule-based inference |
| Heatmap Aggregation | Spatial Clustering | O(n²) | Geographic grouping |
| Health Statistics | Statistical Analysis | O(n) | Threshold-based counting |

**Legend:**
- n = number of detections/tasks
- m = number of factors (disease, weather, location, maintenance)
- d = number of days in forecast

---

## Future Enhancements

1. **Time-Lapse Production Tracking:** Time-series aggregation algorithm for crop growth tracking
2. **Advanced Clustering:** K-means or DBSCAN for disease hotspot detection
3. **Machine Learning:** Gradient Boosting for yield prediction (mentioned in modules)
4. **Pest Prediction:** Random Forest models for pest outbreak forecasting (mentioned in modules)
