import { useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost } from '@/utils/api';

export interface AdminDetectionItem {
  detectionId: string;
  farmerId: string | null;
  landId: string | null;
  diseaseId: string | null;
  imageUrl: string | null;
  confidence: number | null;
  status: string | null;
  timestamp: string | null;
  latitude?: number | null;
  longitude?: number | null;
  alertGenerated?: string | null;
}

export interface OutbreakAlertItem {
  alertId: string;
  diseaseId: string;
  diseaseName: string;  // Added: actual disease name
  status: string;
  createdAt: string | null;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
}

export function useAdminDetections(page: number = 1, pageSize: number = 10) {
  const [items, setItems] = useState<AdminDetectionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiGet<{ total: number; page: number; pageSize: number; items: AdminDetectionItem[] }>(
          `/api/admin/detections?page=${page}&pageSize=${pageSize}`
        );
        if (!cancelled) {
          setTotal(data.total || 0);
          setItems(Array.isArray(data.items) ? data.items : []);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load detections');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [page, pageSize]);

  return { items, total, loading, error };
}

export function useOutbreakAlerts(status: string | null = 'pending') {
  const [items, setItems] = useState<OutbreakAlertItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const qs = status ? `?status=${encodeURIComponent(status)}` : '';
      const data = await apiGet<{ items: OutbreakAlertItem[] }>(`/api/admin/alerts${qs}`);
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!cancelled) {
        await refresh();
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const approveAlert = useCallback(
    async (alertId: string) => {
      try {
        setError(null);
        await apiPost(`/api/admin/alerts/${encodeURIComponent(alertId)}/approve`, {});
        await refresh();
      } catch (e: any) {
        setError(e?.message || 'Failed to approve alert');
        throw e; // Re-throw so caller can handle if needed
      }
    },
    [refresh]
  );

  return { items, loading, error, refresh, approveAlert };
}

