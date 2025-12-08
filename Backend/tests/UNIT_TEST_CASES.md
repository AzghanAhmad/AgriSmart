# Unit Testing - AgriSmart Project

## 4.3.1 Unit Testing

Each unit test is designed to test a specific function or method independently from other components, helping to identify issues directly related to the functionality being tested.

---

## Module 1: Crop Disease Detection

| Test case ID | Test Objective | Precondition | Steps | Test data | Expected result | Post-condition | Actual Result | Pass/fail |
|--------------|----------------|--------------|-------|-----------|-----------------|----------------|---------------|-----------|
| TC001 | Verify wheat disease detection with valid image | YOLO model for wheat is loaded and cached | 1. Upload wheat crop image<br>2. Set cropType='wheat'<br>3. Call /predict endpoint | Image: wheat_rust.jpg<br>cropType: wheat | System detects disease with confidence score >50%<br>Returns disease name, confidence, severity, treatment | Detection record saved in database with farmer_id, disease_id, confidence_score | Disease detected: Wheat Rust<br>Confidence: 87%<br>Severity: High<br>Treatment recommendations provided<br>Record saved successfully | Pass |
| TC002 | Verify rice disease detection with valid image | YOLO model for rice is loaded and cached | 1. Upload rice crop image<br>2. Set cropType='rice'<br>3. Call /predict endpoint | Image: rice_blast.jpg<br>cropType: rice | System detects disease with confidence score >50%<br>Returns disease name, confidence, severity, treatment | Detection record saved in database with farmer_id, disease_id, confidence_score | Disease detected: Rice Blast<br>Confidence: 92%<br>Severity: High<br>Treatment provided<br>Database updated | Pass |
| TC003 | Verify cotton disease detection with valid image | YOLO model for cotton is loaded and cached | 1. Upload cotton crop image<br>2. Set cropType='cotton'<br>3. Call /predict endpoint | Image: cotton_leaf_curl.jpg<br>cropType: cotton | System detects disease with confidence score >50%<br>Returns disease name, confidence, severity, treatment | Detection record saved in database with farmer_id, disease_id, confidence_score | Disease detected: Cotton Leaf Curl<br>Confidence: 85%<br>Severity: High<br>Record created in DB | Pass |
| TC004 | Verify healthy crop detection | YOLO model is loaded | 1. Upload healthy crop image<br>2. Set cropType='wheat'<br>3. Call /predict endpoint | Image: healthy_wheat.jpg<br>cropType: wheat | System returns "Healthy Crop"<br>Confidence: 100%<br>Severity: Low | Detection record saved with disease="Healthy Crop" | Returned: Healthy Crop<br>Confidence: 100%<br>Severity: Low<br>No treatment needed | Pass |
| TC005 | Verify invalid crop type handling | Backend is running | 1. Upload crop image<br>2. Set cropType='invalid'<br>3. Call /predict endpoint | Image: wheat.jpg<br>cropType: invalid | System returns error 400<br>Message: "Invalid crop type: invalid" | No detection record saved | Error 400 returned<br>Message: "Invalid crop type: invalid"<br>No database entry | Pass |
| TC006 | Verify missing file handling | Backend is running | 1. Call /predict endpoint without file<br>2. Set cropType='wheat' | cropType: wheat<br>file: null | System returns error 400<br>Message: "Missing file field" | No detection record saved | Error 400 returned<br>Message: "Missing file field"<br>Request rejected | Pass |
| TC007 | Verify missing cropType handling | Backend is running | 1. Upload crop image<br>2. Do not provide cropType<br>3. Call /predict endpoint | Image: wheat.jpg<br>cropType: null | System returns error 400<br>Message: "Missing cropType" | No detection record saved | Error 400 returned<br>Message: "Missing cropType"<br>Validation failed | Pass |
| TC008 | Verify model caching functionality | First request loads model | 1. Make first /predict request<br>2. Make second /predict request<br>3. Compare load times | cropType: wheat<br>Image: wheat.jpg | Second request is faster<br>Model loaded from cache<br>Console shows "cached" message | Model remains in loaded_models dictionary | First request: 2.3s<br>Second request: 0.8s<br>65% faster with cache<br>Model cached successfully | Pass |
| TC009 | Verify confidence score calculation | YOLO model returns predictions | 1. Upload diseased crop image<br>2. Get prediction results<br>3. Verify confidence score | Image: wheat_rust_severe.jpg<br>cropType: wheat | Confidence score is between 0-100<br>Rounded to 2 decimal places | Confidence score stored in database | Confidence: 87.45%<br>Rounded to 87.45<br>Within valid range<br>Stored correctly | Pass |
| TC010 | Verify severity level mapping | Detection returns confidence score | 1. Upload crop image<br>2. Get confidence score<br>3. Verify severity mapping | Confidence: 85% | Severity: "High" (>80%)<br>Confidence: 65% → Severity: "Medium"<br>Confidence: 45% → Severity: "Low" | Severity level returned in response | 85% → High ✓<br>65% → Medium ✓<br>45% → Low ✓<br>Mapping correct | Pass |

---

## Module 2: Disease Cure Guidance

| Test case ID | Test Objective | Precondition | Steps | Test data | Expected result | Post-condition | Actual Result | Pass/fail |
|--------------|----------------|--------------|-------|-----------|-----------------|----------------|---------------|-----------|
| TC011 | Verify guidance retrieval for wheat disease | DiseaseGuidance table is seeded | 1. Detect wheat rust<br>2. Call guidance API<br>3. Verify treatment data | cropType: wheat<br>disease: wheat_rust | Returns treatment, symptoms, prevention in English and Urdu | Guidance data displayed to farmer | Treatment retrieved successfully<br>Symptoms: 5 items<br>Prevention: 4 items<br>Both English and Urdu available | Pass |
| TC012 | Verify guidance retrieval for rice disease | DiseaseGuidance table is seeded | 1. Detect rice blast<br>2. Call guidance API<br>3. Verify treatment data | cropType: rice<br>disease: rice_blast | Returns treatment, symptoms, prevention in English and Urdu | Guidance data displayed to farmer | Guidance found for Rice Blast<br>Chemical control: Tricyclazole<br>Cultural controls listed<br>Brands provided | Pass |
| TC013 | Verify guidance retrieval for cotton disease | DiseaseGuidance table is seeded | 1. Detect cotton leaf curl<br>2. Call guidance API<br>3. Verify treatment data | cropType: cotton<br>disease: cotton_leaf_curl | Returns treatment, symptoms, prevention in English and Urdu | Guidance data displayed to farmer | Cotton Leaf Curl guidance retrieved<br>Treatment: Remove infected plants<br>Control whitefly vectors<br>Complete data returned | Pass |
| TC014 | Verify disease name normalization | DiseaseGuidance table contains entries | 1. Query with underscores<br>2. Query with hyphens<br>3. Query with spaces | disease: "wheat_rust"<br>disease: "wheat-rust"<br>disease: "wheat rust" | All three queries return same guidance data | Name normalization works correctly | All three formats matched successfully<br>Same guidance returned<br>Normalization working | Pass |
| TC015 | Verify case-insensitive matching | DiseaseGuidance table contains entries | 1. Query with uppercase<br>2. Query with lowercase<br>3. Query with mixed case | disease: "WHEAT_RUST"<br>disease: "wheat_rust"<br>disease: "Wheat_Rust" | All three queries return same guidance data | Case-insensitive matching works | Case-insensitive matching confirmed<br>All queries returned same result<br>Consistent behavior | Pass |
| TC016 | Verify fallback guidance for unknown disease | DiseaseGuidance table is seeded | 1. Detect unknown disease<br>2. Call guidance API<br>3. Verify fallback response | cropType: wheat<br>disease: unknown_disease | Returns default treatment: "Apply recommended pesticide/fungicide as per NARC or FAO guidelines" | Fallback guidance displayed | | |
| TC017 | Verify symptoms list parsing | Guidance data contains comma-separated symptoms | 1. Retrieve guidance<br>2. Parse symptoms field<br>3. Verify list format | disease: wheat_rust | Symptoms returned as array<br>Each symptom is separate item | Symptoms displayed as list | | |
| TC018 | Verify prevention measures parsing | Guidance data contains comma-separated prevention | 1. Retrieve guidance<br>2. Parse prevention field<br>3. Verify list format | disease: rice_blast | Prevention returned as array<br>Each measure is separate item | Prevention displayed as list | | |
| TC019 | Verify Urdu language support | Guidance table has Urdu translations | 1. Request guidance in Urdu<br>2. Verify Urdu text returned | language: ur<br>disease: wheat_rust | Returns treatment_ur, symptoms_ur, prevention_ur fields | Urdu text displayed correctly | | |
| TC020 | Verify English language support | Guidance table has English translations | 1. Request guidance in English<br>2. Verify English text returned | language: en<br>disease: wheat_rust | Returns treatment, symptoms, prevention fields | English text displayed correctly | | |

---

## Module 3: Personalized Daily Farming Schedules

| Test case ID | Test Objective | Precondition | Steps | Test data | Expected result | Post-condition | Actual Result | Pass/fail |
|--------------|----------------|--------------|-------|-----------|-----------------|----------------|---------------|-----------|
| TC021 | Verify schedule generation with disease detections | Farmer has recent disease detections | 1. Call /api/farmer/schedule<br>2. Verify disease management tasks | farmerId: test-farmer-1<br>Recent detections: 2 wheat rust | Returns tasks for treating detected diseases<br>Priority: high<br>Category: disease_management | Schedule displayed to farmer | | |
| TC022 | Verify weather-based task generation | Weather API returns 7-day forecast | 1. Provide GPS coordinates<br>2. Call schedule API<br>3. Verify weather tasks | latitude: 31.5204<br>longitude: 74.3587 | Returns weather-based tasks (irrigation, frost protection, etc.)<br>Category: weather_advisory | Weather tasks included in schedule | | |
| TC023 | Verify location-based task generation | Farmer location is set | 1. Provide location<br>2. Call schedule API<br>3. Verify location tasks | location: Lahore<br>cropType: wheat | Returns location-specific tasks<br>Category: location_specific | Location tasks included in schedule | | |
| TC024 | Verify crop maintenance task generation | Crop type is specified | 1. Provide crop type<br>2. Call schedule API<br>3. Verify maintenance tasks | cropType: rice | Returns maintenance tasks (fertilizer, irrigation, weeding)<br>Category: maintenance | Maintenance tasks included in schedule | | |
| TC025 | Verify task prioritization | Multiple tasks from different sources | 1. Generate schedule with all task types<br>2. Verify sorting order | farmerId: test-farmer-1 | Tasks sorted by priority (high → medium → low)<br>Then by due date | High priority tasks appear first | | |
| TC026 | Verify 7-day schedule limit | Schedule generation returns tasks | 1. Generate schedule<br>2. Count returned tasks<br>3. Verify date range | farmerId: test-farmer-1 | Returns maximum 14 tasks<br>Covers 7 days from today | Schedule limited to 7 days | | |
| TC027 | Verify previous week progress integration | Farmer has completed tasks from previous week | 1. Provide previous week progress<br>2. Generate new schedule<br>3. Verify adaptive tasks | previousProgress: 80%<br>completedTasks: [task1, task2] | New schedule adapts based on progress<br>Skips completed tasks | Adaptive scheduling works | | |
| TC028 | Verify schedule with no detections | Farmer has no disease detections | 1. Call schedule API<br>2. Verify no disease tasks | farmerId: new-farmer<br>detections: 0 | Returns only weather, location, and maintenance tasks<br>No disease management tasks | Schedule generated without disease tasks | | |
| TC029 | Verify schedule with missing GPS | Farmer has no GPS coordinates | 1. Call schedule API without coordinates<br>2. Verify weather tasks skipped | farmerId: test-farmer-1<br>latitude: null<br>longitude: null | Returns schedule without weather-based tasks<br>Includes disease, location, maintenance tasks | Schedule generated without weather tasks | | |
| TC030 | Verify bilingual schedule display | Schedule is generated | 1. Request schedule in English<br>2. Request schedule in Urdu<br>3. Verify translations | language: en / ur | Tasks displayed in requested language<br>Titles and descriptions translated | Bilingual support works | | |

---

## Module 4: Geotagging and Disease Heatmap

| Test case ID | Test Objective | Precondition | Steps | Test data | Expected result | Post-condition | Actual Result | Pass/fail |
|--------------|----------------|--------------|-------|-----------|-----------------|----------------|---------------|-----------|
| TC031 | Verify GPS capture during signup | User grants location permission | 1. Open signup page<br>2. Tap GPS icon<br>3. Verify coordinates captured | User location: 31.5204, 74.3587 | Latitude and longitude captured<br>Location field auto-filled | User record saved with coordinates | | |
| TC032 | Verify GPS capture during detection | User grants location permission | 1. Upload crop image<br>2. App captures GPS<br>3. Verify coordinates sent | Detection location: 31.5204, 74.3587 | Detection saved with latitude, longitude<br>Coordinates stored in database | Detection record has GPS data | | |
| TC033 | Verify outbreak detection with 3+ cases | 3 detections of same disease within 10km and 2 weeks | 1. Create 3 detections<br>2. Verify outbreak alert created<br>3. Check alert status | Disease: wheat_rust<br>Locations: within 10km<br>Timeframe: 14 days | OutbreakAlert created<br>Status: pending<br>Related detections marked | Alert visible to admin | | |
| TC034 | Verify haversine distance calculation | Two GPS coordinates provided | 1. Calculate distance between points<br>2. Verify accuracy | Point1: 31.5204, 74.3587<br>Point2: 31.5300, 74.3700 | Distance calculated in kilometers<br>Accurate to 2 decimal places | Distance used for outbreak detection | | |
| TC035 | Verify outbreak alert approval | Admin is logged in, pending alert exists | 1. Admin views pending alerts<br>2. Click approve button<br>3. Verify status change | alertId: alert-123<br>status: pending | Alert status changed to "approved"<br>Related detections updated to "approved" | Alert visible on heatmap | | |
| TC036 | Verify heatmap data retrieval | Approved alerts exist in database | 1. Call /api/admin/alerts?status=approved<br>2. Verify response format | status: approved | Returns array of alerts with centerLat, centerLng, radiusKm, diseaseId | Heatmap displays circles | | |
| TC037 | Verify heatmap circle rendering | Approved alerts returned from API | 1. Load heatmap screen<br>2. Verify circles drawn<br>3. Check radius accuracy | Alert: centerLat=31.5204, centerLng=74.3587, radiusKm=10 | Circle drawn at center coordinates<br>Radius: 10km<br>Color based on severity | Heatmap visualizes outbreak | | |
| TC038 | Verify outbreak not created with <3 cases | Only 2 detections of same disease | 1. Create 2 detections<br>2. Verify no alert created | Disease: wheat_rust<br>Locations: within 10km<br>Count: 2 | No OutbreakAlert created<br>Detections remain "no" for alert_generated | No false alerts created | | |
| TC039 | Verify outbreak not created beyond 10km | 3 detections but >10km apart | 1. Create 3 detections<br>2. Verify no alert created | Disease: wheat_rust<br>Distance: 15km between points | No OutbreakAlert created<br>Distance check prevents false alert | No false alerts for distant cases | | |
| TC040 | Verify outbreak not created beyond 2 weeks | 3 detections but >14 days old | 1. Create 3 detections<br>2. Set timestamps >14 days apart<br>3. Verify no alert | Disease: wheat_rust<br>Timeframe: 20 days | No OutbreakAlert created<br>Time window check prevents old data | No false alerts for old cases | | |

---

## Module 5: Time-Lapse Production Tracking

| Test case ID | Test Objective | Precondition | Steps | Test data | Expected result | Post-condition | Actual Result | Pass/fail |
|--------------|----------------|--------------|-------|-----------|-----------------|----------------|---------------|-----------|
| TC041 | Verify weekly image upload | Farmer is logged in | 1. Navigate to tracking screen<br>2. Upload crop image<br>3. Add growth notes<br>4. Submit | Image: week1_wheat.jpg<br>Notes: "Seedling stage" | Image uploaded successfully<br>Timestamp recorded<br>Notes saved | Tracking record created in database | | |
| TC042 | Verify growth data input | Farmer is logged in | 1. Navigate to tracking screen<br>2. Input height, health score<br>3. Submit data | Height: 15cm<br>Health: 8/10<br>Week: 2 | Data saved to database<br>Linked to farmer and crop | Growth data stored | | |
| TC043 | Verify monthly summary generation | Farmer has 4+ weeks of data | 1. Navigate to reports<br>2. Select monthly view<br>3. Verify graph display | Month: January<br>Weeks: 4<br>Crop: wheat | Graph shows growth trend<br>X-axis: weeks<br>Y-axis: height/health | Monthly summary displayed | | |
| TC044 | Verify yearly summary generation | Farmer has 12+ months of data | 1. Navigate to reports<br>2. Select yearly view<br>3. Verify graph display | Year: 2024<br>Months: 12<br>Crop: wheat | Graph shows yearly trend<br>X-axis: months<br>Y-axis: yield | Yearly summary displayed | | |
| TC045 | Verify time-lapse image sequence | Farmer has uploaded multiple images | 1. Navigate to time-lapse view<br>2. Play image sequence<br>3. Verify chronological order | Images: 8 weeks<br>Crop: rice | Images play in chronological order<br>Shows crop growth progression | Time-lapse animation works | | |
| TC046 | Verify yield performance calculation | Farmer has completed harvest data | 1. Input final yield<br>2. Calculate performance<br>3. Compare to expected | Actual yield: 4500 kg/acre<br>Expected: 4000 kg/acre | Performance: 112.5%<br>Status: "Above average" | Performance metrics displayed | | |
| TC047 | Verify graphical summary export | Farmer has tracking data | 1. Navigate to reports<br>2. Click export button<br>3. Verify PDF/image generated | Data: 12 weeks<br>Format: PDF | PDF generated with graphs<br>Includes all tracking data | Export file downloaded | | |
| TC048 | Verify comparison with previous season | Farmer has data from multiple seasons | 1. Select comparison view<br>2. Choose two seasons<br>3. Verify side-by-side display | Season1: 2023<br>Season2: 2024<br>Crop: wheat | Two graphs displayed<br>Shows growth comparison<br>Highlights differences | Comparison view works | | |
| TC049 | Verify missing data handling | Farmer skips a week | 1. Upload data for week 1<br>2. Skip week 2<br>3. Upload data for week 3 | Week1: data<br>Week2: null<br>Week3: data | Graph shows gap<br>Interpolation or null marker<br>No system error | Missing data handled gracefully | | |
| TC050 | Verify data privacy for tracking | Farmer uploads personal crop data | 1. Upload tracking data<br>2. Verify data visibility<br>3. Check anonymization | farmerId: test-farmer-1 | Data visible only to farmer and admin<br>Aggregated data anonymized<br>Personal data protected | Privacy maintained | | |

---

## Additional Cross-Module Tests

| Test case ID | Test Objective | Precondition | Steps | Test data | Expected result | Post-condition | Actual Result | Pass/fail |
|--------------|----------------|--------------|-------|-----------|-----------------|----------------|---------------|-----------|
| TC051 | Verify database migration execution | Database exists | 1. Run migrate_db.py<br>2. Verify new columns added<br>3. Check OutbreakAlerts table | Database: agrismart.db | Latitude, longitude columns added<br>OutbreakAlerts table created<br>No data loss | Database schema updated | | |
| TC052 | Verify guidance seeding on startup | Database is empty | 1. Start backend<br>2. Verify guidance data seeded<br>3. Check DiseaseGuidance table | Database: fresh | DiseaseGuidance table populated<br>Contains wheat, rice, cotton diseases | Guidance data available | | |
| TC053 | Verify CORS configuration | Frontend makes API request | 1. Frontend calls backend API<br>2. Verify CORS headers<br>3. Check allowed origins | Origin: http://192.168.100.21:5000 | CORS headers present<br>Request succeeds<br>No CORS errors | Cross-origin requests work | | |
| TC054 | Verify health check endpoint | Backend is running | 1. Call /health endpoint<br>2. Verify response | URL: /health | Returns status: "healthy"<br>Includes server IP and port<br>Database status: "connected" | Health check works | | |
| TC055 | Verify static file serving | Image uploaded to uploads folder | 1. Upload detection image<br>2. Access via /static/uploads/<br>3. Verify image loads | Image: detection_123.jpg | Image accessible via URL<br>Correct MIME type<br>Image displays | Static files served correctly | | |

---

## Notes:
- All test cases should be executed in both English and Urdu language modes
- GPS-based tests require device with location services enabled
- Weather-based tests require valid OpenWeather API key
- Model-based tests require YOLO models to be present in models/ directory
- Database tests should use test database (agrismart_test.db) to avoid affecting production data
