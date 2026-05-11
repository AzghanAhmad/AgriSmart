import { useEffect, useState, useCallback } from 'react';
import { apiGet, apiJson, apiPost } from '@/utils/api';

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

export interface AdminDashboardStats {
  totalFarmers: number;
  totalReports: number;
  activeDiseases: number;
  pendingAlerts: number;
  approvedAlerts: number;
}

export interface AdminActivityItem {
  id: string;
  type: 'farmer_registered' | 'detection_reported' | 'alert_created' | 'alert_approved';
  title: string;
  subtitle: string;
  timestamp: string | null;
}

export interface AdminDashboardOverview {
  stats: AdminDashboardStats;
  activities: AdminActivityItem[];
}

export interface AdminTrendSeries {
  key: string;
  label: string;
  color: string;
  data: number[];
}

export interface AdminTrendPayload {
  range: string;
  labels: string[];
  series: AdminTrendSeries[];
}

export interface AdminReportItem {
  id: string;
  detectionId: string;
  farmerId: string | null;
  farmerName: string;
  diseaseName: string;
  cropType: string;
  location: string;
  status: 'pending' | 'reviewed' | 'resolved' | string;
  imageUrl: string | null;
  confidence: number;
  submittedAt: string | null;
  reviewedAt?: string | null;
}

export interface AdminSubsidyItem {
  id: string;
  parentSubsidyId?: string | null;
  title: string;
  description: string;
  amount: number;
  maxAmount: number;
  eligibilityCriteria: string[];
  applicationDeadline: string | null;
  status: 'active' | 'paused' | 'expired' | string;
  totalApplicants: number;
  approvedApplicants: number;
  totalDisbursed: number;
  createdAt: string | null;
  subSubsidies?: AdminSubsidyItem[];
}

export interface AdminSubsidyApplicationItem {
  applicationId: string;
  subsidyId: string;
  subsidyTitle: string;
  farmerId: string;
  farmerName: string;
  farmerLocation?: string | null;
  status: 'pending' | 'accepted' | 'rejected' | string;
  applyNote?: string | null;
  decisionNote?: string | null;
  createdAt?: string | null;
  decidedAt?: string | null;
}

export function useAdminDetections(page: number = 1, pageSize: number = 10) {
  const [items, setItems] = useState<AdminDetectionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<{ total: number; page: number; pageSize: number; items: AdminDetectionItem[] }>(
        `/api/admin/detections?page=${page}&pageSize=${pageSize}`
      );
      setTotal(data.total || 0);
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load detections');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

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

  return { items, total, loading, error, refresh };
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

export function useAdminDashboardOverview() {
  const [data, setData] = useState<AdminDashboardOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const payload = await apiGet<AdminDashboardOverview>('/api/admin/dashboard/overview');
      setData(payload);
    } catch (e: any) {
      setError(e?.message || 'Failed to load dashboard overview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useAdminTrend(path: string, range: 'week' | 'month') {
  const [data, setData] = useState<AdminTrendPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const payload = await apiGet<AdminTrendPayload>(
        `/api/admin/dashboard/trends/${path}?range=${encodeURIComponent(range)}`
      );
      setData(payload);
    } catch (e: any) {
      setError(e?.message || 'Failed to load trend');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [path, range]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const payload = await apiGet<AdminTrendPayload>(
          `/api/admin/dashboard/trends/${path}?range=${encodeURIComponent(range)}`
        );
        if (!cancelled) {
          setData(payload);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Failed to load trend');
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [path, range]);

  return { data, loading, error, refresh };
}

export function useAdminReports(page: number = 1, pageSize: number = 20, status: string = 'all', query: string = '') {
  const [items, setItems] = useState<AdminReportItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const qs = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        status,
        q: query,
      });
      const payload = await apiGet<{ total: number; page: number; pageSize: number; items: AdminReportItem[] }>(
        `/api/admin/reports?${qs.toString()}`
      );
      setItems(Array.isArray(payload.items) ? payload.items : []);
      setTotal(payload.total || 0);
    } catch (e: any) {
      setError(e?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, query, status]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateStatus = useCallback(async (reportId: string, nextStatus: 'pending' | 'reviewed' | 'resolved') => {
    await apiPost(`/api/admin/reports/${encodeURIComponent(reportId)}/status`, { status: nextStatus });
    await refresh();
  }, [refresh]);

  return { items, total, loading, error, refresh, updateStatus };
}

export function useAdminSubsidies(status: string = 'all', query: string = '') {
  const [items, setItems] = useState<AdminSubsidyItem[]>([]);
  const [allItems, setAllItems] = useState<AdminSubsidyItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const qs = new URLSearchParams({ status, q: query });
      const payload = await apiGet<{ total: number; items: AdminSubsidyItem[]; allItems: AdminSubsidyItem[] }>(
        `/api/admin/subsidies?${qs.toString()}`
      );
      setItems(Array.isArray(payload.items) ? payload.items : []);
      setAllItems(Array.isArray(payload.allItems) ? payload.allItems : []);
      setTotal(payload.total || 0);
    } catch (e: any) {
      setError(e?.message || 'Failed to load subsidies');
    } finally {
      setLoading(false);
    }
  }, [query, status]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createSubsidy = useCallback(async (body: Partial<AdminSubsidyItem> & { title: string; amount: number }) => {
    await apiPost('/api/admin/subsidies', body);
    await refresh();
  }, [refresh]);

  const updateSubsidy = useCallback(async (id: string, body: Partial<AdminSubsidyItem>) => {
    await apiJson(`/api/admin/subsidies/${encodeURIComponent(id)}`, { method: 'PUT', body });
    await refresh();
  }, [refresh]);

  const updateSubsidyStatus = useCallback(async (id: string, nextStatus: 'active' | 'paused' | 'expired') => {
    await apiPost(`/api/admin/subsidies/${encodeURIComponent(id)}/status`, { status: nextStatus });
    await refresh();
  }, [refresh]);

  const deleteSubsidy = useCallback(async (id: string) => {
    await apiJson(`/api/admin/subsidies/${encodeURIComponent(id)}`, { method: 'DELETE' });
    await refresh();
  }, [refresh]);

  return {
    items,
    allItems,
    total,
    loading,
    error,
    refresh,
    createSubsidy,
    updateSubsidy,
    updateSubsidyStatus,
    deleteSubsidy,
  };
}

export function useAdminSubsidyApplications(status: string = 'pending') {
  const [items, setItems] = useState<AdminSubsidyApplicationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const payload = await apiGet<{ total: number; items: AdminSubsidyApplicationItem[] }>(
        `/api/admin/subsidy-applications?status=${encodeURIComponent(status)}`
      );
      setItems(Array.isArray(payload.items) ? payload.items : []);
      setTotal(payload.total || 0);
    } catch (e: any) {
      setError(e?.message || 'Failed to load subsidy applications');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const decide = useCallback(async (applicationId: string, nextStatus: 'accepted' | 'rejected', decisionNote?: string) => {
    await apiPost(`/api/admin/subsidy-applications/${encodeURIComponent(applicationId)}/status`, {
      status: nextStatus,
      decisionNote: decisionNote || '',
    });
    await refresh();
  }, [refresh]);

  return { items, total, loading, error, refresh, decide };
}

