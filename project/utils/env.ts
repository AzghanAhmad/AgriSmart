import Constants from 'expo-constants';
import { Platform } from 'react-native';

type ExtraConfig = {
  API_BASE_URL?: string;
};

/**
 * Get the backend API URL - Always uses backend server's network IP
 */
export function getApiBaseUrl(): string {
  // FIX: prefer runtime env value so mobile + backend can be switched without code edits
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (envUrl) {
    console.log('📡 Using API URL from EXPO_PUBLIC_API_BASE_URL:', envUrl, `(Platform: ${Platform.OS})`);
    return envUrl;
  }

  // Fallback to app config extra value if provided
  const extraUrl = Constants.expoConfig?.extra?.API_BASE_URL?.trim();
  if (extraUrl) {
    console.log('📡 Using API URL from app config extra:', extraUrl, `(Platform: ${Platform.OS})`);
    return extraUrl;
  }

  // Last-resort fallback
  const fallback = 'http://192.168.100.15:5000';
  console.log('📡 Using fallback backend URL:', fallback, `(Platform: ${Platform.OS})`);
  return fallback;
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
    // FIX: mobile devices and first backend response can be slower than 5s
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
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
    const message = error?.name === 'AbortError'
      ? 'Connection timed out after 15s'
      : (error?.message || 'Unknown error');
    console.error('❌ Backend connection failed:', message);
    console.error('');
    console.error('🔧 Troubleshooting Steps:');
    console.error('   1. Start backend: cd Backend && python app.py');
    console.error('   2. Check backend shows "Running on http://0.0.0.0:5000"');
    console.error('   3. Test in browser: http://192.168.100.15:5000/health');
    console.error('   4. Verify IP unchanged: ipconfig | findstr IPv4');
    console.error('   5. Check Windows Firewall allows port 5000');
    console.error('   6. Ensure same WiFi network (if using physical device)');
    console.error('');
    console.error(`📍 Current API URL: ${getApiBaseUrl()}`);
    return false;
  }
}


