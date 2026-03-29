# 🚀 Quick Start Guide - Run Mobile App

## Current Issue: Wrong Directory

You're currently in: `D:\Crop_Disease_Detect\AgriSmart`
You need to be in: `D:\Crop_Disease_Detect\AgriSmart\project`

---

## ✅ Correct Steps

### Step 1: Navigate to Project Directory

```bash
cd project
```

### Step 2: Install Dependencies (First Time Only)

```bash
npm install
```

Wait for installation to complete (may take 2-5 minutes).

### Step 3: Run the App

**For Android Studio:**
```bash
npm run android
```

**Or start Expo dev server:**
```bash
npm run dev:online
```

---

## 📋 Complete Command Sequence

```bash
# Navigate to project directory
cd project

# Install dependencies (first time only)
npm install

# Prebuild Android (first time only)
npx expo prebuild --platform android

# Run on Android Studio emulator
npm run android
```

---

## 🎯 What You Should See

After running `npm run android`:
- ✅ Metro bundler starts
- ✅ Android Studio builds the app
- ✅ App installs on Pixel 8 emulator
- ✅ App launches automatically

---

## ⚠️ Important Notes

1. **Backend must be running** in a separate terminal
2. **Navigate to `project/` folder** before running npm commands
3. **First build takes longer** (3-5 minutes)
4. **Keep backend terminal running** while app runs

---

## 🔧 If Still Having Issues

Make sure you're in the right directory:
```bash
# Check current directory
pwd  # or 'cd' on Windows

# Should show: D:\Crop_Disease_Detect\AgriSmart\project

# Check if package.json exists
dir package.json  # Windows
# or
ls package.json    # Mac/Linux
```

If `package.json` exists, you're in the right place! ✅
