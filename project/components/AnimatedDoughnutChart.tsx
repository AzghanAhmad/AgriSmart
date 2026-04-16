/**
 * Animated Doughnut Chart using react-native-svg
 * Shows percentage labels inside slices with smooth loading animation.
 */
import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface DoughnutSlice {
  label: string;
  value: number;
  color: string;
}

interface DoughnutChartProps {
  data: DoughnutSlice[];
  size?: number;
  strokeWidth?: number;
  textColor?: string;
  centerLabel?: string;
  centerValue?: string;
  centerValueColor?: string;
}

function polarToCartesian(cx: number, cy: number, r: number, angleInDeg: number) {
  const rad = ((angleInDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  // Clamp to avoid full-circle issues
  const diff = endAngle - startAngle;
  if (diff >= 359.99) {
    // Full circle: use two arcs
    const mid = startAngle + 180;
    const s1 = polarToCartesian(cx, cy, r, startAngle);
    const m1 = polarToCartesian(cx, cy, r, mid);
    const e1 = polarToCartesian(cx, cy, r, endAngle - 0.01);
    return [
      `M ${s1.x} ${s1.y}`,
      `A ${r} ${r} 0 1 1 ${m1.x} ${m1.y}`,
      `A ${r} ${r} 0 1 1 ${e1.x} ${e1.y}`,
    ].join(' ');
  }
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = diff > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

export default function AnimatedDoughnutChart({
  data,
  size: propSize,
  strokeWidth = 28,
  textColor = '#111827',
  centerLabel,
  centerValue,
  centerValueColor = '#22C55E',
}: DoughnutChartProps) {
  const screenWidth = Dimensions.get('window').width;
  const size = propSize || Math.min(screenWidth - 80, 240);
  const animProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animProgress.setValue(0);
    Animated.timing(animProgress, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [data]);

  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);

  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - strokeWidth) / 2;

  // Compute arcs
  const arcs = useMemo(() => {
    let cumAngle = 0;
    return data.map((slice) => {
      const pct = total > 0 ? slice.value / total : 0;
      const angle = pct * 360;
      const startAngle = cumAngle;
      const endAngle = cumAngle + angle;
      const midAngle = startAngle + angle / 2;
      // Label position
      const labelR = radius;
      const labelPos = polarToCartesian(cx, cy, labelR, midAngle);
      cumAngle = endAngle;
      return { ...slice, startAngle, endAngle, pct, labelPos, path: describeArc(cx, cy, radius, startAngle, endAngle) };
    });
  }, [data, total, cx, cy, radius]);

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G>
          {arcs.map((arc, i) => (
            <React.Fragment key={i}>
              <Path
                d={arc.path}
                fill="none"
                stroke={arc.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
              {arc.pct > 0.04 && (
                <SvgText
                  x={arc.labelPos.x}
                  y={arc.labelPos.y + 4}
                  fill="white"
                  fontSize={11}
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {`${Math.round(arc.pct * 100)}%`}
                </SvgText>
              )}
            </React.Fragment>
          ))}
        </G>
      </Svg>
      {(centerLabel || centerValue) && (
        <View style={[styles.center, { width: size, height: size }]}>
          {centerValue && (
            <Text style={[styles.centerValue, { color: centerValueColor }]}>{centerValue}</Text>
          )}
          {centerLabel && (
            <Text style={[styles.centerLabel, { color: textColor }]}>{centerLabel}</Text>
          )}
        </View>
      )}
      {/* Legend */}
      <View style={styles.legend}>
        {data.map((slice, i) => (
          <View key={i} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
            <Text style={[styles.legendText, { color: textColor }]}>
              {slice.label} ({slice.value})
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  centerLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    opacity: 0.7,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
    paddingHorizontal: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
