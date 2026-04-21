import { Platform } from 'react-native';

// Single source of truth for the backend URL.
// Android Emulator must use 10.0.2.2 to reach your laptop localhost.
const API_BASE_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:5000'
  : 'http://127.0.0.1:5000';

/**
 * Get the backend API URL - Always uses backend server's network IP
 */
export function getApiBaseUrl(): string {
  console.log('📡 Using API URL from env.ts constant:', API_BASE_URL, `(Platform: ${Platform.OS})`);
  return API_BASE_URL;
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
    console.error(`   3. Test in browser:  ${API_BASE_URL}/health`);
    console.error('   4. Verify IP unchanged: ipconfig | findstr IPv4');
    console.error('   5. Check Windows Firewall allows port 5000');
    console.error('   6. Ensure same WiFi network (if using physical device)');
    console.error('');
    console.error(`📍 Current API URL: ${getApiBaseUrl()}`);
    return false;
  }
}


