# 🔧 Fix "Unable to resolve manifest assets" Warning

This warning is usually harmless but can be fixed by clearing caches.

## Quick Fix Steps:

### Option 1: Clear Metro Bundler Cache (Recommended)

1. **Stop the Expo dev server** (Ctrl+C)

2. **Clear Metro cache:**
   ```bash
   cd project
   npx expo start --clear
   ```

### Option 2: Full Cache Clear

1. **Stop the Expo dev server**

2. **Clear all caches:**
   ```bash
   cd project
   
   # Clear Metro bundler cache
   npx expo start --clear
   
   # Or manually clear:
   rm -rf node_modules/.cache
   rm -rf .expo
   ```

### Option 3: Reset Everything (If above doesn't work)

```bash
cd project

# Clear all caches
rm -rf node_modules/.cache
rm -rf .expo
rm -rf .expo-shared

# Reinstall dependencies (optional)
npm install

# Start fresh
npx expo start --clear
```

## Why This Happens:

- Metro bundler cache can become stale
- Expo's asset manifest cache can get corrupted
- Development server needs to rebuild asset manifest

## Note:

This warning **doesn't affect app functionality** - icons and fonts from `lucide-react-native` and `@expo/vector-icons` will still work. It's just a development warning about the app icon/favicon resolution.

