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
    let data: any = {};
    let isJson = false;
    try {
      data = text ? JSON.parse(text) : {};
      isJson = true;
    } catch {
      isJson = false;
    }
    
    if (!res.ok) {
      // Handle 401 Unauthorized - clear invalid token
      if (res.status === 401) {
        // Clear invalid token from storage
        AsyncStorage.removeItem('authToken').catch(() => {});
        AsyncStorage.removeItem('user').catch(() => {});
      }
      const plainText = (text || '').trim();
      const fallback = plainText ? plainText.slice(0, 240) : `Request failed (${res.status})`;
      const message = typeof data?.error === 'string' ? data.error : fallback;
      throw new Error(message);
    }

    if (!isJson) {
      const plainText = (text || '').trim();
      throw new Error(
        `Server returned non-JSON response from ${fullUrl}${plainText ? `: ${plainText.slice(0, 240)}` : ''}`
      );
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

export async function apiPut<T = any>(path: string, body?: any, headers?: Record<string, string>): Promise<T> {
  return apiJson<T>(path, { method: 'PUT', body, headers });
}

export async function apiPatch<T = any>(path: string, body?: any, headers?: Record<string, string>): Promise<T> {
  return apiJson<T>(path, { method: 'PATCH', body, headers });
}

export async function apiDelete<T = any>(path: string, headers?: Record<string, string>): Promise<T> {
  return apiJson<T>(path, { method: 'DELETE', headers });
}

/**
 * Multipart profile photo upload (React Native: append { uri, name, type }).
 */
export async function apiUploadProfilePhoto(localUri: string): Promise<unknown> {
  const base = getApiBaseUrl();
  const fullUrl = `${base}/api/auth/profile-photo`;
  const token = await AsyncStorage.getItem('authToken');
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const nameGuess = localUri.split(/[/\\]/).pop() || 'profile.jpg';
  const ext = nameGuess.toLowerCase();
  const mime = ext.endsWith('.png') ? 'image/png' : 'image/jpeg';

  const form = new FormData();
  form.append('photo', { uri: localUri, name: nameGuess, type: mime } as unknown as Blob);

  console.log(`🌐 API Request: POST ${fullUrl} (multipart)`);

  const res = await fetch(fullUrl, { method: 'POST', headers, body: form });
  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: 'Invalid JSON response' };
  }

  if (!res.ok) {
    if (res.status === 401) {
      AsyncStorage.removeItem('authToken').catch(() => {});
      AsyncStorage.removeItem('user').catch(() => {});
    }
    const message = typeof data?.error === 'string' ? data.error : `Request failed (${res.status})`;
    throw new Error(message);
  }
  if (data?.error) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Request failed');
  }
  return data;
}
