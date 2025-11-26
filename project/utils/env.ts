import Constants from 'expo-constants';
import { Platform } from 'react-native';

type ExtraConfig = {
  API_BASE_URL?: string;
};

/**
 * Get the backend API URL - Always uses backend server's network IP
 */
export function getApiBaseUrl(): string {
  // ALWAYS use backend server's actual network IP
  // This IP works for physical devices on the same WiFi network AND emulators
  const BACKEND_NETWORK_IP = '192.168.142.26';
  const url = `http://${BACKEND_NETWORK_IP}:5000`;
  console.log('📡 Using Backend Network IP:', url);
  return url;
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
    console.error('❌ Backend connection failed:', error.message);
    console.error('');
    console.error('🔧 Troubleshooting Steps:');
    console.error('   1. Start backend: cd Backend && python app.py');
    console.error('   2. Check backend shows "Running on http://0.0.0.0:5000"');
    console.error('   3. Test in browser: http://192.168.18.94:5000/health');
    console.error('   4. Verify IP unchanged: ipconfig | findstr IPv4');
    console.error('   5. Check Windows Firewall allows port 5000');
    console.error('   6. Ensure same WiFi network (if using physical device)');
    console.error('');
    console.error(`📍 Current API URL: ${getApiBaseUrl()}`);
    return false;
  }
}


