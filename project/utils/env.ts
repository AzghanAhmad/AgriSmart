import Constants from 'expo-constants';
import { Platform } from 'react-native';

type ExtraConfig = {
  API_BASE_URL?: string;
};

// Helper to get local network IP for physical devices
function getLocalNetworkIP(): string | null {
  // This will be null on emulators/simulators
  // For physical devices, you'll need to set EXPO_PUBLIC_API_BASE_URL or use your computer's IP
  return null;
}

export function getApiBaseUrl(): string {
  // Priority 1: EXPO_PUBLIC_ env at build/runtime (use this for physical devices)
  const publicEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (publicEnv && publicEnv.trim().length > 0) {
    console.log('📡 Using API URL from EXPO_PUBLIC_API_BASE_URL:', publicEnv.trim());
    return publicEnv.trim();
  }

  // Priority 2: app.json extra (deprecated - removed hardcoded value)
  const extra = (Constants?.expoConfig?.extra || {}) as ExtraConfig;
  if (extra.API_BASE_URL && extra.API_BASE_URL.trim().length > 0) {
    console.log('📡 Using API URL from app.json:', extra.API_BASE_URL.trim());
    return extra.API_BASE_URL.trim();
  }

  // Priority 3: Platform-specific defaults
  if (Platform.OS === 'android') {
    // Android emulator uses special loopback address
    const url = 'http://10.0.2.2:5000';
    console.log('📡 Using Android emulator API URL:', url);
    return url;
  }
  
  if (Platform.OS === 'ios') {
    // iOS simulator can use localhost
    const url = 'http://127.0.0.1:5000';
    console.log('📡 Using iOS simulator API URL:', url);
    return url;
  }
  
  // Web/fallback
  const url = 'http://127.0.0.1:5000';
  console.log('📡 Using default API URL:', url);
  return url;
}


