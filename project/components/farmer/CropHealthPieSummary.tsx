import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { useTheme } from '@/contexts/ThemeContext';
import { useApp } from '@/contexts/AppContext';
import { translate } from '@/utils/translations';

type Props = {
  /** Percentages 0–100 from API (of all scans) */
  healthy: number;
  atRisk: number;
  diseased: number;
  totalScans: number;
  healthyCount?: number;
  atRiskCount?: number;
  diseasedCount?: number;
};

export function CropHealthPieSummary({
  healthy,
  atRisk,
  diseased,
  totalScans,
  healthyCount,
  atRiskCount,
  diseasedCount,
}: Props) {
  const { colors: tc, isDark } = useTheme();
  const { language } = useApp();
  const screenW = Dimensions.get('window').width;
  const chartW = Math.min(screenW - 48, 360);

  const chartConfig = useMemo(
    () => ({
      backgroundColor: 'transparent',
      backgroundGradientFrom: tc.chartBg,
      backgroundGradientTo: tc.chartBg,
      color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
      labelColor: (opacity = 1) =>
        isDark ? `rgba(249, 250, 251, ${opacity})` : `rgba(30, 41, 59, ${opacity})`,
    }),
    [tc.chartBg, isDark]
  );

  /** Pie slices use scan counts when available so the chart matches “all scans”. */
  const { sliceHealthy, sliceAtRisk, sliceDiseased } = useMemo(() => {
    if (totalScans === 0) {
      return { sliceHealthy: 0, sliceAtRisk: 0, sliceDiseased: 0 };
    }
    const hC = healthyCount ?? 0;
    const aC = atRiskCount ?? 0;
    const dC = diseasedCount ?? 0;
    const sum = hC + aC + dC;
    if (sum > 0) {
      return { sliceHealthy: hC, sliceAtRisk: aC, sliceDiseased: dC };
    }
    return {
      sliceHealthy: Math.max(0, healthy),
      sliceAtRisk: Math.max(0, atRisk),
      sliceDiseased: Math.max(0, diseased),
    };
  }, [healthy, atRisk, diseased, healthyCount, atRiskCount, diseasedCount, totalScans]);

  const data = useMemo(
    () => [
      {
        name: 'Healthy',
        population: Math.max(0, sliceHealthy),
        color: '#22C55E',
        legendFontColor: tc.text,
        legendFontSize: 12,
      },
      {
        name: 'At risk',
        population: Math.max(0, sliceAtRisk),
        color: '#F59E0B',
        legendFontColor: tc.text,
        legendFontSize: 12,
      },
      {
        name: 'Diseased',
        population: Math.max(0, sliceDiseased),
        color: '#EF4444',
        legendFontColor: tc.text,
        legendFontSize: 12,
      },
    ],
    [sliceHealthy, sliceAtRisk, sliceDiseased, tc.text]
  );

  const totalPop = Math.max(sliceHealthy + sliceAtRisk + sliceDiseased, 1);
  const pct = (n: number) => Math.round((Math.max(0, n) / totalPop) * 100);

  /** API `healthy` is already % of all scans classified healthy */
  const displayOverallHealthy = totalScans > 0 ? Math.round(healthy) : 0;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.summaryLine, { color: tc.textSecondary }]}>
        {translate('allScans', language)}: <Text style={{ fontWeight: '700', color: tc.text }}>{totalScans}</Text>
        {totalScans > 0 ? (
          <>
            {' · '}
            {translate('overallHealthy', language)}:{' '}
            <Text style={{ fontWeight: '700', color: '#16A34A' }}>{displayOverallHealthy}%</Text>
          </>
        ) : null}
      </Text>

      {totalScans === 0 ? (
        <View style={[styles.emptyChart, { backgroundColor: tc.screenSecondary }]}>
          <Text style={[styles.emptyText, { color: tc.textMuted }]}>
            No scan data yet. Use Scan Crop to build your health summary.
          </Text>
        </View>
      ) : (
        <PieChart
          data={data}
          width={chartW}
          height={190}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="0"
          hasLegend={false}
          absolute={false}
          avoidFalseZero
        />
      )}
      <View style={[styles.legend, { borderTopColor: tc.border }]}>
        <View style={styles.legendRow}>
          <View style={styles.legendLeft}>
            <View style={[styles.swatch, { backgroundColor: '#22C55E' }]} />
            <Text style={[styles.legendLabel, { color: tc.textSecondary }]}>Healthy</Text>
          </View>
          <Text style={[styles.legendValue, { color: tc.text }]}>
            {totalScans === 0 ? '—' : `${pct(sliceHealthy)}%`}
          </Text>
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendLeft}>
            <View style={[styles.swatch, { backgroundColor: '#F59E0B' }]} />
            <Text style={[styles.legendLabel, { color: tc.textSecondary }]}>At risk</Text>
          </View>
          <Text style={[styles.legendValue, { color: tc.text }]}>
            {totalScans === 0 ? '—' : `${pct(sliceAtRisk)}%`}
          </Text>
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendLeft}>
            <View style={[styles.swatch, { backgroundColor: '#EF4444' }]} />
            <Text style={[styles.legendLabel, { color: tc.textSecondary }]}>Diseased</Text>
          </View>
          <Text style={[styles.legendValue, { color: tc.text }]}>
            {totalScans === 0 ? '—' : `${pct(sliceDiseased)}%`}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  emptyChart: {
    width: '100%',
    minHeight: 140,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  summaryLine: {
    fontSize: 16,
    marginBottom: 12,
    textAlign: 'center',
    width: '100%',
    lineHeight: 24,
  },
  legend: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    width: '100%',
    gap: 10,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
    paddingRight: 8,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  legendValue: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 44,
    textAlign: 'right',
  },
});
