# Extended Unit Testing - AgriSmart Project (Part 3)

## Additional Test Cases - Frontend, Database, and Integration

---

## Module 10: Frontend Integration & UI Components (Continued)

| Test case ID | Test Objective | Precondition | Steps | Test data | Expected result | Post-condition | Actual Result | Pass/fail |
|--------------|----------------|--------------|-------|-----------|-----------------|----------------|---------------|-----------|
| TC111 | Verify disease detection camera capture | Crop selected, camera permission granted | 1. Tap "Scan with Camera"<br>2. Take photo<br>3. Verify image uploaded | crop: wheat | Camera opens<br>Photo captured<br>Image sent to backend for analysis | Detection initiated | | |
| TC112 | Verify disease detection gallery upload | Crop selected, gallery permission granted | 1. Tap "Upload Image"<br>2. Select image from gallery<br>3. Verify upload | crop: rice | Gallery opens<br>Image selected<br>Image sent to backend | Detection initiated | | |
| TC113 | Verify disease detection analyzing overlay | Image uploaded | 1. Upload image<br>2. Verify analyzing state<br>3. Check UI feedback | image: crop.jpg | Analyzing overlay shown<br>Scan icon animated<br>Text: "Analyzing crop..." | User sees progress | | |
| TC114 | Verify disease detection result display | Analysis complete | 1. Receive detection result<br>2. Verify result card shown<br>3. Check all fields | disease: Wheat Rust<br>confidence: 87% | Disease name displayed<br>Confidence shown<br>Severity badge colored<br>Treatment, symptoms, prevention listed | Result displayed | | |
| TC115 | Verify disease detection severity badge color | Result received | 1. Check severity<br>2. Verify badge color<br>3. Test all severity levels | severity: High/Medium/Low | High: Red (#EF4444)<br>Medium: Orange (#F59E0B)<br>Low: Green (#22C55E) | Color coding correct | | |
| TC116 | Verify disease detection recent detections list | User has detection history | 1. View recent detections<br>2. Verify list populated<br>3. Check data | detections: 3 | Shows last 3 detections<br>Includes image, name, date<br>Severity indicator shown | History displayed | | |
| TC117 | Verify disease detection reset functionality | Result displayed | 1. Tap "Analyze New Image"<br>2. Verify state reset<br>3. Check upload options shown | N/A | Selected image cleared<br>Result cleared<br>Upload options shown again | Ready for new detection | | |
| TC118 | Verify disease detection back to crop selection | Crop selected | 1. Tap back button<br>2. Verify crop deselected<br>3. Check crop grid shown | N/A | Crop selection cleared<br>Crop grid displayed<br>All state reset | Back navigation works | | |
| TC119 | Verify heatmap filter controls | User on heatmap screen | 1. Tap crop filter<br>2. Select wheat<br>3. Verify filter applied | filter: wheat | Filter button highlighted<br>Map updates<br>Only wheat diseases shown | Filter works | | |
| TC120 | Verify heatmap layer selection | User on heatmap screen | 1. Tap layer button<br>2. Select weather layer<br>3. Verify layer changed | layer: weather | Layer button highlighted<br>Map overlay changes<br>Weather data shown | Layer switching works | | |
| TC121 | Verify heatmap on native platform | App running on Android/iOS | 1. Open heatmap<br>2. Verify MapView rendered<br>3. Check circles and markers | Platform: native | Real map displayed<br>Pakistan region shown<br>Outbreak circles drawn<br>Markers placed | Native map works | | |
| TC122 | Verify heatmap on web platform | App running in browser | 1. Open heatmap<br>2. Verify placeholder shown<br>3. Check message | Platform: web | Placeholder displayed<br>Message: "Pakistan Disease Monitoring"<br>No map error | Web fallback works | | |
| TC123 | Verify heatmap outbreak circle rendering | Approved alerts exist | 1. Load heatmap<br>2. Verify circles drawn<br>3. Check radius accuracy | alert: centerLat=31.5204, centerLng=74.3587, radiusKm=10 | Circle drawn at coordinates<br>Radius: 10km<br>Color: red with transparency | Circles rendered correctly | | |
| TC124 | Verify heatmap marker tooltips | User taps marker | 1. Tap outbreak marker<br>2. Verify tooltip shown<br>3. Check data | marker: disease outbreak | Tooltip displays disease name<br>Shows location<br>Shows case count | Tooltip works | | |
| TC125 | Verify heatmap legend display | Heatmap loaded | 1. View legend<br>2. Verify severity levels<br>3. Check colors | N/A | Legend shows: High Risk (red), Medium Risk (orange), Low Risk (green) | Legend displayed | | |

---

## Module 11: Database Operations & Migrations

| Test case ID | Test Objective | Precondition | Steps | Test data | Expected result | Post-condition | Actual Result | Pass/fail |
|--------------|----------------|--------------|-------|-----------|-----------------|----------------|---------------|-----------|
| TC126 | Verify database migration adds latitude to Detections | Database exists without latitude column | 1. Run migrate_db.py<br>2. Check Detections table<br>3. Verify column added | Table: Detections | Latitude column added<br>Type: REAL<br>Nullable: True | Column exists | | |
| TC127 | Verify database migration adds longitude to Detections | Database exists without longitude column | 1. Run migrate_db.py<br>2. Check Detections table<br>3. Verify column added | Table: Detections | Longitude column added<br>Type: REAL<br>Nullable: True | Column exists | | |
| TC128 | Verify database migration adds alert_generated to Detections | Database exists without alert_generated column | 1. Run migrate_db.py<br>2. Check Detections table<br>3. Verify column added | Table: Detections | alert_generated column added<br>Type: VARCHAR(10)<br>Default: 'no' | Column exists | | |
| TC129 | Verify database migration adds latitude to Users | Database exists without latitude column | 1. Run migrate_db.py<br>2. Check Users table<br>3. Verify column added | Table: Users | Latitude column added<br>Type: REAL<br>Nullable: True | Column exists | | |
| TC130 | Verify database migration adds longitude to Users | Database exists without longitude column | 1. Run migrate_db.py<br>2. Check Users table<br>3. Verify column added | Table: Users | Longitude column added<br>Type: REAL<br>Nullable: True | Column exists | | |
| TC131 | Verify database migration creates OutbreakAlerts table | Database exists without OutbreakAlerts table | 1. Run migrate_db.py<br>2. Check for OutbreakAlerts table<br>3. Verify schema | Table: OutbreakAlerts | Table created with columns: alert_id, disease_id, created_at, status, center_lat, center_lng, radius_km | Table exists | | |
| TC132 | Verify migration is idempotent | Database already migrated | 1. Run migrate_db.py twice<br>2. Verify no errors<br>3. Check data integrity | Database: migrated | Second run completes successfully<br>No duplicate columns<br>No data loss | Safe to re-run | | |
| TC133 | Verify migration column_exists check | Database with existing columns | 1. Run column_exists()<br>2. Check for existing column<br>3. Verify returns True | table: Detections<br>column: detection_id | Returns True for existing column<br>Returns False for non-existent | Check function works | | |
| TC134 | Verify migration table_exists check | Database with tables | 1. Run table_exists()<br>2. Check for existing table<br>3. Verify returns True | table: Users | Returns True for existing table<br>Returns False for non-existent | Check function works | | |
| TC135 | Verify database connection pooling | Multiple concurrent requests | 1. Make 10 simultaneous requests<br>2. Verify all succeed<br>3. Check connection handling | Concurrent requests: 10 | All requests complete<br>No connection errors<br>Connections properly closed | Connection pooling works | | |
| TC136 | Verify database transaction rollback on error | Error occurs during transaction | 1. Start transaction<br>2. Cause error<br>3. Verify rollback | Operation: insert with constraint violation | Transaction rolled back<br>No partial data saved<br>Database consistent | Rollback works | | |
| TC137 | Verify database session cleanup | Request completes | 1. Make API request<br>2. Verify session closed<br>3. Check no leaks | Endpoint: any | Session closed in finally block<br>No connection leaks<br>Resources released | Cleanup works | | |
| TC138 | Verify SQLite to PostgreSQL compatibility | Database URL configured | 1. Switch DATABASE_URL<br>2. Run migrations<br>3. Verify compatibility | DB: PostgreSQL | Migrations work on PostgreSQL<br>Schema created correctly<br>Data types compatible | Cross-DB compatibility | | |
| TC139 | Verify database seeding on startup | Fresh database | 1. Start backend<br>2. Verify guidance data seeded<br>3. Check DiseaseGuidance table | Database: empty | DiseaseGuidance table populated<br>Contains wheat, rice, cotton diseases<br>All fields present | Seeding works | | |
| TC140 | Verify database seeding is idempotent | Database already seeded | 1. Start backend twice<br>2. Verify no duplicates<br>3. Check data integrity | Database: seeded | No duplicate guidance entries<br>Existing data preserved<br>No errors | Safe to re-seed | | |

---

## Module 12: API Error Handling & Edge Cases

| Test case ID | Test Objective | Precondition | Steps | Test data | Expected result | Post-condition | Actual Result | Pass/fail |
|--------------|----------------|--------------|-------|-----------|-----------------|----------------|---------------|-----------|
| TC141 | Verify 404 error for non-existent endpoint | Backend is running | 1. Call /api/nonexistent<br>2. Verify 404 response<br>3. Check error message | URL: /api/nonexistent | Returns 404 Not Found<br>Appropriate error message | Error handled | | |
| TC142 | Verify 500 error handling for server exceptions | Backend is running | 1. Trigger server error<br>2. Verify 500 response<br>3. Check error logged | Cause: database connection failure | Returns 500 Internal Server Error<br>Error logged to console<br>No sensitive data exposed | Error handled | | |
| TC143 | Verify CORS headers in response | Frontend makes cross-origin request | 1. Make request from different origin<br>2. Verify CORS headers<br>3. Check allowed origins | Origin: http://localhost:3000 | CORS headers present<br>Access-Control-Allow-Origin set<br>Request succeeds | CORS configured | | |
| TC144 | Verify request timeout handling | Request takes too long | 1. Make slow request<br>2. Verify timeout<br>3. Check error response | Timeout: 30s | Request times out<br>Error returned to client<br>Resources cleaned up | Timeout handled | | |
| TC145 | Verify large file upload rejection | User uploads very large image | 1. Upload 50MB image<br>2. Verify rejection<br>3. Check error message | File size: 50MB | Upload rejected<br>Error: "File too large"<br>No server overload | Size limit enforced | | |
| TC146 | Verify invalid JSON handling | Request with malformed JSON | 1. Send invalid JSON<br>2. Verify error response<br>3. Check status code | JSON: {invalid} | Returns 400 Bad Request<br>Error: "Invalid JSON"<br>No server crash | Invalid JSON handled | | |
| TC147 | Verify SQL injection prevention | Malicious input in query | 1. Send SQL injection attempt<br>2. Verify query sanitized<br>3. Check no data breach | Input: "'; DROP TABLE Users;--" | Input sanitized<br>Query safe<br>No SQL execution<br>No data loss | SQL injection prevented | | |
| TC148 | Verify XSS prevention in responses | Malicious script in input | 1. Submit XSS payload<br>2. Verify output escaped<br>3. Check no script execution | Input: "<script>alert('XSS')</script>" | Output escaped<br>Script not executed<br>Safe rendering | XSS prevented | | |
| TC149 | Verify rate limiting (if implemented) | Multiple rapid requests | 1. Make 100 requests in 1 second<br>2. Verify rate limit<br>3. Check 429 response | Requests: 100/second | Rate limit triggered<br>Returns 429 Too Many Requests<br>Subsequent requests blocked | Rate limiting works | | |
| TC150 | Verify graceful shutdown | Backend receives shutdown signal | 1. Send SIGTERM<br>2. Verify graceful shutdown<br>3. Check connections closed | Signal: SIGTERM | Active requests complete<br>New requests rejected<br>Database connections closed<br>Clean shutdown | Graceful shutdown works | | |

---

## Module 13: Performance & Load Testing

| Test case ID | Test Objective | Precondition | Steps | Test data | Expected result | Post-condition | Actual Result | Pass/fail |
|--------------|----------------|--------------|-------|-----------|-----------------|----------------|---------------|-----------|
| TC151 | Verify YOLO model inference time | Model loaded | 1. Upload image<br>2. Measure inference time<br>3. Verify <3 seconds | Image: 1920x1080 | Inference completes in <3 seconds<br>Acceptable performance | Performance acceptable | | |
| TC152 | Verify model caching reduces load time | First request completed | 1. Make first request (cold start)<br>2. Make second request (cached)<br>3. Compare times | Same crop type | Second request 50%+ faster<br>Model loaded from cache<br>No disk I/O | Caching improves performance | | |
| TC153 | Verify concurrent detection requests | Multiple users | 1. Send 10 concurrent detection requests<br>2. Verify all complete<br>3. Check response times | Concurrent: 10 | All requests complete successfully<br>Average response time <5s<br>No timeouts | Handles concurrency | | |
| TC154 | Verify database query performance | Large dataset | 1. Query 10,000 detections<br>2. Measure query time<br>3. Verify pagination | Records: 10,000 | Query completes in <1 second<br>Pagination works<br>No memory issues | Query performance good | | |
| TC155 | Verify image upload performance | Large image | 1. Upload 10MB image<br>2. Measure upload time<br>3. Verify processing | Image: 10MB | Upload completes in <10 seconds<br>Image processed successfully<br>No timeout | Upload performance acceptable | | |
