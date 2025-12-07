# Geotagging & Heatmap Feature - Complete Setup Guide

## Overview

This feature automatically detects disease outbreaks when:
- **Same disease** detected **3+ times**
- **Within 10km radius**
- **Within 2-week window**

Then:
1. Admin receives **pending alert**
2. Admin **approves** the outbreak
3. **Heatmap** displays on Pakistan map
4. All users are **notified**

---

## Quick Start

### 1. Run Database Migration

```bash
cd Backend
python migrate_db.py
```

Or use the complete startup script:

```bash
cd Backend
start-complete.bat
```

This adds:
- `latitude`, `longitude`, `alert_generated` to `Detections` table
- `latitude`, `longitude` to `Users` table
- New `OutbreakAlerts` table

### 2. Update Frontend IP

Get your IP:
```bash
ipconfig | findstr "IPv4"
```

Update `project/utils/env.ts` line 14:
```ts
const BACKEND_NETWORK_IP = 'YOUR_IP_HERE';  // e.g., 192.168.100.15
```

### 3. Start Backend

```bash
cd Backend
python app.py
```

### 4. Start Frontend

```bash
cd project
npm run dev
```

---

## Feature Flow

### A. User Signup (with Location)

**Frontend**: `project/app/auth/signup.tsx`
- User taps **location icon** (Navigation button)
- App requests GPS permission
- Captures `latitude`, `longitude`
- Reverse geocodes to human-readable location
- Sends all to backend

**Backend**: `Backend/routes/auth.py` → `/signup`
- Accepts `latitude`, `longitude` in JSON
- Stores in `Users` table

### B. Disease Detection (with Coordinates)

**Frontend**: `project/app/(farmer)/disease-detection.tsx`
- User uploads crop image
- App captures current GPS location
- Sends `latitude`, `longitude` with detection

**Backend**: `Backend/routes/farmer.py` → `/detections`
1. Saves detection with coordinates
2. **Outbreak Detection Logic**:
   ```python
   # Query last 2 weeks, same disease
   two_weeks_ago = datetime.utcnow() - timedelta(days=14)
   recent = db.query(Detection).filter(
       Detection.disease_id == det.disease_id,
       Detection.timestamp >= two_weeks_ago,
       Detection.latitude.isnot(None),
       Detection.longitude.isnot(None),
   ).all()
   
   # Filter within 10km (inline haversine)
   nearby = [d for d in recent if haversine_km(lat, lng, d.latitude, d.longitude) <= 10.0]
   
   # If 3+, create pending alert
   if len(nearby) >= 3:
       alert = OutbreakAlert(status='pending', center_lat=lat, center_lng=lng, radius_km=10)
       db.add(alert)
       for d in nearby:
           d.alert_generated = 'pending'
       db.commit()
   ```

### C. Admin Approval

**Frontend**: `project/app/(admin)/index.tsx`
- **Outbreak Alerts** section lists pending alerts
- Shows: disease ID, center coords, radius
- **Approve** button calls backend

**Backend**: `Backend/routes/admin.py` → `/alerts/<id>/approve`
1. Updates alert: `status = 'approved'`
2. Updates related detections: `alert_generated = 'approved'`
3. Commits to DB
4. **(TODO: Trigger notification system here)**

### D. Heatmap Display

**Frontend**: `project/app/(farmer)/heatmap.tsx`
- Fetches `GET /api/admin/alerts?status=approved`
- On **native** (Android/iOS):
  - Renders `react-native-maps` with `MapView`
  - Draws `Circle` for each alert (center + radius)
  - Adds `Marker` at center
- On **web**:
  - Shows placeholder (maps not supported in Expo Go web)

**Backend**: `Backend/routes/admin.py` → `/alerts`
- Returns all approved alerts with:
  - `centerLat`, `centerLng`, `radiusKm`
  - `diseaseId`, `createdAt`

---

## Database Schema

### Detections Table (Extended)
```sql
CREATE TABLE Detections (
    detection_id VARCHAR(50) PRIMARY KEY,
    farmer_id VARCHAR(50) NOT NULL,
    disease_id VARCHAR(50),
    latitude REAL,           -- NEW
    longitude REAL,          -- NEW
    alert_generated VARCHAR(10) DEFAULT 'no',  -- NEW: 'no', 'pending', 'approved'
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    ...
);
```

### Users Table (Extended)
```sql
CREATE TABLE Users (
    user_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    location VARCHAR(120),   -- Human-readable
    latitude REAL,           -- NEW: GPS coordinates
    longitude REAL,          -- NEW
    role VARCHAR(20) DEFAULT 'farmer',
    ...
);
```

### OutbreakAlerts Table (New)
```sql
CREATE TABLE OutbreakAlerts (
    alert_id VARCHAR(50) PRIMARY KEY,
    disease_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending' or 'approved'
    center_lat REAL NOT NULL,
    center_lng REAL NOT NULL,
    radius_km REAL DEFAULT 10.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## API Endpoints

### Detection with Geo
```http
POST /api/farmer/detections
Content-Type: multipart/form-data

file: <image>
cropType: wheat
farmerId: <uuid>
latitude: 31.5204
longitude: 74.3587
```

**Response**:
```json
{
  "detectionId": "...",
  "disease": "Wheat Rust",
  "confidence": 87,
  "latitude": 31.5204,
  "longitude": 74.3587
}
```

### List Alerts (Admin)
```http
GET /api/admin/alerts?status=pending
```

**Response**:
```json
{
  "items": [
    {
      "alertId": "...",
      "diseaseId": "wheat-rust",
      "status": "pending",
      "centerLat": 31.5204,
      "centerLng": 74.3587,
      "radiusKm": 10.0,
      "createdAt": "2024-01-15T10:30:00"
    }
  ]
}
```

### Approve Alert
```http
POST /api/admin/alerts/<alert_id>/approve
```

**Response**:
```json
{
  "success": true
}
```

### Heatmap Data (Farmer)
```http
GET /api/admin/alerts?status=approved
```

Returns same format as above, but only approved alerts.

---

## Testing the Feature

### 1. Create Test Detections

Use the mobile app or curl:

```bash
# Detection 1
curl -X POST http://localhost:5000/api/farmer/detections \
  -F "file=@wheat_rust.jpg" \
  -F "cropType=wheat" \
  -F "farmerId=test-farmer-1" \
  -F "latitude=31.5204" \
  -F "longitude=74.3587"

# Detection 2 (within 10km)
curl -X POST http://localhost:5000/api/farmer/detections \
  -F "file=@wheat_rust2.jpg" \
  -F "cropType=wheat" \
  -F "farmerId=test-farmer-2" \
  -F "latitude=31.5300" \
  -F "longitude=74.3700"

# Detection 3 (within 10km) - triggers alert!
curl -X POST http://localhost:5000/api/farmer/detections \
  -F "file=@wheat_rust3.jpg" \
  -F "cropType=wheat" \
  -F "farmerId=test-farmer-3" \
  -F "latitude=31.5250" \
  -F "longitude=74.3650"
```

### 2. Check Pending Alerts (Admin)

```bash
curl http://localhost:5000/api/admin/alerts?status=pending
```

Should return 1 alert.

### 3. Approve Alert

```bash
curl -X POST http://localhost:5000/api/admin/alerts/<alert_id>/approve
```

### 4. View Heatmap

Open the mobile app → Heatmap tab.
- On device/emulator: see real map with circle overlay
- On web: see placeholder message

---

## Troubleshooting

### "Invalid JSON response" errors

**Cause**: Database schema out of sync.

**Fix**:
```bash
cd Backend
python migrate_db.py
```

Restart backend.

### Heatmap shows "react-native-maps installation error"

**Cause**: Using Expo Go (doesn't support native modules).

**Fix**: Build dev client:
```bash
cd project
npx expo run:android  # or npx expo run:ios
```

Or keep using web/placeholder for now.

### Location not captured in signup

**Check**:
1. App has location permission
2. Device GPS is enabled
3. Check browser console for errors

**Manual entry**: User can still type location string.

### Outbreak alert not created

**Check**:
1. All 3 detections have `latitude`/`longitude`
2. All 3 are same `disease_id`
3. All 3 within 2 weeks
4. All 3 within 10km

**Debug**: Check backend logs for haversine calculations.

---

## Next Steps

### Add Notifications

In `Backend/routes/admin.py` → `approve_alert()`, add:

```python
# After db.commit()
from core.notifications import notify_all_users  # Create this
notify_all_users(f"{alert.disease_id} outbreak confirmed in region")
```

### Improve Heatmap

- Use real Pakistan map tiles
- Add clustering for multiple alerts
- Color-code by disease severity
- Add date range filter

### Analytics

- Track outbreak trends over time
- Generate PDF reports for admins
- Email alerts to nearby farmers

---

## Files Modified

### Backend
- `Backend/schemas/user.py` - Added lat/lng to User
- `Backend/schemas/detection.py` - Added lat/lng, alert_generated
- `Backend/routes/auth.py` - Accept coordinates in signup
- `Backend/routes/farmer.py` - Outbreak detection logic
- `Backend/routes/admin.py` - Alert approval
- `Backend/migrate_db.py` - Migration script
- `Backend/app.py` - Auto-run migration on startup

### Frontend
- `project/app/auth/signup.tsx` - GPS capture button
- `project/app/(farmer)/heatmap.tsx` - Real map with circles
- `project/app/(admin)/index.tsx` - Alerts section
- `project/hooks/useAdmin.ts` - Alert hooks

---

## Support

For issues, check:
1. Backend logs: `python app.py` output
2. Frontend logs: Expo terminal or browser console
3. Database: `sqlite3 agrismart_test.db` → `.schema`

Good luck! 🌾📍

