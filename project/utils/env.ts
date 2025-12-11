import Constants from 'expo-constants';
import { Platform } from 'react-native';

type ExtraConfig = {
  API_BASE_URL?: string;
};

/**
 * Get the backend API URL - Always uses backend server's network IP
 */
export function getApiBaseUrl(): string {
  // Smart IP detection for different environments
  let BACKEND_NETWORK_IP: string;
  
  if (__DEV__) {
    // Development mode - use appropriate IP based on platform
    if (Platform.OS === 'android') {
      // Android Emulator uses 10.0.2.2 to reach host machine
      // For physical Android device, use actual network IP
      BACKEND_NETWORK_IP = '172.15.85.214'; // Your current network IP
    } else if (Platform.OS === 'ios') {
      // iOS Simulator can use localhost
      // For physical iOS device, use actual network IP
      BACKEND_NETWORK_IP = '172.15.85.214'; // Your current network IP
    } else {
      // Web or other platforms
      BACKEND_NETWORK_IP = '172.15.85.214';
    }
  } else {
    // Production - use configured IP
    BACKEND_NETWORK_IP = Constants.expoConfig?.extra?.API_BASE_URL?.replace('http://', '').replace(':5000', '') || '172.15.85.214';
  }
  
  const url = `http://${BACKEND_NETWORK_IP}:5000`;
  console.log('📡 Using Backend Network IP:', url, `(Platform: ${Platform.OS})`);
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


