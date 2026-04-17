import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { translate } from '@/utils/translations';
import { apiGet } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { TrendLineChart } from '@/components/TrendLineChart';

type Range = 'week' | 'month';

type TrendResponse = {
  range: string;
  labels: string[];
  healthProgress: number[];
  needsAttention: number[];
};

type Props = {
  farmerId?: string | null;
};

export function YieldTrendChart({ farmerId }: Props) {
  const { language } = useApp();
  const { user } = useAuth();
  const uid = farmerId ?? user?.id ?? null;

  const [range, setRange] = useState<Range>('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<TrendResponse | null>(null);

  const load = useCallback(async () => {
    if (!uid) {
      setLoading(false);
      setPayload(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<TrendResponse>(
        `/api/farmer/stats/yield-trend?farmerId=${encodeURIComponent(String(uid))}&range=${range}`
      );
      setPayload(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [uid, range]);

  useEffect(() => {
    load();
  }, [load]);

  const chartSeries = useMemo(
    () => [
      {
        key: 'healthProgress',
        label: translate('healthProgress', language),
        color: '#14B8A6',
        data: payload?.healthProgress ?? [],
      },
      {
        key: 'needsAttention',
        label: translate('needsAttention', language),
        color: '#3B82F6',
        data: payload?.needsAttention ?? [],
      },
    ],
    [payload?.healthProgress, payload?.needsAttention, language]
  );

  return (
    <TrendLineChart
      title={translate('yieldTrend', language)}
      range={range}
      onRangeChange={setRange}
      labels={payload?.labels ?? []}
      series={chartSeries}
      loading={loading}
      error={error}
      yAxisSuffix="%"
      emptyMessage={uid ? 'No trend data available.' : 'Sign in to see trends.'}
    />
  );
}
