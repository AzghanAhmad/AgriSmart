# 🌾 Geotagging & Heatmap Feature - Manual Testing Guide

## 🚀 Quick Start (TL;DR)

**To trigger an outbreak alert:**
1. Create **3+ detections** of the **same disease** within **10km radius** and **2 weeks**
2. Login as **Admin** → See alert in "Outbreak Alerts" section
3. Click **"Approve"** button
4. Login as **Farmer** → Go to **Heatmap** tab → See approved alert on map

**Key Requirements:**
- ✅ Same disease name
- ✅ Within 10km of each other
- ✅ Within 2 weeks time window
- ✅ At least 3 detections

---

## 📋 Prerequisites

1. **Backend is running** on `http://localhost:5000` (or your configured IP)
2. **Database migrations completed** (run `python Backend/migrate_db.py` if not done)
3. **Two user accounts created:**
   - At least **1 Farmer account** (for creating detections)
   - At least **1 Admin account** (for approving alerts)

---

## 🎯 Complete Testing Flow

### **STEP 1: Create Farmer Account with Location**

1. **Open the app** and navigate to **Sign Up** screen
2. **Fill in farmer details:**
   - Name: `Test Farmer`
   - Email: `farmer@test.com`
   - Password: `password123`
   - Phone: `+923001234567`
   - **Click on Location field** → A map modal will open
3. **Set location on map:**
   - **Option A:** Click "Use Current Location" (if GPS enabled)
   - **Option B:** Search for a location (e.g., "Lahore, Pakistan")
   - **Option C:** Manually drag the pin to a location
   - **Confirm location** → Modal closes, address appears
4. **Complete signup** → Note the `farmer_id` from response (or check backend logs)

**✅ Expected Result:**
- Location coordinates (`latitude`, `longitude`) are saved
- Address string is stored in `location` field
- You can see coordinates in backend logs: `User created with lat: X, lng: Y`

---

### **STEP 2: Create 3+ Disease Detections (Same Disease, Same Area)**

**Important:** To trigger an outbreak alert, you need:
- **Same disease name** (e.g., "Early Blight", "Late Blight", "Leaf Spot")
- **Within 10km radius** of each other
- **Within 2 weeks** time window
- **At least 3 detections**

#### **Detection 1:**
1. **Login as farmer** (`farmer@test.com`)
2. Navigate to **Disease Detection** screen
3. **Select crop type** (e.g., "Tomato", "Potato")
4. **Take/upload an image** of a diseased plant
5. **Ensure location is captured:**
   - App should automatically get GPS coordinates
   - Check backend logs: `latitude: X, longitude: Y`
6. **Submit detection** → Note the `disease_name` from response

**✅ Expected Result:**
- Detection created with `status: 'pending'`
- `alert_generated: 'no'`
- Coordinates stored in database

#### **Detection 2 (Nearby Location):**
1. **Stay on same screen** or navigate back to Disease Detection
2. **Use a different image** (or same image is fine for testing)
3. **Important:** Use coordinates **within 10km** of Detection 1
   - If Detection 1 was at `31.5204, 74.3587` (Lahore)
   - Detection 2 should be at `31.5300, 74.3600` (about 1km away)
   - **Tip:** You can manually adjust coordinates in backend if needed
4. **Select same crop type** and **same disease** (or use same image)
5. **Submit detection**

**✅ Expected Result:**
- Detection created
- Backend logs: `Found 2 recent detections of [disease_name]`
- `Not enough detections for outbreak (need 3, have 2)`

#### **Detection 3 (Trigger Alert):**
1. **Create third detection** with:
   - Same crop type
   - Same disease (or same image)
   - Coordinates within 10km of previous detections
2. **Submit detection**

**✅ Expected Result:**
- Backend logs: `🚨 NEW OUTBREAK ALERT CREATED: [alert_id] for [disease_name]`
- Detection 3 and previous 2 detections get `alert_generated: 'pending'`
- New `OutbreakAlert` record created with:
  - `status: 'pending'`
  - `center_lat`, `center_lng` (center of outbreak area)
  - `radius_km: 10.0`
  - `disease_name: [detected disease]`

---

### **STEP 3: Verify Alert in Admin Panel**

1. **Logout from farmer account**
2. **Login as Admin** (admin account)
3. Navigate to **Admin Dashboard** (main screen)
4. **Scroll down to "Outbreak Alerts" section** (below charts and statistics)
5. **Check pending alerts:**
   - You should see alert cards with:
     - **Red alert icon** (triangle with exclamation)
     - **Disease name** (e.g., "Early Blight Outbreak")
     - **Radius:** `10 km`
     - **Location coordinates:** `31.5204, 74.3587` (formatted)
     - **Date:** Creation date
     - **"Approve" button** (green button on the right)

**✅ Expected Result:**
- Alert card appears in "Outbreak Alerts" section
- All details are visible (disease name, location, radius, date)
- "Approve" button is clickable
- If no alerts: Shows "No pending outbreak alerts."

**🔍 Troubleshooting:**
- If no alerts appear, check:
  - Backend logs for alert creation
  - Database: `SELECT * FROM OutbreakAlerts WHERE status='pending';`
  - API endpoint: `GET http://localhost:5000/api/admin/alerts?status=pending`

---

### **STEP 4: Approve Alert (Admin)**

1. **In Admin Dashboard**, scroll to "Outbreak Alerts" section
2. **Find the pending alert card** (should show disease name and location)
3. **Click the green "Approve" button** on the right side of the alert card
4. **Wait for confirmation** (alert should disappear from pending list or show success message)

**✅ Expected Result:**
- Alert card disappears from "Outbreak Alerts" section (or shows as approved)
- Backend logs: `Alert [alert_id] approved`
- All related detections get `alert_generated: 'approved'`
- Alert is now visible to all farmers on heatmap
- Alert will appear when you fetch approved alerts: `GET /api/admin/alerts?status=approved`

**🔍 Verify in Database:**
```sql
-- Check alert status
SELECT * FROM OutbreakAlerts WHERE alert_id='[alert_id]';
-- Should show status='approved'

-- Check detection alert status
SELECT detection_id, alert_generated FROM Detections WHERE alert_generated='approved';
-- Should show all 3+ detections with alert_generated='approved'
```

---

### **STEP 5: View Heatmap (Farmer)**

1. **Logout from admin**
2. **Login as farmer** (or any farmer account)
3. Navigate to **Heatmap** tab/screen (usually in bottom navigation bar)
4. **Wait for map to load**

**✅ Expected Result:**
- **Map of Pakistan loads** (or placeholder on web)
- **Approved outbreak alerts** appear as:
  - **Red circle overlay** showing outbreak radius (10km default)
  - **Red marker/pin** at center of outbreak
  - **Info popup/tooltip** when clicking marker showing:
    - Disease name
    - Location coordinates
    - Radius in km
- Only `status='approved'` alerts are shown
- Pending alerts are NOT visible (they're filtered out)

**🔍 What to Check:**
- Circle radius matches `radius_km` (10km default)
- Center coordinates match `center_lat`, `center_lng`
- Disease name is displayed correctly
- Multiple approved alerts show as separate circles
- Filter dropdowns work (Crop Filter, Layer Selector)

**⚠️ Note on Web:**
- If testing on web, map may show a placeholder message: "Map view requires native build"
- To see actual map, build native app: `npx expo run:android` or `npx expo run:ios`

---

### **STEP 6: Receive Alerts (Optional - If Implemented)**

If you have a notification system:
1. **After admin approves alert**, all farmers should receive:
   - Push notification (if enabled)
   - In-app alert/banner
   - Email notification (if configured)

**✅ Expected Result:**
- Farmers see alert notification
- Clicking notification navigates to Heatmap screen
- Alert details are visible

---

## 🧪 Quick Test Scenarios

### **Scenario A: Multiple Diseases, Same Location**
1. Create 3 detections of **Disease A** at Location X → Alert 1 created
2. Create 3 detections of **Disease B** at Location X → Alert 2 created
3. Both alerts should appear separately after approval

### **Scenario B: Same Disease, Different Locations**
1. Create 3 detections of **Disease A** at Location X (10km radius) → Alert 1
2. Create 3 detections of **Disease A** at Location Y (50km away) → Alert 2
3. Both alerts should appear as separate circles on heatmap

### **Scenario C: Time Window Test**
1. Create 2 detections today
2. Wait 15 days (or manually change timestamps in DB)
3. Create 3rd detection → Should NOT trigger alert (outside 2-week window)

### **Scenario D: Distance Test**
1. Create 2 detections at Location X
2. Create 3rd detection at Location Y (15km away)
3. Should NOT trigger alert (outside 10km radius)

---

## 🔧 Manual Coordinate Testing (Advanced)

If you want to test with specific coordinates:

### **Option 1: Modify Backend Temporarily**
In `Backend/routes/farmer.py`, after line 78, add:
```python
# FOR TESTING ONLY - Override coordinates
if farmer_id == 'your-farmer-id':
    latitude = 31.5204  # Lahore
    longitude = 74.3587
```

### **Option 2: Direct Database Insert**
```sql
-- Update detection coordinates manually
UPDATE Detections 
SET latitude = 31.5204, longitude = 74.3587 
WHERE detection_id = 'your-detection-id';
```

### **Option 3: Use API with Coordinates**
When creating detection via API:
```bash
curl -X POST http://localhost:5000/api/farmer/detections \
  -F "file=@image.jpg" \
  -F "cropType=tomato" \
  -F "farmerId=your-farmer-id" \
  -F "latitude=31.5204" \
  -F "longitude=74.3587"
```

---

## 📊 Verification Checklist

After completing the flow, verify:

- [ ] Farmer account created with `latitude` and `longitude`
- [ ] 3+ detections created with same disease and nearby coordinates
- [ ] Backend logs show: `🚨 NEW OUTBREAK ALERT CREATED`
- [ ] `OutbreakAlerts` table has new record with `status='pending'`
- [ ] Detections have `alert_generated='pending'`
- [ ] Admin panel shows pending alert in alerts table
- [ ] Admin can click "Approve" button
- [ ] Alert status changes to `approved` after approval
- [ ] Detections have `alert_generated='approved'` after approval
- [ ] Heatmap screen shows approved alert as circle/marker
- [ ] Only approved alerts appear on heatmap (pending are hidden)
- [ ] Multiple approved alerts appear as separate circles

---

## 🐛 Common Issues & Solutions

### **Issue 1: No Alert Created After 3 Detections**
**Cause:** Coordinates not captured or too far apart
**Solution:**
- Check backend logs for coordinates: `latitude: X, longitude: Y`
- Verify all 3 detections have coordinates
- Ensure coordinates are within 10km (use Haversine calculator online)

### **Issue 2: Alert Not Visible in Admin Panel**
**Cause:** Table not created or API error
**Solution:**
- Run migration: `python Backend/migrate_db.py`
- Check API: `GET /api/admin/alerts?status=pending`
- Check database: `SELECT * FROM OutbreakAlerts;`

### **Issue 3: Heatmap Not Showing Alerts**
**Cause:** Only approved alerts are shown
**Solution:**
- Ensure alert is approved by admin
- Check API: `GET /api/admin/alerts?status=approved`
- Verify `react-native-maps` is installed (native build required)

### **Issue 4: Map Not Loading**
**Cause:** `react-native-maps` not installed or web platform
**Solution:**
- On web: Map shows placeholder (expected behavior)
- On native: Build dev client: `npx expo run:android` or `npx expo run:ios`
- Add to `app.json`: `"plugins": ["react-native-maps"]`

---

## 📝 Testing Coordinates for Pakistan

Here are some test coordinates (all within 10km of each other in Lahore):

| Detection | Latitude | Longitude | Location |
|-----------|----------|-----------|----------|
| 1 | 31.5204 | 74.3587 | Lahore Center |
| 2 | 31.5300 | 74.3600 | ~1km North |
| 3 | 31.5100 | 74.3500 | ~1.5km South-West |

**Distance Calculator:**
- Use online Haversine calculator to verify distances
- All should be < 10km apart

---

## 🎬 Quick Test Script

For rapid testing, you can use this sequence:

1. **Signup farmer** → Location: `31.5204, 74.3587` (Lahore)
2. **Detection 1** → Same location, disease: "Early Blight"
3. **Detection 2** → Location: `31.5300, 74.3600`, same disease
4. **Detection 3** → Location: `31.5100, 74.3500`, same disease
5. **Check admin panel** → Should see pending alert
6. **Approve alert** → Status changes to approved
7. **View heatmap** → Should see circle at Lahore

---

## 📞 Support

If you encounter issues:
1. Check backend logs for error messages
2. Verify database schema: `python Backend/migrate_db.py`
3. Test API endpoints directly: `GET /api/admin/alerts`
4. Check browser/device console for frontend errors

---

**Happy Testing! 🌾🚀**

