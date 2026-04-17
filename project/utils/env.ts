import Constants from 'expo-constants';
import { Platform } from 'react-native';

type ExtraConfig = {
  API_BASE_URL?: string;
};

/** Normalize app config / env string into `http://host:port` (no trailing slash). */
function normalizeApiBaseUrl(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  let u = raw.trim();
  if (!/^https?:\/\//i.test(u)) u = `http://${u}`;
  return u.replace(/\/$/, '');
}

/**
 * Backend base URL used by all API calls.
 *
 * Priority:
 * 1. `EXPO_PUBLIC_API_BASE_URL` (e.g. in `.env` for Expo)
 * 2. `expo.extra.API_BASE_URL` in app.json / app.config
 * 3. Dev fallbacks: Android emulator → 10.0.2.2, iOS simulator → localhost, web → localhost
 *
 * On a **physical phone**, set `extra.API_BASE_URL` to your PC's LAN IP, e.g. `http://192.168.1.50:5000`.
 */
export function getApiBaseUrl(): string {
  const fromEnv = normalizeApiBaseUrl(
    typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_API_BASE_URL : undefined,
  );
  if (fromEnv) {
    console.log('📡 API base (EXPO_PUBLIC_API_BASE_URL):', fromEnv, `(Platform: ${Platform.OS})`);
    return fromEnv;
  }

  const extraRaw = (Constants.expoConfig?.extra as ExtraConfig | undefined)?.API_BASE_URL;
  const fromExtra = normalizeApiBaseUrl(extraRaw);
  if (fromExtra) {
    console.log('📡 API base (app.json extra.API_BASE_URL):', fromExtra, `(Platform: ${Platform.OS})`);
    return fromExtra;
  }

  if (__DEV__) {
    if (Platform.OS === 'android') {
      const url = 'http://10.0.2.2:5000';
      console.warn(
        '📡 API base (Android emulator default):',
        url,
        '— on a real phone set app.json extra.API_BASE_URL to your PC IP',
      );
      return url;
    }
    if (Platform.OS === 'ios') {
      const url = 'http://localhost:5000';
      console.log('📡 API base (iOS simulator default):', url);
      return url;
    }
    const url = 'http://localhost:5000';
    console.log('📡 API base (web/default):', url);
    return url;
  }

  const lastResort = 'http://192.168.137.190:5000';
  console.warn('📡 API base: set extra.API_BASE_URL for production; using', lastResort);
  return lastResort;
}

/**
 * Test if the backend is accessible
 * Call this on app startup to verify connection
 */
export async function testBackendConnection(): Promise<boolean> {
  try {
    const baseUrl = getApiBaseUrl();
    console.log('🔍 Testing backend connection to:', baseUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Backend is accessible!');
    console.log('   Status:', data.status);
    console.log('   Server IP:', data.server?.ip);
    console.log('   Message:', data.message);
    return true;
  } catch (error: any) {
    console.error('❌ Backend connection failed:', error.message);
    console.error('');
    console.error('🔧 Troubleshooting Steps:');
    console.error('   1. Start backend: cd Backend && python app.py');
    console.error('   2. Backend should listen on 0.0.0.0:5000');
    console.error('   3. Set app.json extra.API_BASE_URL to your PC IP, e.g. http://192.168.x.x:5000');
    console.error('   4. Physical device: same Wi‑Fi as PC; Windows Firewall allow port 5000');
    console.error('   5. Android emulator: use http://10.0.2.2:5000 (default if extra unset)');
    console.error('');
    console.error(`📍 Current API URL: ${getApiBaseUrl()}`);
    return false;
  }
}
