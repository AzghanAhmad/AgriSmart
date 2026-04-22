import React, { useMemo } from 'react';
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

const screenW = Dimensions.get('window').width;
const chartInnerW = screenW - 48;

export type TrendRange = 'week' | 'month';

export type TrendChartSeries = {
  key: string;
  label: string;
  color: string;
  data: number[];
};

type Props = {
  title: string;
  range: TrendRange;
  onRangeChange: (range: TrendRange) => void;
  labels: string[];
  series: TrendChartSeries[];
  loading?: boolean;
  error?: string | null;
  yAxisSuffix?: string;
  emptyMessage?: string;
  weekLabel?: string;
  monthLabel?: string;
};

export function TrendLineChart({
  title,
  range,
  onRangeChange,
  labels,
  series,
  loading = false,
  error = null,
  yAxisSuffix = '',
  emptyMessage = 'No chart data available.',
  weekLabel = 'Week',
  monthLabel = 'Month',
}: Props) {
  const { colors: tc, isDark } = useTheme();

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

  const lineData = useMemo(
    () => ({
      labels: labels.length ? labels : ['—'],
      datasets:
        series.length > 0
          ? series.map((item) => ({
              data: item.data.length ? item.data : [0],
              color: (opacity = 1) => {
                const hex = item.color.replace('#', '');
                const normalized =
                  hex.length === 3 ? hex.split('').map((char) => char + char).join('') : hex;
                const intValue = parseInt(normalized, 16);
                const r = (intValue >> 16) & 255;
                const g = (intValue >> 8) & 255;
                const b = intValue & 255;
                return `rgba(${r}, ${g}, ${b}, ${opacity})`;
              },
              strokeWidth: 2,
            }))
          : [{ data: [0], color: () => 'rgba(148, 163, 184, 1)', strokeWidth: 2 }],
    }),
    [labels, series]
  );

  const chartPlotHeight = 220;
  const hasData = labels.length > 0 && series.some((item) => item.data.some((value) => value > 0));

  return (
    <View style={styles.box}>
      <View style={styles.row}>
        <Text style={[styles.title, { color: tc.text }]}>{title}</Text>
        <View style={[styles.toggle, { backgroundColor: tc.screenSecondary, borderColor: tc.border }]}>
          {([
            { key: 'week' as const, label: weekLabel },
            { key: 'month' as const, label: monthLabel },
          ]).map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.toggleBtn,
                range === item.key && {
                  backgroundColor: tc.card,
                  ...(Platform.OS === 'ios'
                    ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 2 }
                    : { elevation: 2 }),
                },
              ]}
              onPress={() => onRangeChange(item.key)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.toggleText,
                  { color: tc.textMuted },
                  range === item.key && { color: '#22C55E', fontWeight: '700' },
                ]}
              >
                {item.label}
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
      ) : !hasData ? (
        <View style={[styles.centerBox, { minHeight: 100 }]}>
          <Text style={{ color: tc.textMuted, fontSize: 13 }}>{emptyMessage}</Text>
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
                yAxisSuffix={yAxisSuffix}
              />
            </View>
          </ScrollView>
        </View>
      )}

      <View style={styles.legend}>
        {series.map((item) => (
          <View key={item.key} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={[styles.legendText, { color: tc.textSecondary }]}>{item.label}</Text>
          </View>
        ))}
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
