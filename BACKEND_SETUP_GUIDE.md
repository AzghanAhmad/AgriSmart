# 🚀 Backend Setup & Connection Guide

## ⚡ Quick Start (Do This First!)

### 1️⃣ Install Backend Dependencies

```bash
# Navigate to Backend directory
cd Backend

# Install Python packages
pip install -r requirements.txt
```

### 2️⃣ Start Backend Server

```bash
# Make sure you're in the Backend directory
python app.py
```

**Expected Output:**
```
 * Running on http://0.0.0.0:5000
 * Running on http://192.168.18.94:5000
```

✅ If you see this, your backend is running!

---

## 📱 Connect Mobile App to Backend

### Your Backend IP Addresses:

Your computer has these IPs:
- `192.168.56.1` (VirtualBox/Hyper-V network)
- **`192.168.18.94`** ← **Use this one! (Your WiFi network)**
- `192.168.96.1` (Another virtual network)

### Current Configuration:

The mobile app is now configured to automatically use: **`http://192.168.18.94:5000`**

This works for:
- ✅ Android Emulator
- ✅ Physical Android/iOS devices on same WiFi
- ✅ iOS Simulator (will try this first, then fallback)

---

## 🔍 Troubleshooting

### Problem: "Network request failed"

**Check 1: Backend is Running**
```bash
# In Backend directory
python app.py
```
Should show: `Running on http://0.0.0.0:5000`

**Check 2: Test Backend from Browser**
Open in browser: `http://192.168.18.94:5000`

You should see: `{"message": "🌾 AgriSmart Backend is Running"}`

**Check 3: Firewall**
Windows Firewall might block port 5000. Allow Python through:
1. Windows Defender Firewall → Allow an app
2. Find Python → Check both Private and Public networks

**Check 4: Your IP Changed**
If you connect to different WiFi, your IP changes:
```bash
# Check current IP
ipconfig | findstr IPv4
```

If IP changed from `192.168.18.94`, update `project/utils/env.ts`:
```typescript
const BACKEND_NETWORK_IP = 'YOUR_NEW_IP_HERE';
```

---

## 🎯 Different Connection Scenarios

### Scenario 1: Using Android Emulator (on same PC)
**App will use:** `http://192.168.18.94:5000`
**Why it works:** Emulator can access host machine's network IPs

### Scenario 2: Using Physical Phone (same WiFi)
**App will use:** `http://192.168.18.94:5000`
**Requirements:**
- Phone connected to same WiFi as computer
- Windows Firewall allows port 5000

### Scenario 3: Using iOS Simulator (on Mac)
**App will use:** `http://127.0.0.1:5000` (if available) or `http://192.168.18.94:5000`

### Scenario 4: Custom IP Override
Set environment variable:
```bash
# In project directory
export EXPO_PUBLIC_API_BASE_URL=http://YOUR_CUSTOM_IP:5000
```

---

## 🧪 Test Connection

### From Terminal:
```bash
# Test if backend is accessible
curl http://192.168.18.94:5000/
```

Should return: `{"message":"🌾 AgriSmart Backend is Running"}`

### From Mobile App:
The app now automatically tests the connection on startup and logs to console:
- ✅ `Backend is accessible` - Connection successful!
- ❌ `Backend connection failed` - See troubleshooting steps

---

## 📝 Backend Environment Variables (Optional)

Create `Backend/.env` file:
```env
# Database (optional - defaults to SQLite)
DATABASE_URL=sqlite:///agrismart.db

# CORS (optional - defaults to allow all in dev)
ALLOWED_ORIGINS=*

# Upload directory (optional)
UPLOAD_ROOT=static/uploads

# Secret key for JWT tokens
SECRET_KEY=your-secret-key-here
```

---

## 🔄 Common Issues & Solutions

### Issue 1: Port 5000 Already in Use
```bash
# Kill process using port 5000 (Windows)
netstat -ano | findstr :5000
taskkill /PID <PID_NUMBER> /F
```

### Issue 2: ModuleNotFoundError
```bash
# Reinstall dependencies
cd Backend
pip install -r requirements.txt
```

### Issue 3: YOLO Model Not Found
Make sure model files exist:
```
Backend/models/wheat/best.pt
Backend/models/rice/best.pt
Backend/models/cotton/best.pt
```

### Issue 4: Database Error
Delete and recreate:
```bash
# Remove old database
rm Backend/agrismart.db

# Restart backend (will create fresh DB)
python Backend/app.py
```

---

## 📊 Verify Everything Works

### Test Checklist:
- [ ] Backend starts without errors
- [ ] Browser can access `http://192.168.18.94:5000`
- [ ] Mobile app shows "Backend is accessible" in console
- [ ] Can create account in mobile app
- [ ] Can login successfully
- [ ] Disease detection works

---

## 💡 Pro Tips

1. **Keep Backend Running:** Backend must be running while testing mobile app
2. **Check Logs:** Backend prints helpful logs - watch the terminal
3. **WiFi Network:** Ensure phone and PC on same WiFi for physical device testing
4. **Restart After Changes:** Restart backend after code changes
5. **Clear App Cache:** If issues persist, clear app data and restart

---

## 🆘 Still Having Issues?

1. Check Backend logs in terminal
2. Check Mobile app logs (Metro bundler console)
3. Try accessing backend from browser first
4. Verify firewall isn't blocking port 5000
5. Confirm IP address hasn't changed

---

**Last Updated:** December 2024  
**Your Backend IP:** 192.168.18.94  
**Backend Port:** 5000

