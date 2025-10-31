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
  const headers = { ...(await getAuthHeaders()), 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(`${base}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  let data: any;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { error: 'Invalid JSON' }; }
  if (!res.ok || data?.error) {
    const message = typeof data?.error === 'string' ? data.error : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export async function apiGet<T = any>(path: string, headers?: Record<string, string>): Promise<T> {
  return apiJson<T>(path, { method: 'GET', headers });
}

export async function apiPost<T = any>(path: string, body?: any, headers?: Record<string, string>): Promise<T> {
  return apiJson<T>(path, { method: 'POST', body, headers });
}


