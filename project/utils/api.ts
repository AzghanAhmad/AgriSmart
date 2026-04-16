import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl } from './env';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem('authToken');
  const headers: Record<string, string> = { 'Accept': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function apiJson<T = any>(path: string, options: { method?: HttpMethod; body?: any; headers?: Record<string, string> } = {}): Promise<T> {
  const base = getApiBaseUrl();
  const fullUrl = `${base}${path}`;
  
  console.log(`🌐 API Request: ${options.method || 'GET'} ${fullUrl}`);
  
  try {
    const headers = { ...(await getAuthHeaders()), 'Content-Type': 'application/json', ...(options.headers || {}) };
    
    const res = await fetch(fullUrl, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    
    console.log(`✅ API Response: ${res.status} ${res.statusText}`);
    
    const text = await res.text();
    let data: any;
    try { 
      data = text ? JSON.parse(text) : {}; 
    } catch { 
      data = { error: 'Invalid JSON response' }; 
    }
    
    if (!res.ok) {
      // Handle 401 Unauthorized - clear invalid token
      if (res.status === 401) {
        // Clear invalid token from storage
        AsyncStorage.removeItem('authToken').catch(() => {});
        AsyncStorage.removeItem('user').catch(() => {});
      }
      const message = typeof data?.error === 'string' ? data.error : `Request failed (${res.status})`;
      throw new Error(message);
    }
    
    if (data?.error) {
      const message = typeof data?.error === 'string' ? data.error : `Request failed`;
      throw new Error(message);
    }
    
    return data as T;
  } catch (error: any) {
    console.error(`❌ API Error:`, error);
    
    // Handle network errors (connection refused, timeout, etc.)
    if (error.message && (
      error.message.includes('Network request failed') ||
      error.message.includes('Failed to fetch') ||
      error.message.includes('NetworkError') ||
      error.message.includes('TypeError') ||
      error.message.includes('Network request failed') ||
      error.code === 'NETWORK_ERROR' ||
      error.name === 'TypeError'
    )) {
      let helpfulMessage = `Network error: Unable to connect to server at ${base}\n\n`;
      // DEBUG: include the exact path URL attempted on-device
      helpfulMessage += `Attempted URL: ${fullUrl}\n\n`;
      
      if (base.includes('127.0.0.1') || base.includes('localhost')) {
        helpfulMessage += `If you're using a physical device, you need to use your computer's IP address.\n`;
        helpfulMessage += `Set EXPO_PUBLIC_API_BASE_URL=http://YOUR_COMPUTER_IP:5000\n\n`;
        helpfulMessage += `Find your IP:\n`;
        helpfulMessage += `- Windows: ipconfig (look for IPv4 Address)\n`;
        helpfulMessage += `- Mac/Linux: ifconfig or ip addr`;
      } else if (base.includes('10.0.2.2')) {
        helpfulMessage += `Make sure:\n`;
        helpfulMessage += `1. You're using Android Emulator (not physical device)\n`;
        helpfulMessage += `2. Backend is running on your computer\n`;
        helpfulMessage += `3. Backend is accessible at http://127.0.0.1:5000 on your computer`;
      }
      
      throw new Error(helpfulMessage);
    }
    
    // Re-throw other errors as-is
    throw error;
  }
}

export async function apiGet<T = any>(path: string, headers?: Record<string, string>): Promise<T> {
  return apiJson<T>(path, { method: 'GET', headers });
}

export async function apiPost<T = any>(path: string, body?: any, headers?: Record<string, string>): Promise<T> {
  return apiJson<T>(path, { method: 'POST', body, headers });
}


