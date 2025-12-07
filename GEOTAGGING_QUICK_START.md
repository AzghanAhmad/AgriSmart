# Geotagging & Heatmap - Quick Start 🚀

## 1. Run Database Migration (REQUIRED)

```bash
cd Backend
python migrate_db.py
```

**What it does**: Adds latitude/longitude columns to Users and Detections tables, creates OutbreakAlerts table.

---

## 2. Start Backend

```bash
cd Backend
start-complete.bat
```

Or:

```bash
python app.py
```

**Note your IP** from the startup message (e.g., `192.168.100.15`)

---

## 3. Update Frontend IP

Edit `project/utils/env.ts` line 14:

```ts
const BACKEND_NETWORK_IP = '192.168.100.15';  // Your actual IP
```

---

## 4. Start Frontend

```bash
cd project
npm run dev
```

---

## 5. Test the Feature

### A. Signup with Location

1. Open app → Signup
2. Fill in details
3. **Tap the GPS icon** next to location field
4. Grant location permission
5. Coordinates will be captured automatically

### B. Create Detections

1. Login as farmer
2. Go to Disease Detection
3. Upload 3 crop images with **same disease**
4. Make sure location permission is granted
5. After 3rd detection → **Outbreak Alert** created!

### C. Approve Alert (Admin)

1. Login as admin
2. Go to Dashboard
3. See **Outbreak Alerts** section
4. Tap **Approve** button
5. Alert is now approved!

### D. View Heatmap

1. Go to Heatmap tab
2. On **device/emulator**: See real Pakistan map with disease circles
3. On **web**: See placeholder (maps not supported in Expo Go web)

---

## Troubleshooting

### "Invalid JSON response"
→ Run migration: `python migrate_db.py`

### "Network request failed"
→ Update IP in `project/utils/env.ts`

### "react-native-maps installation error"
→ Use device/emulator, not Expo Go web

### Location not captured
→ Grant location permission in app settings

---

## Feature Summary

✅ **Users** can signup with GPS coordinates  
✅ **Detections** capture location automatically  
✅ **Outbreak alerts** created when 3+ same disease within 10km & 2 weeks  
✅ **Admin** can approve alerts  
✅ **Heatmap** displays approved outbreaks on Pakistan map  

---

## Files Changed

### Backend
- `schemas/user.py` - Added lat/lng
- `schemas/detection.py` - Added lat/lng, alert_generated
- `routes/auth.py` - Accept coordinates
- `routes/farmer.py` - Outbreak detection
- `routes/admin.py` - Alert approval
- `migrate_db.py` - Migration script

### Frontend
- `app/auth/signup.tsx` - GPS button
- `app/(farmer)/heatmap.tsx` - Real map
- `app/(admin)/index.tsx` - Alerts section
- `hooks/useAdmin.ts` - Alert hooks

---

For detailed docs, see: `Backend/GEOTAGGING_HEATMAP_SETUP.md`

