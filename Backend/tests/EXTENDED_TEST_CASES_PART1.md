# Extended Unit Testing - AgriSmart Project (Part 1)

## Additional Test Cases Based on Complete Code Review

---

## Module 6: Authentication & Authorization

| Test case ID | Test Objective | Precondition | Steps | Test data | Expected result | Post-condition | Actual Result | Pass/fail |
|--------------|----------------|--------------|-------|-----------|-----------------|----------------|---------------|-----------|
| TC056 | Verify user signup with valid data | Backend is running | 1. Call /api/auth/signup<br>2. Provide all required fields<br>3. Verify response | name: "John Farmer"<br>email: "john@test.com"<br>password: "Pass123"<br>role: farmer | User created successfully<br>Returns token and user object<br>Status: 201 | User record saved in database<br>Password hashed | | |
| TC057 | Verify signup with duplicate email | User with email already exists | 1. Call /api/auth/signup<br>2. Use existing email<br>3. Verify error response | email: "existing@test.com"<br>password: "Pass123" | Returns error 409<br>Message: "Email already registered" | No duplicate user created | | |
| TC058 | Verify signup with missing required fields | Backend is running | 1. Call /api/auth/signup<br>2. Omit name field<br>3. Verify error | email: "test@test.com"<br>password: "Pass123"<br>name: null | Returns error 400<br>Message: "name, email and password are required" | No user created | | |
| TC059 | Verify signup with invalid role | Backend is running | 1. Call /api/auth/signup<br>2. Provide invalid role<br>3. Verify error | role: "superuser" | Returns error 400<br>Message: "Invalid role" | No user created | | |
| TC060 | Verify login with valid credentials | User exists in database | 1. Call /api/auth/login<br>2. Provide correct email/password<br>3. Verify token returned | email: "john@test.com"<br>password: "Pass123" | Returns token and user object<br>Status: 200 | User session created | | |
| TC061 | Verify login with invalid password | User exists in database | 1. Call /api/auth/login<br>2. Provide wrong password<br>3. Verify error | email: "john@test.com"<br>password: "WrongPass" | Returns error 401<br>Message: "Invalid email or password" | No session created | | |
| TC062 | Verify login with non-existent email | Backend is running | 1. Call /api/auth/login<br>2. Use unregistered email<br>3. Verify error | email: "notfound@test.com"<br>password: "Pass123" | Returns error 401<br>Message: "Invalid email or password" | No session created | | |
| TC063 | Verify token generation | User logs in successfully | 1. Login user<br>2. Extract token<br>3. Verify token format | email: "john@test.com" | Token is valid URLSafeTimedSerializer format<br>Contains uid and role | Token can be decoded | | |
| TC064 | Verify token expiration | Token is 8 days old | 1. Use expired token<br>2. Call /api/auth/me<br>3. Verify error | token: <expired_token> | Returns error 401<br>Message: "Token expired" | User must re-login | | |
| TC065 | Verify token validation with invalid signature | Backend is running | 1. Modify token signature<br>2. Call /api/auth/me<br>3. Verify error | token: <tampered_token> | Returns error 401<br>Message: "Invalid token" | Request rejected | | |
| TC066 | Verify /me endpoint with valid token | User is logged in | 1. Call /api/auth/me<br>2. Provide valid bearer token<br>3. Verify user data returned | Authorization: Bearer <token> | Returns user object with id, name, email, role<br>Status: 200 | User data retrieved | | |
| TC067 | Verify /me endpoint without token | Backend is running | 1. Call /api/auth/me<br>2. No Authorization header<br>3. Verify error | Authorization: null | Returns error 401<br>Message: "Missing bearer token" | Request rejected | | |
| TC068 | Verify password hashing on signup | User signs up | 1. Create user<br>2. Check database<br>3. Verify password is hashed | password: "PlainText123" | Password stored as hash<br>Not plain text<br>Uses werkzeug.security | Password secure | | |
| TC069 | Verify email case-insensitivity | Backend is running | 1. Signup with "Test@Email.com"<br>2. Login with "test@email.com"<br>3. Verify success | email: mixed case | Email normalized to lowercase<br>Login succeeds | Case-insensitive matching works | | |
| TC070 | Verify role-based access control | User has farmer role | 1. Login as farmer<br>2. Verify role in token<br>3. Check access permissions | role: farmer | Token contains role: "farmer"<br>Access to farmer endpoints only | Role enforced | | |

---

## Module 7: Admin Dashboard & Management

| Test case ID | Test Objective | Precondition | Steps | Test data | Expected result | Post-condition | Actual Result | Pass/fail |
|--------------|----------------|--------------|-------|-----------|-----------------|----------------|---------------|-----------|
| TC071 | Verify admin can list all detections | Admin is logged in | 1. Call /api/admin/detections<br>2. Verify pagination<br>3. Check response format | page: 1<br>pageSize: 20 | Returns paginated list<br>Includes total, page, pageSize, items | Detection list displayed | | |
| TC072 | Verify detection list pagination | Multiple detections exist | 1. Request page 1<br>2. Request page 2<br>3. Verify different results | page: 1, pageSize: 10<br>page: 2, pageSize: 10 | Page 1 returns first 10<br>Page 2 returns next 10<br>No overlap | Pagination works correctly | | |
| TC073 | Verify detection list includes geotag data | Detections have GPS coordinates | 1. Call /api/admin/detections<br>2. Verify latitude/longitude in response | farmerId: test-farmer-1 | Each detection includes latitude, longitude, alertGenerated fields | Geotag data visible to admin | | |
| TC074 | Verify admin can filter alerts by status | Alerts exist with different statuses | 1. Call /api/admin/alerts?status=pending<br>2. Verify only pending returned | status: pending | Returns only pending alerts<br>Approved alerts excluded | Filter works correctly | | |
| TC075 | Verify alert list returns empty when no alerts | No alerts in database | 1. Call /api/admin/alerts<br>2. Verify empty array | Database: no alerts | Returns {items: []}<br>No error thrown | Empty state handled | | |
