import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '@/contexts/ThemeContext';
import { useApp } from '@/contexts/AppContext';
import { translate } from '@/utils/translations';
import { apiGet } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

const screenW = Dimensions.get('window').width;
const chartInnerW = screenW - 48;

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
  const { colors: tc, isDark } = useTheme();
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

  const labels = payload?.labels ?? [];
  const dataA = payload?.healthProgress ?? [];
  const dataB = payload?.needsAttention ?? [];

  const chartWidth = useMemo(() => {
    const minPerPoint = range === 'week' ? 44 : 26;
    return Math.max(chartInnerW, Math.max(labels.length, 1) * minPerPoint);
  }, [labels.length, range]);

  const chartConfig = useMemo(
    () => ({
      backgroundColor: tc.chartBg,
      backgroundGradientFrom: tc.chartBg,
      backgroundGradientTo: tc.chartBg,
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(20, 184, 166, ${opacity})`,
      labelColor: (opacity = 1) =>
        isDark ? `rgba(203, 213, 225, ${opacity})` : `rgba(51, 65, 85, ${opacity})`,
      style: { borderRadius: 12 },
      propsForBackgroundLines: {
        strokeDasharray: '4 6',
        stroke: tc.chartGrid,
        strokeWidth: 1,
      },
      propsForDots: { r: '3', strokeWidth: '1' },
      useShadowColorFromDataset: true,
      fillShadowGradientFromOpacity: 0.35,
      fillShadowGradientToOpacity: 0.05,
    }),
    [tc.chartBg, tc.chartGrid, isDark]
  );

  const lineData = {
    labels: labels.length ? labels : ['—'],
    datasets: [
      {
        data: dataA.length ? dataA : [0],
        color: (opacity = 1) => `rgba(20, 184, 166, ${opacity})`,
        strokeWidth: 2,
      },
      {
        data: dataB.length ? dataB : [0],
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  const chartPlotHeight = 220;

  return (
    <View style={styles.box}>
      <View style={styles.row}>
        <Text style={[styles.title, { color: tc.text }]}>{translate('yieldTrend', language)}</Text>
        <View style={[styles.toggle, { backgroundColor: tc.screenSecondary, borderColor: tc.border }]}>
          {(['week', 'month'] as const).map((k) => (
            <TouchableOpacity
              key={k}
              style={[
                styles.toggleBtn,
                range === k && {
                  backgroundColor: tc.card,
                  ...(Platform.OS === 'ios'
                    ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 2 }
                    : { elevation: 2 }),
                },
              ]}
              onPress={() => setRange(k)}
              activeOpacity={0.85}
            >
              <Text style={[styles.toggleText, { color: tc.textMuted }, range === k && { color: '#22C55E', fontWeight: '700' }]}>
                {k === 'week' ? 'Week' : 'Month'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={[styles.centerBox, { minHeight: chartPlotHeight }]}>
          <ActivityIndicator color="#22C55E" />
        </View>
      ) : error ? (
        <View style={[styles.centerBox, { minHeight: 100 }]}>
          <Text style={{ color: tc.textMuted, fontSize: 13 }}>{error}</Text>
        </View>
      ) : !uid ? (
        <View style={[styles.centerBox, { minHeight: 100 }]}>
          <Text style={{ color: tc.textMuted, fontSize: 13 }}>Sign in to see trends.</Text>
        </View>
      ) : (
        <View style={[styles.chartScrollOuter, { height: chartPlotHeight + 8 }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={labels.length > 8}
            contentContainerStyle={styles.scrollInner}
            nestedScrollEnabled
            bounces
            style={styles.chartScroll}
          >
            <View style={styles.chartInner}>
              <LineChart
                data={lineData}
                width={chartWidth}
                height={chartPlotHeight}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                withVerticalLabels
                withHorizontalLabels
                segments={4}
                fromZero
                withShadow
                verticalLabelRotation={range === 'month' ? -45 : 0}
                yAxisSuffix="%"
              />
            </View>
          </ScrollView>
        </View>
      )}

      <View style={styles.legend}>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#14B8A6' }]} />
          <Text style={[styles.legendText, { color: tc.textSecondary }]}>
            {translate('healthProgress', language)}
          </Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
          <Text style={[styles.legendText, { color: tc.textSecondary }]}>
            {translate('needsAttention', language)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  centerBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartScroll: {
    flexGrow: 0,
  },
  chartScrollOuter: {
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  chartInner: {
    alignSelf: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    minWidth: 140,
  },
  toggle: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
  },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  scrollInner: {
    flexGrow: 0,
    alignItems: 'flex-start',
    paddingRight: 8,
    paddingVertical: 0,
  },
  chart: {
    marginVertical: 0,
    borderRadius: 12,
    paddingTop: 4,
    paddingBottom: 0,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 1,
  },
});
