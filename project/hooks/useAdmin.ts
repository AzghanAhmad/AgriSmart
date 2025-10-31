import { useEffect, useState } from 'react';
import { apiGet } from '@/utils/api';

export interface AdminDetectionItem {
  detectionId: string;
  farmerId: string | null;
  landId: string | null;
  diseaseId: string | null;
  imageUrl: string | null;
  confidence: number | null;
  status: string | null;
  timestamp: string | null;
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


