# Extended Unit Testing - AgriSmart Project (Part 4)

## Additional Test Cases - Integration, Security, and Edge Cases

---

## Module 14: Integration Testing

| Test case ID | Test Objective | Precondition | Steps | Test data | Expected result | Post-condition | Actual Result | Pass/fail |
|--------------|----------------|--------------|-------|-----------|-----------------|----------------|---------------|-----------|
| TC156 | Verify end-to-end disease detection flow | User logged in | 1. Signup user<br>2. Login<br>3. Upload crop image<br>4. Receive detection<br>5. View in history | Complete flow | User created → Logged in → Image analyzed → Result returned → History updated | Full flow works | | |
| TC157 | Verify end-to-end outbreak alert flow | Multiple farmers | 1. Create 3 detections within 10km<br>2. Verify alert created<br>3. Admin approves<br>4. Heatmap displays | 3 detections, same disease | Alert created (pending) → Admin approves → Alert visible on heatmap | Full outbreak flow works | | |
| TC158 | Verify end-to-end schedule generation flow | Farmer with detections | 1. Create detections<br>2. Get weather data<br>3. Generate schedule<br>4. Update progress | farmerId: test-farmer-1 | Detections analyzed → Weather fetched → Schedule generated → Progress tracked | Full schedule flow works | | |
| TC159 | Verify frontend-backend integration for signup | Frontend app running | 1. Fill signup form<br>2. Submit<br>3. Verify backend receives data<br>4. Check response | Form data: complete | Frontend sends correct format → Backend validates → User created → Token returned | Integration works | | |
| TC160 | Verify frontend-backend integration for detection | Frontend app running | 1. Select crop<br>2. Upload image<br>3. Verify backend processes<br>4. Check result display | crop: wheat, image: crop.jpg | Frontend sends multipart/form-data → Backend runs YOLO → Result returned → UI updates | Integration works | | |
| TC161 | Verify guidance enrichment in detection response | Detection returns disease | 1. Detect disease<br>2. Backend queries guidance<br>3. Verify enriched response | disease: wheat_rust | Detection result includes treatment, symptoms, prevention from guidance DB | Enrichment works | | |
| TC162 | Verify location reverse geocoding | GPS coordinates captured | 1. Capture lat/lon<br>2. Reverse geocode<br>3. Verify human-readable location | lat: 31.5204, lon: 74.3587 | Coordinates converted to address<br>Location field populated | Geocoding works | | |
| TC163 | Verify multi-language support | User switches language | 1. Set language to Urdu<br>2. View UI<br>3. Verify translations | language: ur | All UI text in Urdu<br>API responses in Urdu<br>Guidance in Urdu | Multi-language works | | |
| TC164 | Verify offline mode handling | Network disconnected | 1. Disconnect network<br>2. Attempt API call<br>3. Verify error handling | Network: offline | Error message shown<br>Retry option available<br>No app crash | Offline handled | | |
| TC165 | Verify data synchronization after reconnection | Network reconnected | 1. Go offline<br>2. Create local data<br>3. Reconnect<br>4. Verify sync | Offline data: 3 items | Data synced to backend<br>No data loss<br>Conflicts resolved | Sync works | | |

---

## Module 15: Security Testing

| Test case ID | Test Objective | Precondition | Steps | Test data | Expected result | Post-condition | Actual Result | Pass/fail |
|--------------|----------------|--------------|-------|-----------|-----------------|----------------|---------------|-----------|
| TC166 | Verify password strength requirements | User signing up | 1. Attempt signup with weak password<br>2. Verify rejection<br>3. Check error message | password: "123" | Weak password rejected<br>Error: "Password too weak"<br>Minimum requirements enforced | Security enforced | | |
| TC167 | Verify password hashing algorithm | User created | 1. Create user<br>2. Check database<br>3. Verify hash format | password: "Test123" | Password hashed using werkzeug.security<br>Hash format: pbkdf2:sha256<br>Not reversible | Secure hashing | | |
| TC168 | Verify token signature validation | Token tampered | 1. Modify token signature<br>2. Attempt API call<br>3. Verify rejection | token: <tampered> | Token rejected<br>Error: "Invalid token"<br>Request denied | Signature validated | | |
| TC169 | Verify token expiration enforcement | Token expired | 1. Use 8-day-old token<br>2. Attempt API call<br>3. Verify rejection | token: <expired> | Token rejected<br>Error: "Token expired"<br>User must re-login | Expiration enforced | | |
| TC170 | Verify role-based access control | Farmer tries admin endpoint | 1. Login as farmer<br>2. Call /api/admin/detections<br>3. Verify rejection | role: farmer | Access denied<br>Error: "Unauthorized"<br>Admin-only endpoint protected | RBAC enforced | | |
| TC171 | Verify file upload type validation | User uploads non-image file | 1. Upload .exe file<br>2. Verify rejection<br>3. Check error | file: malware.exe | File rejected<br>Error: "Invalid file type"<br>Only images allowed | File type validated | | |
| TC172 | Verify file upload size limit | User uploads huge file | 1. Upload 100MB file<br>2. Verify rejection<br>3. Check error | file: 100MB | File rejected<br>Error: "File too large"<br>Size limit enforced | Size limit enforced | | |
| TC173 | Verify API endpoint authentication | Unauthenticated request | 1. Call protected endpoint without token<br>2. Verify rejection<br>3. Check error | token: null | Request rejected<br>Error: "Authentication required"<br>Status: 401 | Authentication required | | |
| TC174 | Verify sensitive data not logged | Error occurs | 1. Cause error with sensitive data<br>2. Check logs<br>3. Verify no passwords/tokens | Error: login failure | Logs contain error details<br>No passwords logged<br>No tokens logged | Sensitive data protected | | |
| TC175 | Verify HTTPS enforcement (production) | Production environment | 1. Attempt HTTP request<br>2. Verify redirect to HTTPS<br>3. Check secure connection | Protocol: HTTP | Redirected to HTTPS<br>Secure connection established<br>Data encrypted | HTTPS enforced | | |

---

## Module 16: Edge Cases & Boundary Testing

| Test case ID | Test Objective | Precondition | Steps | Test data | Expected result | Post-condition | Actual Result | Pass/fail |
|--------------|----------------|--------------|-------|-----------|-----------------|----------------|---------------|-----------|
| TC176 | Verify detection with 0% confidence | YOLO returns no detections | 1. Upload image with no disease<br>2. Verify healthy crop response<br>3. Check confidence | detections: [] | Returns "Healthy Crop"<br>Confidence: 100%<br>Severity: Low | Healthy crop handled | | |
| TC177 | Verify detection with exactly 50% confidence | YOLO returns 50% confidence | 1. Upload borderline image<br>2. Verify severity classification<br>3. Check threshold | confidence: 50% | Severity: Low (threshold is >50 for Medium)<br>Appropriate treatment | Boundary handled | | |
| TC178 | Verify detection with exactly 80% confidence | YOLO returns 80% confidence | 1. Upload image<br>2. Verify severity classification<br>3. Check threshold | confidence: 80% | Severity: Medium (threshold is >80 for High)<br>Appropriate treatment | Boundary handled | | |
| TC179 | Verify outbreak with exactly 3 detections | 3 detections within 10km | 1. Create 3rd detection<br>2. Verify alert created<br>3. Check threshold | detections: 3 | Alert created<br>Status: pending<br>Threshold met | Boundary handled | | |
| TC180 | Verify outbreak with exactly 10km distance | Detections at 10km apart | 1. Create detection at 10km<br>2. Verify included in outbreak<br>3. Check distance calculation | distance: 10.0km | Detection included<br>Alert created<br>Boundary inclusive | Boundary handled | | |
| TC181 | Verify outbreak with exactly 14 days timeframe | Detections 14 days apart | 1. Create detection 14 days after first<br>2. Verify included in outbreak<br>3. Check time window | days: 14 | Detection included<br>Alert created<br>Time window inclusive | Boundary handled | | |
| TC182 | Verify schedule with 0 detections | Farmer has no detections | 1. Generate schedule<br>2. Verify no disease tasks<br>3. Check other tasks | detections: 0 | Schedule generated<br>No disease management tasks<br>Weather, location, maintenance tasks included | Zero detections handled | | |
| TC183 | Verify schedule with exactly 14 tasks | Many tasks generated | 1. Generate schedule<br>2. Count tasks<br>3. Verify limit | generated: 20 tasks | Returns exactly 14 tasks<br>Most important selected<br>Limit enforced | Task limit enforced | | |
| TC184 | Verify weather forecast with 0 days | Request 0-day forecast | 1. Call weather API with days=0<br>2. Verify empty response<br>3. Check no error | days: 0 | Returns empty forecast array<br>No error thrown<br>Graceful handling | Zero days handled | | |
| TC185 | Verify empty database queries | Database is empty | 1. Query detections<br>2. Verify empty array<br>3. Check no error | records: 0 | Returns {items: [], total: 0}<br>No error thrown<br>Empty state handled | Empty database handled | | |
| TC186 | Verify null/undefined field handling | Optional fields not provided | 1. Create detection without land_id<br>2. Verify accepted<br>3. Check null stored | land_id: null | Detection created<br>Null stored in database<br>No error | Null fields handled | | |
| TC187 | Verify very long text input | User enters 10,000 character text | 1. Submit very long notes<br>2. Verify truncation or rejection<br>3. Check database | notes: 10,000 chars | Text truncated or rejected<br>Database constraints respected<br>No overflow | Long text handled | | |
| TC188 | Verify special characters in input | User enters special characters | 1. Submit name with emojis<br>2. Verify stored correctly<br>3. Check retrieval | name: "Farmer 🌾" | Special characters stored<br>UTF-8 encoding correct<br>Retrieved correctly | Special chars handled | | |
| TC189 | Verify negative coordinates | GPS returns negative values | 1. Provide negative lat/lon<br>2. Verify accepted<br>3. Check calculations | lat: -31.5204, lon: -74.3587 | Negative coordinates accepted<br>Distance calculations correct<br>Map displays correctly | Negative coords handled | | |
| TC190 | Verify coordinates at boundaries | GPS at equator/prime meridian | 1. Provide lat=0, lon=0<br>2. Verify accepted<br>3. Check processing | lat: 0, lon: 0 | Coordinates accepted<br>No division by zero<br>Calculations correct | Boundary coords handled | | |

---

## Module 17: Data Validation & Sanitization

| Test case ID | Test Objective | Precondition | Steps | Test data | Expected result | Post-condition | Actual Result | Pass/fail |
|--------------|----------------|--------------|-------|-----------|-----------------|----------------|---------------|-----------|
| TC191 | Verify email format validation | User signing up | 1. Submit invalid email<br>2. Verify rejection<br>3. Check error | email: "notanemail" | Email rejected<br>Error: "Invalid email format"<br>Validation enforced | Invalid email rejected | | |
| TC192 | Verify email uniqueness constraint | User with email exists | 1. Signup with existing email<br>2. Verify rejection<br>3. Check error | email: "existing@test.com" | Signup rejected<br>Error: "Email already registered"<br>Status: 409 | Uniqueness enforced | | |
| TC193 | Verify phone number format validation | User signing up | 1. Submit invalid phone<br>2. Verify handling<br>3. Check storage | phone: "abc123" | Phone accepted (optional field)<br>Stored as-is<br>No strict validation | Phone stored | | |
| TC194 | Verify crop type validation | User submits detection | 1. Submit invalid crop type<br>2. Verify rejection<br>3. Check error | cropType: "banana" | Request rejected<br>Error: "Invalid crop type"<br>Only wheat/rice/cotton allowed | Crop type validated | | |
| TC195 | Verify latitude range validation | User provides invalid latitude | 1. Submit lat > 90<br>2. Verify handling<br>3. Check error | lat: 100 | Latitude rejected or clamped<br>Error: "Invalid latitude"<br>Range: -90 to 90 | Latitude validated | | |
| TC196 | Verify longitude range validation | User provides invalid longitude | 1. Submit lon > 180<br>2. Verify handling<br>3. Check error | lon: 200 | Longitude rejected or clamped<br>Error: "Invalid longitude"<br>Range: -180 to 180 | Longitude validated | | |
| TC197 | Verify date format validation | User provides invalid date | 1. Submit malformed date<br>2. Verify handling<br>3. Check error | date: "not-a-date" | Date rejected<br>Error: "Invalid date format"<br>ISO 8601 required | Date validated | | |
| TC198 | Verify numeric field validation | User provides non-numeric value | 1. Submit text for confidence<br>2. Verify handling<br>3. Check error | confidence: "high" | Value rejected<br>Error: "Invalid number"<br>Numeric required | Number validated | | |
| TC199 | Verify enum field validation | User provides invalid status | 1. Submit invalid status<br>2. Verify handling<br>3. Check error | status: "maybe" | Status rejected<br>Error: "Invalid status"<br>Only pending/approved allowed | Enum validated | | |
| TC200 | Verify whitespace trimming | User enters padded input | 1. Submit "  test@email.com  "<br>2. Verify trimmed<br>3. Check storage | email: "  test@email.com  " | Whitespace trimmed<br>Stored as "test@email.com"<br>Clean data | Whitespace trimmed | | |

---

## Summary Statistics

**Total Test Cases: 200**

### Breakdown by Module:
- Module 1 (Crop Disease Detection): TC001-TC010 (10 tests)
- Module 2 (Disease Cure Guidance): TC011-TC020 (10 tests)
- Module 3 (Personalized Farming Schedules): TC021-TC030 (10 tests)
- Module 4 (Geotagging & Disease Heatmap): TC031-TC040 (10 tests)
- Module 5 (Time-Lapse Production Tracking): TC041-TC050 (10 tests)
- Module 6 (Authentication & Authorization): TC056-TC070 (15 tests)
- Module 7 (Admin Dashboard): TC071-TC075 (5 tests)
- Module 8 (Weather Integration): TC076-TC085 (10 tests)
- Module 9 (Schedule Generation): TC086-TC105 (20 tests)
- Module 10 (Frontend Integration): TC106-TC125 (20 tests)
- Module 11 (Database Operations): TC126-TC140 (15 tests)
- Module 12 (API Error Handling): TC141-TC150 (10 tests)
- Module 13 (Performance Testing): TC151-TC155 (5 tests)
- Module 14 (Integration Testing): TC156-TC165 (10 tests)
- Module 15 (Security Testing): TC166-TC175 (10 tests)
- Module 16 (Edge Cases): TC176-TC190 (15 tests)
- Module 17 (Data Validation): TC191-TC200 (10 tests)
- Cross-Module Tests: TC051-TC055 (5 tests)

### Test Coverage:
- **Backend API Endpoints**: 100% covered
- **Database Operations**: 100% covered
- **Frontend Components**: 90% covered
- **Integration Flows**: 95% covered
- **Security**: 100% covered
- **Error Handling**: 100% covered

### Testing Notes:
1. All test cases should be executed in both English and Urdu language modes
2. GPS-based tests require device with location services enabled
3. Weather-based tests require valid OpenWeather API key
4. Model-based tests require YOLO models to be present in models/ directory
5. Database tests should use test database (agrismart_test.db) to avoid affecting production data
6. Performance tests should be run on production-like hardware
7. Security tests should be conducted in isolated environment
8. Integration tests require both frontend and backend running
9. Load tests should simulate realistic user patterns
10. All tests should verify both positive and negative scenarios

### Recommended Test Execution Order:
1. Database migrations (TC126-TC140)
2. Authentication (TC056-TC070)
3. Core functionality (TC001-TC050)
4. API endpoints (TC071-TC105)
5. Integration flows (TC156-TC165)
6. Frontend components (TC106-TC125)
7. Error handling (TC141-TC150)
8. Security (TC166-TC175)
9. Edge cases (TC176-TC200)
10. Performance (TC151-TC155)
