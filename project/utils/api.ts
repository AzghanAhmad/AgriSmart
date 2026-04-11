import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getApiBaseUrl } from './env';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Expired/invalid session is normal on cold start; do not log as ERROR. */
function isExpectedAuthFailure(error: unknown): boolean {
  const msg = String((error as Error)?.message || '').toLowerCase();
  return (
    msg.includes('token expired') ||
    msg.includes('token has expired') ||
    msg.includes('jwt expired') ||
    msg.includes('invalid token') ||
    msg.includes('unauthorized') ||
    msg.includes('request failed (401)') ||
    msg.includes('not authenticated') ||
    msg.includes('session expired')
  );
}

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
      data = {
        error: `Invalid response (${res.status}). Is the backend running at ${base}? If you see HTML or a proxy page, check EXPO_PUBLIC_API_BASE_URL / network IP in project/utils/env.ts.`,
      }; 
    }
    
    if (!res.ok) {
      // Handle 401 Unauthorized - clear invalid token
      if (res.status === 401) {
        // Clear invalid token from storage
        AsyncStorage.removeItem('authToken').catch(() => {});
        AsyncStorage.removeItem('user').catch(() => {});
      }
      const message =
        typeof data?.error === 'string'
          ? data.error
          : res.status === 404
            ? `Not found (${res.status}). Check that the API includes this route (e.g. restart Flask after updating Backend). URL: ${fullUrl}`
            : `Request failed (${res.status})`;
      throw new Error(message);
    }
    
    if (data?.error) {
      const message = typeof data?.error === 'string' ? data.error : `Request failed`;
      throw new Error(message);
    }
    
    return data as T;
  } catch (error: any) {
    if (!isExpectedAuthFailure(error)) {
      console.error(`❌ API Error:`, error);
    }
    
    const errMsg = String(error?.message ?? error ?? '');
    // Handle network errors (connection refused, timeout, cleartext blocks, etc.)
    if (
      errMsg.includes('Network request failed') ||
      errMsg.includes('Failed to fetch') ||
      errMsg.includes('NetworkError') ||
      errMsg.includes('TypeError') ||
      error?.code === 'NETWORK_ERROR' ||
      error?.name === 'TypeError'
    ) {
      let helpfulMessage = `Network error: Unable to connect to server at ${base}\n\n`;

      if (base.includes('127.0.0.1') || base.includes('localhost')) {
        helpfulMessage += `If you're using a physical device, use your computer's LAN IP (not localhost).\n`;
        helpfulMessage += `Set EXPO_PUBLIC_API_BASE_URL=http://YOUR_PC_IP:5000 in .env or app.json extra.API_BASE_URL.\n\n`;
        helpfulMessage += `Windows: ipconfig → IPv4 Address.\n`;
      } else if (base.includes('10.0.2.2')) {
        helpfulMessage += `Android emulator only:\n`;
        helpfulMessage += `1. Backend running on your PC\n`;
        helpfulMessage += `2. Backend reachable at http://127.0.0.1:5000 on the PC\n`;
      } else {
        helpfulMessage += `Check:\n`;
        helpfulMessage += `• Phone and PC on the same Wi‑Fi\n`;
        helpfulMessage += `• Backend running: python app.py (listen on 0.0.0.0:5000)\n`;
        helpfulMessage += `• Windows Firewall: allow inbound TCP port 5000\n`;
        if (base.startsWith('http://')) {
          helpfulMessage += `• Android blocks plain HTTP unless allowed: app.json has usesCleartextTraffic — rebuild app (expo run:android) after changing it; Expo Go may still block on some devices.\n`;
        }
        helpfulMessage += `• If your PC IP changed, update app.json "extra.API_BASE_URL" or EXPO_PUBLIC_API_BASE_URL and restart Expo.\n`;
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

export async function apiPatch<T = any>(path: string, body?: any, headers?: Record<string, string>): Promise<T> {
  return apiJson<T>(path, { method: 'PATCH', body, headers });
}

export async function apiPut<T = any>(path: string, body?: any, headers?: Record<string, string>): Promise<T> {
  return apiJson<T>(path, { method: 'PUT', body, headers });
}

export async function apiDelete<T = any>(path: string, headers?: Record<string, string>): Promise<T> {
  return apiJson<T>(path, { method: 'DELETE', headers });
}

/** Multipart upload; does not use apiJson (no JSON body). */
export async function apiUploadProfilePhoto(localUri: string): Promise<any> {
  const base = getApiBaseUrl();
  const fullUrl = `${base}/api/auth/profile/photo`;
  const token = await AsyncStorage.getItem('authToken');
  const formData = new FormData();
  if (Platform.OS === 'web') {
    const resBlob = await fetch(localUri);
    const blob = await resBlob.blob();
    formData.append('file', blob, 'avatar.jpg');
  } else {
    formData.append('file', {
      uri: localUri,
      name: 'avatar.jpg',
      type: 'image/jpeg',
    } as any);
  }
  const res = await fetch(fullUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });
  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      `Invalid response (${res.status}) from profile photo upload. Check backend at ${base} and that you are logged in.`
    );
  }
  if (!res.ok) {
    if (res.status === 401) {
      AsyncStorage.removeItem('authToken').catch(() => {});
      AsyncStorage.removeItem('user').catch(() => {});
    }
    const message = typeof data?.error === 'string' ? data.error : `Upload failed (${res.status})`;
    throw new Error(message);
  }
  if (data?.error) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Upload failed');
  }
  return data;
}

/** Multipart (e.g. bug report); do not set Content-Type (boundary). */
export async function apiPostMultipart(path: string, formData: FormData): Promise<any> {
  const base = getApiBaseUrl();
  const token = await AsyncStorage.getItem('authToken');
  const fullUrl = `${base}${path}`;
  const res = await fetch(fullUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });
  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: `Invalid response (${res.status})` };
  }
  if (!res.ok) {
    const message =
      typeof data?.error === 'string' ? data.error : `Request failed (${res.status})`;
    throw new Error(message);
  }
  if (data?.error) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Request failed');
  }
  return data;
}


