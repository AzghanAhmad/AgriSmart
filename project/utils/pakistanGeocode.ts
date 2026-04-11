import * as Location from 'expo-location';
import type { User } from '@/types';

/** Pakistan bounding box (approximate). */
export function isInPakistan(lat: number, lng: number): boolean {
  return lat >= 23.5 && lat <= 37.0 && lng >= 60.0 && lng <= 77.0;
}

/** Clamp coordinates to Pakistan bounds (for map picker). */
export function clampToPakistan(lat: number, lng: number): { latitude: number; longitude: number } {
  return {
    latitude: Math.min(37, Math.max(23.5, lat)),
    longitude: Math.min(77, Math.max(60, lng)),
  };
}

type NominatimHit = { lat: string; lon: string; display_name?: string };

/**
 * Resolve a free-text place name to coordinates inside Pakistan (OpenStreetMap Nominatim).
 * Returns null if not found, offline, timeout, or result falls outside Pakistan bounds.
 * Never throws — avoids breaking profile save when only geocoding fails.
 */
export async function geocodeLocationInPakistan(
  query: string,
): Promise<{ lat: number; lng: number; label: string } | null> {
  const q = query.trim();
  if (!q) return null;

  /** Nominatim: try plain query, then explicit ", Pakistan" (helps ambiguous names). */
  const attempts = [q, `${q}, Pakistan`];

  for (let i = 0; i < attempts.length; i++) {
    const searchQ = attempts[i];
    const url =
      `https://nominatim.openstreetmap.org/search?format=json` +
      `&q=${encodeURIComponent(searchQ)}` +
      `&countrycodes=pk` +
      `&limit=1`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'AgriSmart/1.0 (Android iOS; FYP; contact via app support)',
        },
      });
      clearTimeout(timeoutId);
      if (!res.ok) continue;

      const data = (await res.json()) as NominatimHit[];
      if (!data?.length) continue;

      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
      if (!isInPakistan(lat, lng)) continue;

      return {
        lat,
        lng,
        label: data[0].display_name || q,
      };
    } catch {
      continue;
    }
    /** Nominatim fair-use: at most ~1 req/s — small gap between retries. */
    if (i < attempts.length - 1) {
      await new Promise((r) => setTimeout(r, 1100));
    }
  }

  return null;
}

const LAHORE = { latitude: 31.5204, longitude: 74.3587 };

/**
 * For scans / heatmap: prefer live GPS in Pakistan, then profile coordinates,
 * then geocode profile location string, then Lahore.
 */
export async function resolveScanCoordinates(
  user: User | null,
): Promise<{ latitude: number; longitude: number }> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      if (isInPakistan(lat, lng)) {
        return { latitude: lat, longitude: lng };
      }
    }
  } catch {
    // Emulator / disabled location services — fall through
  }

  if (
    user?.latitude != null &&
    user?.longitude != null &&
    isInPakistan(user.latitude, user.longitude)
  ) {
    return { latitude: user.latitude, longitude: user.longitude };
  }

  const text = (user?.location || '').trim();
  if (text) {
    try {
      const g = await geocodeLocationInPakistan(text);
      if (g) {
        return { latitude: g.lat, longitude: g.lng };
      }
    } catch {
      // offline / rate limit
    }
  }

  return LAHORE;
}

/**
 * Weather / home dashboard: use saved profile coordinates or geocode location text (no GPS).
 */
export async function resolveWeatherCoordinates(
  user: User | null,
): Promise<{ latitude: number; longitude: number }> {
  if (
    user?.latitude != null &&
    user?.longitude != null &&
    isInPakistan(user.latitude, user.longitude)
  ) {
    return { latitude: user.latitude, longitude: user.longitude };
  }
  const text = (user?.location || '').trim();
  if (text) {
    try {
      const g = await geocodeLocationInPakistan(text);
      if (g) return { latitude: g.lat, longitude: g.lng };
    } catch {
      // ignore
    }
  }
  return LAHORE;
}
