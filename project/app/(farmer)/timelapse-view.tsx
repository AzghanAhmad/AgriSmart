/**
 * Smart TimeLapse View Screen - Complete Feature
 * 
 * Comprehensive timeline dashboard with multiple chart types, weather trends,
 * disease distribution, severity analysis, and predictive insights.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Play,
  Pause,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Sun,
  Droplets,
  AlertCircle,
  Sparkles,
  ArrowLeft,
  Camera,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Activity,
  Thermometer,
  Cloud,
  ArrowRight,
  GitCompare,
  Award,
  AlertTriangle,
} from 'lucide-react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getApiBaseUrl } from '@/utils/env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/contexts/ThemeContext';
import { colors, spacing, borderRadius, shadows, typography } from '@/utils/designSystem';

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 375;
const cardWidth = width - spacing.base * 2;
const statCardWidth = (width - spacing.base * 2 - spacing.md * 2) / 3;
const additionalStatCardWidth = (width - spacing.base * 2 - spacing.sm * 3) / 4;

interface TimelapseEntry {
  id: number;
  date: string;
  photo_url: string;
  highlighted_photo_url: string | null;
  detected_disease: string | null;
  severity: string | null;
  severity_score: number | null;
  weather_temp: number | null;
  weather_humidity: number | null;
  notes: string | null;
  ai_confidence: number | null;
}

interface TimelapseData {
  crop_id: number;
  crop_name: string;
  crop_type: string;
  entries: TimelapseEntry[];
  stats: {
    total_entries: number;
    avg_severity_score: number;
    trend: 'improving' | 'worsening' | 'stable';
    avg_temp?: number | null;
    avg_humidity?: number | null;
    avg_ai_confidence?: number | null;
    top_disease?: string | null;
  };
}

interface Prediction {
  predicted_severity: string;
  score: number;
  future_humidity: number;
  message: string;
}

type ChartType = 'severity' | 'weather' | 'disease';

/** Build full image URL for timelapse photos (avoids double slash, handles full URLs) */
function getTimelapseImageUrl(photoUrl: string | null | undefined): string | null {
  if (!photoUrl) return null;
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) return photoUrl;
  const base = getApiBaseUrl().replace(/\/$/, '');
  const path = photoUrl.startsWith('/') ? photoUrl : `/${photoUrl}`;
  return `${base}${path}`;
}

export default function TimeLapseViewScreen() {
  const router = useRouter();
  const { cropId } = useLocalSearchParams<{ cropId: string }>();
  const { colors: tc, isDark } = useTheme();

  const [data, setData] = useState<TimelapseData | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimelapseEntry | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayIndex, setCurrentPlayIndex] = useState(0);
  const [activeChart, setActiveChart] = useState<ChartType>('severity');
  const [failedImageIds, setFailedImageIds] = useState<Set<number>>(new Set());
  
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const markImageFailed = useCallback((entryId: number) => {
    setFailedImageIds((prev) => (prev.has(entryId) ? prev : new Set(prev).add(entryId)));
  }, []);

  useEffect(() => {
    loadData();
    loadPrediction();
  }, [cropId]);

  useEffect(() => {
    if (isPlaying && data?.entries?.length) {
      startPlayback();
    } else {
      stopPlayback();
    }
    return () => stopPlayback();
  }, [isPlaying, data]);

  // Keep play index in bounds when entries change (e.g. after refresh)
  useEffect(() => {
    if (data?.entries?.length && currentPlayIndex >= data.entries.length) {
      setCurrentPlayIndex(0);
    }
  }, [data?.entries?.length, currentPlayIndex]);

  const loadData = async () => {
    if (!cropId) return;
    
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${getApiBaseUrl()}/api/timelapse/${cropId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setData(result);
        setFailedImageIds(new Set());
      }
    } catch (error) {
      console.error('Failed to load timelapse:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadPrediction = async () => {
    if (!cropId) return;
    
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${getApiBaseUrl()}/api/timelapse/predict/${cropId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setPrediction(result);
      }
    } catch (error) {
      console.error('Failed to load prediction:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    loadPrediction();
  };

  const startPlayback = () => {
    const entries = data?.entries ? [...data.entries].reverse() : [];
    if (entries.length === 0) return;
    
    setCurrentPlayIndex(0);
    
    const interval = setInterval(() => {
      setCurrentPlayIndex((prev) => {
        const next = prev + 1;
        if (next >= entries.length) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });
    }, 2000);
    
    playIntervalRef.current = interval;
  };

  const stopPlayback = () => {
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }
  };

  const getSeverityColor = (score: number | null) => {
    if (score === null || score === 0) return colors.success;
    if (score === 1) return colors.warning;
    if (score === 2) return '#F97316';
    return colors.error;
  };

  /** Format entry date (user-input date) for First/Latest Scan display */
  const formatEntryDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getSeverityLabel = (severity: string | null) => {
    if (!severity || severity === 'None') return 'Healthy';
    return severity;
  };

  // Aggregate entries by month (year-month): one point per month, value = average of all scans in that month
  const chartWidth = cardWidth - spacing.lg * 2;

  type MonthKey = string;
  const getYearMonth = (dateStr: string): MonthKey => {
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const monthGroups = React.useMemo(() => {
    const entriesList = data?.entries ?? [];
    const map = new Map<MonthKey, TimelapseEntry[]>();
    for (const e of entriesList) {
      const key = getYearMonth(e.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    const keys = Array.from(map.keys()).sort();
    return keys.map((key) => {
      const group = map.get(key)!;
      const count = group.length;
      const avgSeverity =
        count > 0
          ? group.reduce((sum, x) => sum + (x.severity_score ?? 0), 0) / count
          : 0;
      const avgTemp =
        count > 0
          ? group.reduce((sum, x) => sum + (x.weather_temp ?? 0), 0) / count
          : 0;
      const avgHumidity =
        count > 0
          ? group.reduce((sum, x) => sum + (x.weather_humidity ?? 0), 0) / count
          : 0;
      const avgConfidence =
        count > 0
          ? group.reduce((sum, x) => sum + (x.ai_confidence ?? 0), 0) / count
          : 0;
      const [year, month] = key.split('-').map(Number);
      const monthLabel =
        keys.length <= 12
          ? new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short' })
          : new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      return { key, monthLabel, avgSeverity, avgTemp, avgHumidity, avgConfidence };
    });
  }, [data?.entries]);

  const severityChartData = monthGroups.length > 0 ? {
    labels: monthGroups.map((g) => g.monthLabel),
    datasets: [{
      data: monthGroups.map((g) => Math.round(g.avgSeverity * 100) / 100),
      color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
      strokeWidth: 3,
    }],
  } : null;

  const weatherChartData = monthGroups.length > 0 ? {
    labels: monthGroups.map((g) => g.monthLabel),
    datasets: [
      {
        data: monthGroups.map((g) => Math.round(g.avgTemp * 100) / 100),
        color: (opacity = 1) => `rgba(251, 191, 36, ${opacity})`,
        strokeWidth: 2,
      },
      {
        data: monthGroups.map((g) => Math.round(g.avgHumidity * 100) / 100),
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  } : null;

  // Disease distribution
  const diseaseDistribution = React.useMemo(() => {
    return (
      data?.entries.reduce((acc, entry) => {
        const disease = entry.detected_disease || 'Healthy';
        acc[disease] = (acc[disease] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {}
    );
  }, [data?.entries]);

  const diseasePieData = React.useMemo(() => {
    return Object.entries(diseaseDistribution).map(([name, count], index) => {
      const colors_list = ['#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6', '#EC4899'];
      return {
        name: name.length > 15 ? name.substring(0, 15) + '...' : name,
        population: count,
        color: colors_list[index % colors_list.length],
        legendFontColor: tc.chartLabel,
        legendFontSize: 12,
      };
    });
  }, [diseaseDistribution, tc.chartLabel]);

  // Severity distribution
  const severityDistribution = data?.entries.reduce((acc, entry) => {
    const severity = entry.severity || 'None';
    acc[severity] = (acc[severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const severityBarData = {
    labels: Object.keys(severityDistribution),
    datasets: [{
      data: Object.values(severityDistribution),
    }],
  };

  // Confidence chart (aggregated by month)
  const confidenceChartData = monthGroups.length > 0 ? {
    labels: monthGroups.map((g) => g.monthLabel),
    datasets: [{
      data: monthGroups.map((g) => Math.round((g.avgConfidence ?? 0) * 100)),
      color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
      strokeWidth: 3,
    }],
  } : null;

  // Statistics from backend (from scanned images)
  const stats = data ? {
    totalEntries: data.stats.total_entries || 0,
    avgSeverity: data.stats.avg_severity_score || 0,
    trend: data.stats.trend || 'stable',
    avgTemp: data.stats.avg_temp ?? (() => {
      const temps = data.entries.filter(e => e.weather_temp != null);
      if (temps.length === 0) return null;
      return temps.reduce((acc, e) => acc + (e.weather_temp || 0), 0) / temps.length;
    })(),
    avgHumidity: data.stats.avg_humidity ?? (() => {
      const humidities = data.entries.filter(e => e.weather_humidity != null);
      if (humidities.length === 0) return null;
      return humidities.reduce((acc, e) => acc + (e.weather_humidity || 0), 0) / humidities.length;
    })(),
    avgConfidence: data.stats.avg_ai_confidence ?? (() => {
      const confidences = data.entries.filter(e => e.ai_confidence != null);
      if (confidences.length === 0) return 0;
      return confidences.reduce((acc, e) => acc + (e.ai_confidence || 0), 0) / confidences.length;
    })(),
    mostCommonDisease: data.stats.top_disease ?? (Object.entries(diseaseDistribution).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None'),
  } : null;

  // First scan = earliest by user-input date; latest = most recent (backend returns newest first)
  const entriesByDate = data?.entries?.length ? [...data.entries] : [];
  const firstScanEntry = entriesByDate.length >= 1 ? entriesByDate[entriesByDate.length - 1] : null;
  const latestScanEntry = entriesByDate.length >= 1 ? entriesByDate[0] : null;

  // Playback: show the 3 (or N) scanned images in chronological order (oldest → latest); date and severity match the current image
  const playbackEntries = React.useMemo(
    () => (data?.entries ? [...data.entries].reverse() : []),
    [data?.entries]
  );
  const currentPlayEntry = playbackEntries.length > 0
    ? (playbackEntries[currentPlayIndex] ?? playbackEntries[0])
    : null;

  const chartConfigBase = React.useMemo(
    () => ({
      backgroundColor: tc.chartBg,
      backgroundGradientFrom: tc.chartBg,
      backgroundGradientTo: tc.chartBg,
      decimalPlaces: 1,
      color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
      labelColor: () => tc.chartLabel,
      style: { borderRadius: borderRadius.lg, padding: 8 },
      propsForDots: { r: 5, strokeWidth: 2, stroke: '#22C55E' },
      propsForBackgroundLines: { strokeDasharray: '', stroke: tc.chartGrid, strokeWidth: 1 },
    }),
    [tc.chartBg, tc.chartLabel, tc.chartGrid]
  );
  const chartConfigSeverity = React.useMemo(
    () => ({ ...chartConfigBase, color: (o = 1) => `rgba(34, 197, 94, ${o})` }),
    [chartConfigBase]
  );
  const chartConfigWeatherTemp = React.useMemo(
    () => ({ ...chartConfigBase, color: (o = 1) => `rgba(245, 158, 11, ${o})` }),
    [chartConfigBase]
  );
  const chartConfigWeatherHumid = React.useMemo(
    () => ({ ...chartConfigBase, color: (o = 1) => `rgba(59, 130, 246, ${o})` }),
    [chartConfigBase]
  );
  const chartConfigPie = React.useMemo(
    () => ({ ...chartConfigBase, color: () => '#22C55E' }),
    [chartConfigBase]
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: tc.screen }]}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.loadingContainer}
        >
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.loadingText}>Loading TimeLapse...</Text>
        </LinearGradient>
      </View>
    );
  }

  if (!data || data.entries.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: tc.screen }]}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.emptyContainer}
        >
          <Sparkles size={64} color="#FFD700" />
          <Text style={styles.emptyTitle}>Start Tracking!</Text>
          <Text style={styles.emptySubtitle}>
            Upload your first leaf photo to begin the TimeLapse journey
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push(`/(farmer)/timelapse-upload?cropId=${cropId}`)}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.emptyButtonGradient}
            >
              <Camera size={24} color="white" />
              <Text style={styles.emptyButtonText}>Upload First Photo</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: tc.screen }]}>
      <ScrollView
        style={[styles.scrollView, { backgroundColor: tc.screen }]}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tc.primary} />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.header}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Sparkles size={28} color="#FFD700" />
            <Text style={styles.headerTitle}>{data.crop_name}</Text>
            <Text style={styles.headerSubtitle}>
              {data.stats.total_entries} entries • {data.crop_type}
            </Text>
          </View>
        </LinearGradient>

        {/* Stats Cards – full color, no grey strip; Result value on one line */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.statCardGreen]}>
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.statCardGradient}
            >
              <Activity size={24} color="white" />
              <Text style={styles.statValue}>{stats?.totalEntries || 0}</Text>
              <Text style={styles.statLabel}>Total Scans</Text>
            </LinearGradient>
          </View>
          <View style={[styles.statCard, styles.statCardOrange]}>
            <LinearGradient
              colors={[colors.warning, '#D97706']}
              style={styles.statCardGradient}
            >
              <BarChart3 size={24} color="white" />
              <Text style={styles.statValue}>
                {stats?.avgSeverity.toFixed(1) || '0.0'}
              </Text>
              <Text style={styles.statLabel}>Avg Severity</Text>
            </LinearGradient>
          </View>
          <View style={[styles.statCard, stats?.trend === 'improving' ? styles.statCardGreen : styles.statCardOrange]}>
            <LinearGradient
              colors={
                stats?.trend === 'improving'
                  ? [colors.success, colors.primaryDark]
                  : [colors.warning, '#D97706']
              }
              style={styles.statCardGradient}
            >
              {stats?.trend === 'improving' ? (
                <TrendingDown size={24} color="white" />
              ) : (
                <TrendingUp size={24} color="white" />
              )}
              <Text style={styles.statValue} numberOfLines={1}>
                {stats?.trend === 'improving' ? 'Improving' : 'Not Improving'}
              </Text>
              <Text style={styles.statLabel}>Result</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Additional Stats: 2x2 grid from scanned images (avg temp, humidity, AI confidence, top disease) */}
        <View style={styles.additionalStatsGrid}>
          <View style={styles.additionalStatsRow}>
            <View style={[styles.additionalStatCard, { backgroundColor: tc.card, borderColor: tc.border }]}>
              <Thermometer size={22} color={colors.warning} />
              <Text style={[styles.additionalStatValue, { color: tc.text }]}>
                {stats?.avgTemp != null ? `${Number(stats.avgTemp).toFixed(1)}° C` : 'N/A'}
              </Text>
              <Text style={[styles.additionalStatLabel, { color: tc.textMuted }]}>Avg Temp</Text>
            </View>
            <View style={[styles.additionalStatCard, { backgroundColor: tc.card, borderColor: tc.border }]}>
              <Droplets size={22} color={colors.info} />
              <Text style={[styles.additionalStatValue, { color: tc.text }]}>
                {stats?.avgHumidity != null ? `${Number(stats.avgHumidity).toFixed(0)}%` : 'N/A'}
              </Text>
              <Text style={[styles.additionalStatLabel, { color: tc.textMuted }]}>Avg Humidity</Text>
            </View>
          </View>
          <View style={styles.additionalStatsRow}>
            <View style={[styles.additionalStatCard, { backgroundColor: tc.card, borderColor: tc.border }]}>
              <LineChartIcon size={22} color={colors.primary} />
              <Text style={[styles.additionalStatValue, { color: tc.text }]}>
                {((stats?.avgConfidence ?? 0) * 100).toFixed(0)}%
              </Text>
              <Text style={[styles.additionalStatLabel, { color: tc.textMuted }]}>AI Confidence</Text>
            </View>
            <View style={[styles.additionalStatCard, { backgroundColor: tc.card, borderColor: tc.border }]}>
              <AlertCircle size={22} color={colors.error} />
              <Text style={[styles.additionalStatValue, { color: tc.text }]} numberOfLines={2}>
                {stats?.mostCommonDisease || 'None'}
              </Text>
              <Text style={[styles.additionalStatLabel, { color: tc.textMuted }]}>Top Disease</Text>
            </View>
          </View>
        </View>

        {/* Progress Comparison: all data from backend (entries from get_timelapse API – date, image, severity, confidence, score) */}
        {firstScanEntry && latestScanEntry && data.entries.length >= 2 && (
          <View style={styles.comparisonSection}>
            <View style={styles.comparisonHeader}>
              <GitCompare size={24} color={colors.primary} />
              <Text style={[styles.comparisonTitle, { color: tc.text }]}>Progress Comparison</Text>
            </View>
            <View style={[styles.comparisonCard, { backgroundColor: tc.card, borderColor: tc.border }]}>
              <View style={styles.comparisonRow}>
                {/* First Scan: earliest by user-input date */}
                <View style={[styles.comparisonItem, { backgroundColor: tc.screenSecondary }]}>
                  <Text style={[styles.comparisonLabel, { color: tc.text }]}>First Scan</Text>
                  <Text style={[styles.comparisonDate, { color: tc.textMuted }]}>
                    {formatEntryDate(firstScanEntry.date)}
                  </Text>
                  {getTimelapseImageUrl(firstScanEntry.photo_url) ? (
                    <Image
                      source={{ uri: getTimelapseImageUrl(firstScanEntry.photo_url)!, cache: 'reload' }}
                      style={styles.comparisonImage}
                      onError={() => markImageFailed(firstScanEntry.id)}
                    />
                  ) : (
                    <View style={[styles.comparisonImage, styles.imagePlaceholder, { backgroundColor: tc.screenSecondary }]}>
                      <Text style={[styles.imagePlaceholderText, { color: tc.textMuted }]}>No image</Text>
                    </View>
                  )}
                  <View style={styles.comparisonStats}>
                    <View style={[styles.comparisonStat, { backgroundColor: tc.card, borderColor: tc.border }]}>
                      <Text style={[styles.comparisonStatLabel, { color: tc.textMuted }]}>Severity</Text>
                      <View
                        style={[
                          styles.comparisonSeverityBadge,
                          { backgroundColor: getSeverityColor(firstScanEntry.severity_score) },
                        ]}
                      >
                        <Text style={styles.comparisonSeverityText}>
                          {getSeverityLabel(firstScanEntry.severity)}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.comparisonStat, { backgroundColor: tc.card, borderColor: tc.border }]}>
                      <Text style={[styles.comparisonStatLabel, { color: tc.textMuted }]}>Confidence</Text>
                      <Text style={[styles.comparisonStatValue, { color: tc.text }]}>
                        {firstScanEntry.ai_confidence != null
                          ? `${(firstScanEntry.ai_confidence * 100).toFixed(0)}%`
                          : 'N/A'}
                      </Text>
                    </View>
                    <View style={[styles.comparisonStat, { backgroundColor: tc.card, borderColor: tc.border }]}>
                      <Text style={[styles.comparisonStatLabel, { color: tc.textMuted }]}>Score</Text>
                      <Text style={[styles.comparisonStatValue, { color: tc.text }]}>
                        {firstScanEntry.severity_score ?? 0}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.comparisonArrow}>
                  <ArrowRight size={32} color={colors.primary} />
                </View>

                {/* Latest Scan: most recent by user-input date */}
                <View style={[styles.comparisonItem, { backgroundColor: tc.screenSecondary }]}>
                  <Text style={[styles.comparisonLabel, { color: tc.text }]}>Latest Scan</Text>
                  <Text style={[styles.comparisonDate, { color: tc.textMuted }]}>
                    {formatEntryDate(latestScanEntry.date)}
                  </Text>
                  {getTimelapseImageUrl(latestScanEntry.photo_url) ? (
                    <Image
                      source={{ uri: getTimelapseImageUrl(latestScanEntry.photo_url)!, cache: 'reload' }}
                      style={styles.comparisonImage}
                      onError={() => markImageFailed(latestScanEntry.id)}
                    />
                  ) : (
                    <View style={[styles.comparisonImage, styles.imagePlaceholder, { backgroundColor: tc.screenSecondary }]}>
                      <Text style={[styles.imagePlaceholderText, { color: tc.textMuted }]}>No image</Text>
                    </View>
                  )}
                  <View style={styles.comparisonStats}>
                    <View style={[styles.comparisonStat, { backgroundColor: tc.card, borderColor: tc.border }]}>
                      <Text style={[styles.comparisonStatLabel, { color: tc.textMuted }]}>Severity</Text>
                      <View
                        style={[
                          styles.comparisonSeverityBadge,
                          { backgroundColor: getSeverityColor(latestScanEntry.severity_score) },
                        ]}
                      >
                        <Text style={styles.comparisonSeverityText}>
                          {getSeverityLabel(latestScanEntry.severity)}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.comparisonStat, { backgroundColor: tc.card, borderColor: tc.border }]}>
                      <Text style={[styles.comparisonStatLabel, { color: tc.textMuted }]}>Confidence</Text>
                      <Text style={[styles.comparisonStatValue, { color: tc.text }]}>
                        {latestScanEntry.ai_confidence != null
                          ? `${(latestScanEntry.ai_confidence * 100).toFixed(0)}%`
                          : 'N/A'}
                      </Text>
                    </View>
                    <View style={[styles.comparisonStat, { backgroundColor: tc.card, borderColor: tc.border }]}>
                      <Text style={[styles.comparisonStatLabel, { color: tc.textMuted }]}>Score</Text>
                      <Text style={[styles.comparisonStatValue, { color: tc.text }]}>
                        {latestScanEntry.severity_score ?? 0}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Improvement: based on first vs latest scan details */}
              {(() => {
                const firstEntry = firstScanEntry;
                const latestEntry = latestScanEntry;
                const severityChange = (latestEntry.severity_score ?? 0) - (firstEntry.severity_score ?? 0);
                const confidenceChange = (latestEntry.ai_confidence ?? 0) - (firstEntry.ai_confidence ?? 0);
                const isImproving = severityChange < 0;
                const daysSpan = Math.max(
                  0,
                  Math.ceil(
                    (new Date(latestEntry.date).getTime() - new Date(firstEntry.date).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                );

                return (
                  <View style={styles.improvementCard}>
                    <LinearGradient
                      colors={
                        isImproving
                          ? [colors.success, colors.primaryDark]
                          : [colors.warning, '#D97706']
                      }
                      style={styles.improvementGradient}
                    >
                      {isImproving ? (
                        <Award size={24} color="white" />
                      ) : (
                        <AlertTriangle size={24} color="white" />
                      )}
                      <Text style={styles.improvementTitle}>
                        {isImproving ? 'Improvement detected' : 'No improvement detected'}
                      </Text>
                      <View style={styles.improvementDetails}>
                        <View style={styles.improvementDetail}>
                          <Text style={styles.improvementLabel}>Severity change</Text>
                          <Text style={styles.improvementValue}>
                            {severityChange > 0 ? '+' : ''}{severityChange.toFixed(1)} pts
                            {isImproving ? ' ↓' : severityChange > 0 ? ' ↑' : ' —'}
                          </Text>
                        </View>
                        <View style={styles.improvementDetail}>
                          <Text style={styles.improvementLabel}>Confidence change</Text>
                          <Text style={styles.improvementValue}>
                            {confidenceChange >= 0 ? '+' : ''}{(confidenceChange * 100).toFixed(1)}%
                          </Text>
                        </View>
                        <View style={styles.improvementDetail}>
                          <Text style={styles.improvementLabel}>Time span</Text>
                          <Text style={styles.improvementValue}>{daysSpan} days</Text>
                        </View>
                      </View>
                      <Text style={styles.improvementMessage}>
                        {isImproving
                          ? 'Crop health is improving. Keep monitoring.'
                          : 'Severity unchanged or increased. Consider treatment or more scans.'}
                      </Text>
                    </LinearGradient>
                  </View>
                );
              })()}
            </View>
          </View>
        )}

        {/* Chart Tabs: Severity, Weather, Disease – selected tab highlighted */}
        <View style={styles.chartTabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartTabs}>
            <TouchableOpacity
              style={[
                styles.chartTab,
                { backgroundColor: tc.card, borderColor: tc.border },
                activeChart === 'severity' && [
                  styles.chartTabActive,
                  { backgroundColor: isDark ? 'rgba(34,197,94,0.18)' : colors.primaryBg, borderColor: colors.primary },
                ],
              ]}
              onPress={() => setActiveChart('severity')}
              activeOpacity={0.8}
            >
              <LineChartIcon size={20} color={activeChart === 'severity' ? colors.primary : tc.textMuted} />
              <Text
                style={[
                  styles.chartTabText,
                  { color: tc.textMuted },
                  activeChart === 'severity' && [styles.chartTabTextActive, { color: colors.primary }],
                ]}
              >
                Severity
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.chartTab,
                { backgroundColor: tc.card, borderColor: tc.border },
                activeChart === 'weather' && [
                  styles.chartTabActive,
                  { backgroundColor: isDark ? 'rgba(34,197,94,0.18)' : colors.primaryBg, borderColor: colors.primary },
                ],
              ]}
              onPress={() => setActiveChart('weather')}
              activeOpacity={0.8}
            >
              <Cloud size={20} color={activeChart === 'weather' ? colors.primary : tc.textMuted} />
              <Text
                style={[
                  styles.chartTabText,
                  { color: tc.textMuted },
                  activeChart === 'weather' && [styles.chartTabTextActive, { color: colors.primary }],
                ]}
              >
                Weather
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.chartTab,
                { backgroundColor: tc.card, borderColor: tc.border },
                activeChart === 'disease' && [
                  styles.chartTabActive,
                  { backgroundColor: isDark ? 'rgba(34,197,94,0.18)' : colors.primaryBg, borderColor: colors.primary },
                ],
              ]}
              onPress={() => setActiveChart('disease')}
              activeOpacity={0.8}
            >
              <PieChartIcon size={20} color={activeChart === 'disease' ? colors.primary : tc.textMuted} />
              <Text
                style={[
                  styles.chartTabText,
                  { color: tc.textMuted },
                  activeChart === 'disease' && [styles.chartTabTextActive, { color: colors.primary }],
                ]}
              >
                Disease
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Charts Section – white background, one chart per tab */}
        <View style={styles.chartsSection}>
          {activeChart === 'severity' && severityChartData && (
            <View style={[styles.chartCard, { backgroundColor: tc.card, borderColor: tc.border }]}>
              <View style={styles.chartHeader}>
                <LineChartIcon size={24} color={colors.primary} />
                <Text style={[styles.chartTitle, { color: tc.text }]}>Disease Severity Trend</Text>
              </View>
              <LineChart
                data={severityChartData}
                width={chartWidth}
                height={isSmallScreen ? 200 : 240}
                chartConfig={chartConfigSeverity}
                bezier
                style={styles.chart}
                verticalLabelRotation={-45}
              />
            </View>
          )}

          {activeChart === 'weather' && weatherChartData && (
            <View style={[styles.chartCard, { backgroundColor: tc.card, borderColor: tc.border }]}>
              <View style={styles.chartHeader}>
                <Cloud size={24} color={colors.info} />
                <Text style={[styles.chartTitle, { color: tc.text }]}>Weather Trends</Text>
              </View>
              <LineChart
                data={weatherChartData}
                width={chartWidth}
                height={isSmallScreen ? 200 : 240}
                chartConfig={chartConfigWeatherTemp}
                bezier
                style={styles.chart}
                verticalLabelRotation={-45}
              />
              <View style={styles.weatherLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                  <Text style={[styles.legendText, { color: tc.textMuted }]}>Temperature (°C)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
                  <Text style={[styles.legendText, { color: tc.textMuted }]}>Humidity (%)</Text>
                </View>
              </View>
            </View>
          )}

          {activeChart === 'disease' && diseasePieData.length > 0 && (
            <View style={[styles.chartCard, { backgroundColor: tc.card, borderColor: tc.border }]}>
              <View style={styles.chartHeader}>
                <PieChartIcon size={24} color={colors.primary} />
                <Text style={[styles.chartTitle, { color: tc.text }]}>Disease Distribution</Text>
              </View>
              <PieChart
                data={diseasePieData}
                width={cardWidth - spacing.lg * 2}
                height={isSmallScreen ? 200 : 240}
                chartConfig={chartConfigPie}
                accessor="population"
                backgroundColor={tc.chartBg}
                paddingLeft="15"
                absolute
              />
              <View style={[styles.severityBreakdownList, { borderTopColor: tc.border }]}>
                <Text style={[styles.chartSubtitle, { color: tc.textMuted }]}>Severity by scan</Text>
                {Object.entries(severityDistribution).length > 0 ? (
                  Object.entries(severityDistribution).map(([severityLabel, count]) => (
                    <View key={severityLabel} style={styles.severityBreakdownRow}>
                      <View
                        style={[
                          styles.severityBreakdownDot,
                          {
                            backgroundColor: getSeverityColor(
                              severityLabel === 'None' ? 0
                                : severityLabel === 'Mild' ? 1
                                : severityLabel === 'Moderate' ? 2
                                : 3
                            ),
                          },
                        ]}
                      />
                      <Text style={[styles.severityBreakdownLabel, { color: tc.text }]}>{severityLabel || 'Healthy'}</Text>
                      <Text style={[styles.severityBreakdownCount, { color: tc.textMuted }]}>
                        {count} scan{count !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={[styles.severityBreakdownEmpty, { color: tc.textMuted }]}>No severity data</Text>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Growth Progress Graph - Line Chart */}
        {monthGroups.length > 0 && (
          <View style={styles.chartsSection}>
            <View style={[styles.chartCard, { backgroundColor: tc.card, borderColor: tc.border }]}>
              <View style={styles.chartHeader}>
                <TrendingUp size={24} color={colors.primary} />
                <Text style={[styles.chartTitle, { color: tc.text }]}>Growth Progress</Text>
              </View>
              <Text style={[styles.chartDesc, { color: tc.textMuted }]}>
                Plant growth trend over time based on health scores
              </Text>
              <LineChart
                data={{
                  labels: monthGroups.map((g) => g.monthLabel),
                  datasets: [{
                    data: monthGroups.map((g) => {
                      // Growth % = inverse of severity (higher health = more growth)
                      const healthPct = Math.max(0, Math.min(100, 100 - (g.avgSeverity * 33.3)));
                      return Math.round(healthPct * 10) / 10;
                    }),
                    color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
                    strokeWidth: 3,
                  }],
                }}
                width={chartWidth}
                height={isSmallScreen ? 200 : 240}
                chartConfig={{
                  ...chartConfigBase,
                  color: (o = 1) => `rgba(34, 197, 94, ${o})`,
                  propsForDots: { r: 6, strokeWidth: 2, stroke: '#22C55E', fill: tc.card },
                }}
                bezier
                withShadow
                withDots
                withInnerLines
                withOuterLines={false}
                style={styles.chart}
                verticalLabelRotation={-45}
                yAxisSuffix="%"
              />
              <View style={styles.chartLegendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
                  <Text style={[styles.legendText, { color: tc.textMuted }]}>Growth %</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Disease Occurrence Timeline - Bar Chart */}
        {monthGroups.length > 0 && (
          <View style={styles.chartsSection}>
            <View style={[styles.chartCard, { backgroundColor: tc.card, borderColor: tc.border }]}>
              <View style={styles.chartHeader}>
                <BarChart3 size={24} color={colors.warning} />
                <Text style={[styles.chartTitle, { color: tc.text }]}>Disease Occurrence Timeline</Text>
              </View>
              <Text style={[styles.chartDesc, { color: tc.textMuted }]}>
                Disease count distribution over time periods
              </Text>
              <BarChart
                data={{
                  labels: monthGroups.map((g) => g.monthLabel),
                  datasets: [{
                    data: monthGroups.map((g) => {
                      // Count entries with disease in each month
                      const entries = data?.entries ?? [];
                      return entries.filter((e) => {
                        const key = `${new Date(e.date).getFullYear()}-${String(new Date(e.date).getMonth() + 1).padStart(2, '0')}`;
                        return key === g.key && e.detected_disease && e.detected_disease !== 'Healthy';
                      }).length;
                    }),
                  }],
                }}
                width={chartWidth}
                height={isSmallScreen ? 200 : 240}
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={{
                  ...chartConfigBase,
                  color: (o = 1) => `rgba(34, 197, 94, ${o})`,
                  barPercentage: 0.7,
                  fillShadowGradient: '#22C55E',
                  fillShadowGradientOpacity: 0.8,
                }}
                style={styles.chart}
                verticalLabelRotation={-45}
                showBarTops
                showValuesOnTopOfBars
                fromZero
              />
              <View style={styles.chartLegendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
                  <Text style={[styles.legendText, { color: tc.textMuted }]}>Disease Cases</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Playback Section */}
        {data.entries.length > 0 && (
          <View style={styles.playbackSection}>
            <View style={[styles.playbackCard, { backgroundColor: tc.card, borderColor: tc.border }]}>
              <View style={styles.playbackHeader}>
                <Text style={[styles.playbackTitle, { color: tc.text }]}>TimeLapse Playback</Text>
                <TouchableOpacity
                  style={styles.playButton}
                  onPress={() => setIsPlaying(!isPlaying)}
                >
                  <LinearGradient
                    colors={isPlaying ? [colors.error, '#DC2626'] : [colors.primary, colors.primaryDark]}
                    style={styles.playButtonGradient}
                  >
                    {isPlaying ? (
                      <Pause size={20} color="white" />
                    ) : (
                      <Play size={20} color="white" />
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              {currentPlayEntry && (
                <View style={styles.playbackImageContainer}>
                  {getTimelapseImageUrl(currentPlayEntry.photo_url) ? (
                    <Image
                      source={{ uri: getTimelapseImageUrl(currentPlayEntry.photo_url)!, cache: 'reload' }}
                      style={styles.playbackImage}
                      onError={() => markImageFailed(currentPlayEntry.id)}
                    />
                  ) : (
                    <View style={[styles.playbackImage, styles.imagePlaceholder, { backgroundColor: tc.screenSecondary }]}>
                      <Text style={[styles.imagePlaceholderText, { color: tc.textMuted }]}>No image</Text>
                    </View>
                  )}
                  <View style={styles.playbackOverlay}>
                    <Text style={styles.playbackDate}>
                      {formatEntryDate(currentPlayEntry.date)}
                    </Text>
                    <View
                      style={[
                        styles.severityBadge,
                        {
                          backgroundColor: getSeverityColor(currentPlayEntry.severity_score),
                        },
                      ]}
                    >
                      <Text style={styles.severityBadgeText}>
                        {getSeverityLabel(currentPlayEntry.severity)}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Timeline */}
        <View style={styles.timelineContainer}>
          <Text style={[styles.timelineTitle, { color: tc.text }]}>Timeline</Text>
          {data.entries.map((entry, index) => (
            <TouchableOpacity
              key={entry.id}
              style={styles.timelineItem}
              onPress={() => setSelectedEntry(entry)}
              activeOpacity={0.8}
            >
              <View style={[styles.timelineCard, { backgroundColor: tc.card, borderColor: tc.border }]}>
                {getTimelapseImageUrl(entry.photo_url) && !failedImageIds.has(entry.id) ? (
                  <Image
                    source={{ uri: getTimelapseImageUrl(entry.photo_url)!, cache: 'reload' }}
                    style={styles.timelineImage}
                    onError={() => markImageFailed(entry.id)}
                  />
                ) : (
                  <View style={[styles.timelineImage, styles.imagePlaceholder, { backgroundColor: tc.screenSecondary }]}>
                    <Text style={[styles.imagePlaceholderText, { color: tc.textMuted }]}>No image</Text>
                  </View>
                )}
                <View style={styles.timelineContent}>
                  <View style={styles.timelineHeader}>
                    <Calendar size={16} color={tc.textMuted} />
                    <Text style={[styles.timelineDate, { color: tc.textMuted }]}>
                      {new Date(entry.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  {entry.detected_disease && (
                    <Text style={[styles.timelineDisease, { color: tc.text }]}>
                      {entry.detected_disease}
                    </Text>
                  )}
                  <View style={styles.timelineBadges}>
                    <View
                      style={[
                        styles.severityChip,
                        {
                          backgroundColor: getSeverityColor(entry.severity_score),
                        },
                      ]}
                    >
                      <Text style={styles.severityChipText}>
                        {getSeverityLabel(entry.severity)}
                      </Text>
                    </View>
                    {entry.weather_humidity && (
                      <View style={[styles.weatherBadge, { backgroundColor: tc.screenSecondary }]}>
                        <Droplets size={14} color={colors.info} />
                        <Text style={[styles.weatherText, { color: tc.text }]}>
                          {entry.weather_humidity}%
                        </Text>
                      </View>
                    )}
                    {entry.weather_temp && (
                      <View style={[styles.weatherBadge, { backgroundColor: tc.screenSecondary }]}>
                        <Sun size={14} color={colors.warning} />
                        <Text style={[styles.weatherText, { color: tc.text }]}>
                          {entry.weather_temp}°C
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Upload FAB */}
      <TouchableOpacity
        style={styles.uploadFAB}
        onPress={() => router.push(`/(farmer)/timelapse-upload?cropId=${cropId}`)}
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.uploadFABGradient}
        >
          <Camera size={24} color="white" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Entry Detail Modal */}
      <Modal
        visible={selectedEntry !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedEntry(null)}
      >
        {selectedEntry && (
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.8)']}
              style={styles.modalContent}
            >
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setSelectedEntry(null)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
              {getTimelapseImageUrl(selectedEntry.highlighted_photo_url || selectedEntry.photo_url) ? (
                <Image
                  source={{
                    uri: getTimelapseImageUrl(selectedEntry.highlighted_photo_url || selectedEntry.photo_url)!,
                    cache: 'reload',
                  }}
                  style={styles.modalImage}
                  resizeMode="contain"
                  onError={() => markImageFailed(selectedEntry.id)}
                />
              ) : (
                <View style={[styles.modalImage, styles.imagePlaceholder, { backgroundColor: tc.screenSecondary }]}>
                  <Text style={[styles.imagePlaceholderText, { color: tc.textMuted }]}>No image</Text>
                </View>
              )}
              <View style={styles.modalDetails}>
                <Text style={styles.modalDate}>
                  {new Date(selectedEntry.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
                {selectedEntry.detected_disease && (
                  <Text style={styles.modalDisease}>
                    {selectedEntry.detected_disease}
                  </Text>
                )}
                <View style={styles.modalStats}>
                  <View style={styles.modalStat}>
                    <Text style={styles.modalStatLabel}>Severity</Text>
                    <Text
                      style={[
                        styles.modalStatValue,
                        { color: getSeverityColor(selectedEntry.severity_score) },
                      ]}
                    >
                      {getSeverityLabel(selectedEntry.severity)}
                    </Text>
                  </View>
                  {selectedEntry.ai_confidence && (
                    <View style={styles.modalStat}>
                      <Text style={styles.modalStatLabel}>Confidence</Text>
                      <Text style={styles.modalStatValue}>
                        {(selectedEntry.ai_confidence * 100).toFixed(1)}%
                      </Text>
                    </View>
                  )}
                </View>
                {selectedEntry.notes && (
                  <View style={styles.modalNotes}>
                    <Text style={styles.modalNotesLabel}>Notes</Text>
                    <Text style={styles.modalNotesText}>{selectedEntry.notes}</Text>
                  </View>
                )}
              </View>
            </LinearGradient>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.base,
  },
  loadingText: {
    fontSize: typography.fontSize.lg,
    color: 'white',
    fontWeight: typography.fontWeight.semibold as any,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing['5xl'],
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xl,
    marginBottom: spacing.lg,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: spacing.base,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
    marginTop: spacing.base,
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold as any,
    color: 'white',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: typography.fontSize.base,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: statCardWidth,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.lg,
  },
  statCardGreen: {
    backgroundColor: colors.primaryDark,
  },
  statCardOrange: {
    backgroundColor: '#D97706',
  },
  statCardGradient: {
    flex: 1,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 112,
  },
  statValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold as any,
    color: 'white',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
    fontWeight: typography.fontWeight.medium as any,
  },
  additionalStatsGrid: {
    paddingHorizontal: spacing.base,
    marginBottom: spacing.xl,
  },
  additionalStatsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  additionalStatCard: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 96,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  additionalStatValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold as any,
    color: colors.text.primary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  additionalStatLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    fontWeight: typography.fontWeight.medium as any,
  },
  chartTabsContainer: {
    paddingHorizontal: spacing.base,
    marginBottom: spacing.lg,
  },
  chartTabs: {
    flexDirection: 'row',
  },
  chartTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.bg.primary,
    marginRight: spacing.md,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  chartTabActive: {
    backgroundColor: colors.primaryBg,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  chartTabText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold as any,
    color: colors.text.secondary,
  },
  chartTabTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold as any,
  },
  chartsSection: {
    paddingHorizontal: spacing.base,
    marginBottom: spacing.xl,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  chartTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold as any,
    color: colors.text.primary,
  },
  chartSubtitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
    color: colors.text.secondary,
    marginTop: spacing.base,
    marginBottom: spacing.sm,
  },
  chart: {
    marginVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  weatherLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  severityBarContainer: {
    marginTop: spacing.base,
  },
  severityBreakdownList: {
    marginTop: spacing.base,
    paddingTop: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  severityBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  severityBreakdownDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  severityBreakdownLabel: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
    color: colors.text.primary,
  },
  severityBreakdownCount: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  severityBreakdownEmpty: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    fontStyle: 'italic',
    paddingVertical: spacing.sm,
  },
  predictionCard: {
    marginTop: spacing.base,
    padding: spacing.md,
    backgroundColor: colors.primaryBg,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  predictionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold as any,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  predictionText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  predictionTextMuted: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  playbackSection: {
    paddingHorizontal: spacing.base,
    marginBottom: spacing.xl,
  },
  playbackCard: {
    backgroundColor: colors.bg.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  playbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  playbackTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold as any,
    color: colors.text.primary,
  },
  playButton: {
    borderRadius: 20,
    overflow: 'hidden',
    ...shadows.sm,
  },
  playButtonGradient: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playbackImageContainer: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    height: isSmallScreen ? 180 : 220,
    ...shadows.md,
  },
  playbackImage: {
    width: '100%',
    height: '100%',
  },
  playbackOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playbackDate: {
    color: 'white',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold as any,
  },
  severityBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  severityBadgeText: {
    color: 'white',
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold as any,
  },
  timelineContainer: {
    paddingHorizontal: spacing.base,
    marginBottom: spacing.xl,
  },
  timelineTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold as any,
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  timelineItem: {
    marginBottom: spacing.lg,
  },
  timelineCard: {
    flexDirection: 'row',
    backgroundColor: colors.bg.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.lg,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  timelineImage: {
    width: isSmallScreen ? 90 : 100,
    height: isSmallScreen ? 90 : 100,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.bg.tertiary,
    ...shadows.sm,
  },
  timelineContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  timelineDate: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium as any,
  },
  timelineDisease: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold as any,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  timelineBadges: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  severityChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  severityChipText: {
    color: 'white',
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold as any,
  },
  weatherBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.bg.tertiary,
    borderRadius: borderRadius.sm,
  },
  weatherText: {
    color: colors.text.primary,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium as any,
  },
  uploadFAB: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    ...shadows.xl,
    zIndex: 10,
  },
  uploadFABGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['4xl'],
  },
  emptyTitle: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold as any,
    color: 'white',
    marginTop: spacing.xl,
    marginBottom: spacing.base,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: typography.fontSize.base,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: spacing['2xl'],
  },
  emptyButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.lg,
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.base,
  },
  emptyButtonText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold as any,
    color: 'white',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: Math.min(width - spacing.base * 2, 400),
    maxHeight: height - spacing['5xl'],
    borderRadius: borderRadius['2xl'],
    padding: spacing['2xl'],
    ...shadows['2xl'],
  },
  modalClose: {
    alignSelf: 'flex-end',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  modalCloseText: {
    color: 'white',
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold as any,
  },
  modalImage: {
    width: '100%',
    height: isSmallScreen ? 250 : 320,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  modalDetails: {
    gap: spacing.base,
  },
  modalDate: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold as any,
    color: 'white',
  },
  modalDisease: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold as any,
    color: colors.primary,
  },
  modalStats: {
    flexDirection: 'row',
    gap: spacing.base,
  },
  modalStat: {
    flex: 1,
  },
  modalStatLabel: {
    fontSize: typography.fontSize.xs,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: spacing.xs,
  },
  modalStatValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold as any,
    color: 'white',
  },
  modalNotes: {
    marginTop: spacing.sm,
  },
  modalNotesLabel: {
    fontSize: typography.fontSize.xs,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: spacing.xs,
  },
  modalNotesText: {
    fontSize: typography.fontSize.sm,
    color: 'white',
    lineHeight: typography.lineHeight.normal,
  },
  comparisonSection: {
    paddingHorizontal: spacing.base,
    marginBottom: spacing.xl,
  },
  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  comparisonTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold as any,
    color: colors.text.primary,
  },
  comparisonCard: {
    backgroundColor: colors.bg.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  comparisonRow: {
    flexDirection: isSmallScreen ? 'column' : 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.base,
  },
  comparisonItem: {
    flex: 1,
    alignItems: 'center',
    width: isSmallScreen ? '100%' : 'auto',
    padding: spacing.md,
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  comparisonLabel: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold as any,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  comparisonDate: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    fontWeight: typography.fontWeight.medium as any,
    textAlign: 'center',
  },
  comparisonImage: {
    width: isSmallScreen ? 120 : 110,
    height: isSmallScreen ? 120 : 110,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.bg.tertiary,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  imagePlaceholder: {
    backgroundColor: colors.bg.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  comparisonStats: {
    width: '100%',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  comparisonStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.bg.primary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  comparisonStatLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium as any,
  },
  comparisonStatValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold as any,
    color: colors.text.primary,
  },
  comparisonSeverityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  comparisonSeverityText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold as any,
    color: 'white',
  },
  comparisonArrow: {
    padding: spacing.sm,
    transform: [{ rotate: isSmallScreen ? '90deg' : '0deg' }],
  },
  improvementCard: {
    marginTop: spacing.lg,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.lg,
  },
  improvementGradient: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  improvementTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold as any,
    color: 'white',
    textAlign: 'center',
  },
  improvementDetails: {
    width: '100%',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  improvementDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  improvementLabel: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.9)',
  },
  improvementValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold as any,
    color: 'white',
  },
  improvementMessage: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  chartDesc: {
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.md,
    marginLeft: spacing.xs,
  },
  chartLegendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
  },
});
