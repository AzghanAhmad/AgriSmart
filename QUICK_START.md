# ⚡ AgriSmart - Quick Start Guide

## 🎯 Start Backend (Required First!)

### Option 1: Double-click (Easy!)
```
Double-click: Backend/start-backend.bat
```

### Option 2: Manual (Terminal)
```bash
cd Backend
python app.py
```

**✅ Success looks like:**
```
* Running on http://0.0.0.0:5000
* Running on http://192.168.18.94:5000  ← Your WiFi IP
```

---

## 📱 Start Mobile App

```bash
cd project
npm run dev
```

Then press **'a'** for Android or **'i'** for iOS

---

## 🔍 Verify Connection

### Test Backend in Browser:
Open: `http://192.168.18.94:5000/health`

**Should show:**
```json
{
  "status": "healthy",
  "message": "Backend is fully operational"
}
```

### Test in Mobile App:
Look for console logs:
- ✅ `Backend is accessible!` = Good!
- ❌ `Backend connection failed` = See troubleshooting below

---

## 🚨 Quick Troubleshooting

### Problem: Network request failed

**Fix 1:** Is backend running?
```bash
# Start it!
cd Backend
python app.py
```

**Fix 2:** Test backend in browser
- Open: `http://192.168.18.94:5000/health`
- If this fails, backend isn't accessible

**Fix 3:** Check your IP (might have changed)
```bash
ipconfig | findstr IPv4
```
If IP changed from `192.168.18.94`, update `project/utils/env.ts` line 27:
```typescript
const BACKEND_NETWORK_IP = 'YOUR_NEW_IP';
```

**Fix 4:** Firewall blocking port 5000
- Windows Defender Firewall → Allow an app → Python
- Allow both Private and Public networks

**Fix 5:** Different WiFi network
- Connect phone and PC to same WiFi
- Or use emulator (works with any WiFi)

---

## 📊 Current Configuration

**Backend:**
- IP: `192.168.18.94` (your WiFi network)
- Port: `5000`
- Full URL: `http://192.168.18.94:5000`

**Mobile App:**
- Auto-configured to use: `http://192.168.18.94:5000`
- Works for emulators AND physical devices
- Tests connection automatically on startup

---

## 🎓 First Time Setup

### Backend Setup (one time):
```bash
cd Backend
pip install -r requirements.txt
```

### Mobile App Setup (one time):
```bash
cd project
npm install
```

---

## 💡 Pro Tips

1. **Always start backend before mobile app**
2. **Watch terminal logs** - they tell you what's happening
3. **Same WiFi** - Phone and PC must be on same network
4. **Emulator easier** - Doesn't need same WiFi
5. **Clear cache** - If stuck, stop app and restart

---

## 📝 Common Tasks

### Create new account:
1. Open app → Signup
2. Fill form → Choose role (farmer/admin)
3. Submit

### Test disease detection:
1. Login as farmer
2. Tap "Scan" tab
3. Select crop (Wheat/Rice/Cotton)
4. Take photo or upload
5. Wait for AI analysis

### View admin dashboard:
1. Login as admin
2. See statistics and charts
3. View all detections

---

## 🆘 Still Not Working?

1. **Check Backend logs** - Look for errors in terminal
2. **Check App logs** - Look for errors in Metro bundler
3. **Test backend URL** - Try in browser first
4. **Restart everything** - Stop both backend and app, start again
5. **Read full guide** - Open `BACKEND_SETUP_GUIDE.md`

---

**Need help?** Check `BACKEND_SETUP_GUIDE.md` for detailed troubleshooting!

