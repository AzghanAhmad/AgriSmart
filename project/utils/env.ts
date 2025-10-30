import Constants from 'expo-constants';
import { Platform } from 'react-native';

type ExtraConfig = {
  API_BASE_URL?: string;
};

export function getApiBaseUrl(): string {
  // Priority 1: EXPO_PUBLIC_ env at build/runtime
  const publicEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (publicEnv && publicEnv.trim().length > 0) return publicEnv.trim();

  // Priority 2: app.json extra
  const extra = (Constants?.expoConfig?.extra || {}) as ExtraConfig;
  if (extra.API_BASE_URL && extra.API_BASE_URL.trim().length > 0) {
    return extra.API_BASE_URL.trim();
  }

  // Priority 3: Sensible local defaults per platform
  if (Platform.OS === 'android') {
    // Android emulator loopback
    return 'http://10.0.2.2:5000';
  }
  // iOS simulator / web
  return 'http://127.0.0.1:5000';
}


