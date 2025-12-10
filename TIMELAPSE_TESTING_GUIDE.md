# 🧪 TimeLapse Feature Testing Guide

Complete guide to test and verify the TimeLapse functionality is working properly.

## 📋 Prerequisites

1. **Backend Running**: Flask server should be running on port 5000
2. **Frontend Running**: React Native/Expo app should be running
3. **Database**: SQLite database should be initialized
4. **User Authentication**: You should be logged in as a farmer

---

## 🔧 Step 1: Backend Health Check

### Test Backend Connection
```bash
# In browser or Postman
GET http://172.20.10.3:5000/health

# Expected Response:
{
  "status": "healthy",
  "server": {
    "hostname": "...",
    "ip": "172.20.10.3",
    "port": 5000
  },
  "database": "connected",
  "message": "Backend is fully operational"
}
```

### Test TimeLapse Endpoints (with Auth Token)
```bash
# Get your auth token from AsyncStorage or login response
# Then test:

# 1. Get User Crops
GET http://172.20.10.3:5000/api/timelapse/crops
Headers: Authorization: Bearer YOUR_TOKEN

# Expected: List of crops or empty array
{
  "crops": [...]
}

# 2. Create a Crop (if none exist)
POST http://172.20.10.3:5000/api/timelapse/crops
Headers: 
  Authorization: Bearer YOUR_TOKEN
  Content-Type: application/json
Body:
{
  "name": "Test Wheat Field",
  "crop_type": "wheat"
}

# Expected: Created crop object
{
  "id": 1,
  "name": "Test Wheat Field",
  "crop_type": "wheat",
  ...
}
```

---

## 📱 Step 2: Frontend Testing Workflow

### A. Create a Crop (If Needed)

1. **Navigate to TimeLapse Upload**
   - Open the app
   - Go to Farmer Dashboard
   - Tap "Smart TimeLapse" button

2. **Create Crop**
   - If no crops exist, you'll see "No crops available"
   - Tap "Create Your First Crop" or "+ Create Crop"
   - Enter crop name (e.g., "Wheat Field A")
   - Select crop type (Wheat, Rice, or Cotton)
   - Tap "Create"
   - ✅ **Expected**: Crop is created and automatically selected

### B. Upload Photos

1. **Select Crop**
   - If crops exist, select one from the horizontal scroll
   - ✅ **Expected**: Selected crop has green border and light green background

2. **Take/Select Photos**
   - **Option 1: Camera**
     - Tap "Camera" tab
     - Tap "Take Photo"
     - Allow camera permission if prompted
     - Take photo
     - ✅ **Expected**: Photo appears in selected images
   
   - **Option 2: Gallery**
     - Tap "Gallery" tab
     - Tap "Pick from Gallery"
     - Select up to 3 photos
     - ✅ **Expected**: Photos appear in selected images (max 3)

3. **Add Notes (Optional)**
   - Type notes in the text input
   - e.g., "Sprayed today, noticed yellowing"

4. **Upload & Analyze**
   - Tap "Upload & Analyze" button
   - ✅ **Expected**:
     - Button shows "Uploading..." with spinner
     - Progress bar appears
     - After upload, AI detection result popup appears
     - Shows: Disease name, Severity, Confidence, Weather data

### C. View TimeLapse Dashboard

1. **Navigate to View**
   - After upload, or from dashboard, navigate to TimeLapse View
   - Pass `cropId` parameter

2. **Check Statistics Cards**
   - ✅ **Expected**: 3 main stat cards showing:
     - Total Scans
     - Avg Severity
     - Trend (Improving/Worsening/Stable)

3. **Check Additional Stats**
   - ✅ **Expected**: 4 additional stat cards:
     - Avg Temperature
     - Avg Humidity
     - AI Confidence
     - Top Disease

4. **Test Chart Tabs**
   - Tap different chart tabs:
     - **Severity**: Line chart showing severity scores over time
     - **Weather**: Dual-line chart (temperature + humidity)
     - **Disease**: Pie chart + Bar chart
     - **Confidence**: Line chart showing AI confidence
   - ✅ **Expected**: Charts switch smoothly, data displays correctly

5. **Test Playback**
   - Tap Play button
   - ✅ **Expected**: Images cycle through automatically (2s each)
   - Tap Pause to stop
   - ✅ **Expected**: Playback stops

6. **Test Timeline**
   - Scroll through timeline entries
   - ✅ **Expected**: Each entry shows:
     - Thumbnail image
     - Date
     - Disease name (if detected)
     - Severity chip (color-coded)
     - Weather badges (humidity, temperature)
   - Tap any entry
   - ✅ **Expected**: Modal opens with full image and details

7. **Test Upload FAB**
   - Tap floating camera button (bottom right)
   - ✅ **Expected**: Navigates to upload screen with cropId pre-selected

---

## 🔍 Step 3: Detailed Feature Testing

### Test 1: Multiple Uploads
1. Upload 3 different photos for the same crop
2. ✅ **Expected**: All 3 appear in timeline
3. ✅ **Expected**: Charts update with new data points

### Test 2: Weather Data
1. Check if weather data appears in entries
2. ✅ **Expected**: Temperature and humidity shown in timeline badges
3. ✅ **Expected**: Weather chart shows both lines

### Test 3: Disease Detection
1. Upload a photo with visible disease
2. ✅ **Expected**: Disease name appears in detection result
3. ✅ **Expected**: Severity is calculated (None/Mild/Moderate/Severe)
4. ✅ **Expected**: Confidence percentage shown

### Test 4: Prediction
1. Upload at least 2 entries
2. Check prediction card in Severity chart
3. ✅ **Expected**: Shows predicted severity for next week

### Test 5: Empty State
1. Navigate to TimeLapse View with no entries
2. ✅ **Expected**: Shows "Start Tracking!" message
3. ✅ **Expected**: "Upload First Photo" button visible

---

## 🐛 Step 4: Troubleshooting

### Issue: "No crops available" but can't create
**Solution:**
- Check console logs for API errors
- Verify backend is running
- Check authentication token is valid
- Test `/api/timelapse/crops` endpoint directly

### Issue: Upload button not working
**Solution:**
- Check console for errors
- Verify crop is selected (green border)
- Verify at least one image is selected
- Check network connection
- Verify backend `/api/timelapse/upload` endpoint

### Issue: Charts not showing
**Solution:**
- Verify entries exist (need at least 1 entry)
- Check console for chart rendering errors
- Verify `react-native-chart-kit` is installed
- Check data format matches chart requirements

### Issue: Images not loading
**Solution:**
- Verify backend IP is correct in `env.ts`
- Check image URLs are accessible
- Verify backend serves static files correctly
- Check CORS settings

### Issue: Weather data missing
**Solution:**
- Check `OPENWEATHER_API_KEY` in backend `.env`
- Verify user has latitude/longitude set
- Check backend logs for weather API errors

---

## 📊 Step 5: Backend API Testing (Postman/cURL)

### Test All Endpoints

```bash
# 1. Get Crops
curl -X GET "http://172.20.10.3:5000/api/timelapse/crops" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Create Crop
curl -X POST "http://172.20.10.3:5000/api/timelapse/crops" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Crop",
    "crop_type": "wheat"
  }'

# 3. Upload Timelapse (multipart form)
curl -X POST "http://172.20.10.3:5000/api/timelapse/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files[]=@/path/to/image.jpg" \
  -F "crop_id=1" \
  -F "notes=Test upload"

# 4. Get Timelapse Entries
curl -X GET "http://172.20.10.3:5000/api/timelapse/1" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 5. Get Prediction
curl -X GET "http://172.20.10.3:5000/api/timelapse/predict/1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ✅ Step 6: Checklist

### Backend
- [ ] Backend server running on port 5000
- [ ] Database initialized (SQLite)
- [ ] `/health` endpoint returns 200
- [ ] `/api/timelapse/crops` returns crops list
- [ ] `/api/timelapse/upload` accepts multipart files
- [ ] Weather API key configured
- [ ] Static files serving correctly

### Frontend
- [ ] App connects to backend (check console logs)
- [ ] Can create crop via modal
- [ ] Can select existing crop
- [ ] Camera permission works
- [ ] Gallery picker works
- [ ] Upload button functional
- [ ] Progress bar shows during upload
- [ ] Detection result popup appears
- [ ] TimeLapse view loads entries
- [ ] All 4 chart tabs work
- [ ] Charts display data correctly
- [ ] Playback works
- [ ] Timeline displays entries
- [ ] Entry modal opens on tap
- [ ] Upload FAB navigates correctly

### Data Flow
- [ ] Photos upload successfully
- [ ] AI detection runs (disease, severity, confidence)
- [ ] Weather data fetched and stored
- [ ] Entries saved to database
- [ ] Timeline shows all entries
- [ ] Charts update with new data
- [ ] Prediction calculates correctly

---

## 🎯 Quick Test Script

Run this in your browser console (when logged in):

```javascript
// Get token from AsyncStorage
const token = await AsyncStorage.getItem('authToken');

// Test 1: Get crops
fetch('http://172.20.10.3:5000/api/timelapse/crops', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json()).then(console.log);

// Test 2: Create crop
fetch('http://172.20.10.3:5000/api/timelapse/crops', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Test Crop',
    crop_type: 'wheat'
  })
}).then(r => r.json()).then(console.log);

// Test 3: Get timelapse entries (replace 1 with your crop_id)
fetch('http://172.20.10.3:5000/api/timelapse/1', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json()).then(console.log);
```

---

## 📝 Expected Console Logs

### Frontend (Good Signs)
```
🌾 Loading crops from: http://172.20.10.3:5000/api/timelapse/crops
✅ Crops loaded: 2 crops
🔘 Upload button pressed
📤 Uploading: { crop_id: 1, imageCount: 2, hasNotes: true }
📥 Response status: 201
✅ Upload success: { entries: [...], detection: {...} }
```

### Backend (Good Signs)
```
📥 Incoming POST /api/timelapse/upload
🌾 Creating crop: Test Crop wheat
✅ Crop created: {...}
📊 Disease detection: Rust (Moderate, 0.75 conf)
🌤️ Weather fetched: 25°C, 65% humidity
✅ Entry saved: id=1
```

---

## 🚨 Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| "Network request failed" | Wrong IP or backend down | Check IP in `env.ts`, verify backend running |
| "401 Invalid token" | Token expired | Re-login |
| "No file provided" | FormData issue | Check file upload format |
| "Crop not found" | Wrong crop_id | Verify crop exists for user |
| Charts empty | No data | Upload at least 1 entry |
| Weather null | API key missing | Add `OPENWEATHER_API_KEY` to `.env` |

---

## 🎉 Success Criteria

The TimeLapse feature is working properly if:

1. ✅ Can create crops via modal
2. ✅ Can upload photos (camera + gallery)
3. ✅ AI detection results appear after upload
4. ✅ Weather data is fetched and displayed
5. ✅ Timeline shows all entries with thumbnails
6. ✅ All 4 chart types display correctly
7. ✅ Playback cycles through images
8. ✅ Entry modal shows full details
9. ✅ Prediction appears in severity chart
10. ✅ Statistics cards show correct values

---

## 📞 Need Help?

If something doesn't work:
1. Check browser/console logs
2. Check backend terminal logs
3. Verify all prerequisites
4. Test API endpoints directly
5. Check network connectivity
6. Verify authentication token

Happy Testing! 🚀

