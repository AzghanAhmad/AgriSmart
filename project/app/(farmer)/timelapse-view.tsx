/**
 * Smart TimeLapse View Screen - Complete Feature
 * 
 * Comprehensive timeline dashboard with multiple chart types, weather trends,
 * disease distribution, severity analysis, and predictive insights.
 */
import React, { useState, useEffect, useRef } from 'react';
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
  };
}

interface Prediction {
  predicted_severity: string;
  score: number;
  future_humidity: number;
  message: string;
}

type ChartType = 'severity' | 'weather' | 'disease' | 'confidence';

// Helper component for images - Robust error handling for demo
const ImageWithFallback = ({ 
  primaryUrl, 
  fallbackUrl, 
  style, 
  resizeMode = 'cover',
  onError,
  onLoad,
  imageKey
}: {
  primaryUrl: string | null;
  fallbackUrl: string | null;
  style: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  onError?: (e: any) => void;
  onLoad?: () => void;
  imageKey?: string;
}) => {
  const [currentUrl, setCurrentUrl] = useState<string | null>(primaryUrl);
  const [hasTriedFallback, setHasTriedFallback] = useState(false);
  const [showPlaceholder, setShowPlaceholder] = useState(false);
  
  // Reset when URLs change
  useEffect(() => {
    setCurrentUrl(primaryUrl);
    setHasTriedFallback(false);
    setShowPlaceholder(false);
  }, [primaryUrl, fallbackUrl]);

  const handleError = (e: any) => {
    // Try fallback if we haven't tried it yet
    if (!hasTriedFallback && fallbackUrl && currentUrl === primaryUrl) {
      setHasTriedFallback(true);
      setCurrentUrl(fallbackUrl);
      return; // Component will re-render with fallback URL
    }
    
    // Both failed - show placeholder (silently, no console logs)
    setShowPlaceholder(true);
    if (onError) {
      try {
        onError(e);
      } catch (err) {
        // Silently handle callback errors
      }
    }
  };

  const handleLoad = () => {
    // Image loaded successfully, hide placeholder
    setShowPlaceholder(false);
    if (onLoad) {
      try {
        onLoad();
      } catch (err) {
        // Silently handle callback errors
      }
    }
  };

  // Show placeholder if both URLs failed or no URL exists
  if (showPlaceholder || !currentUrl) {
    return (
      <Image
        source={require('@/assets/crops/Wheat.jpg')}
        style={style}
        resizeMode={resizeMode}
      />
    );
  }

  // If we have a URL, try to load it with error boundary
  if (currentUrl) {
    try {
      return (
        <Image
          key={imageKey ? `${imageKey}-${currentUrl}-${hasTriedFallback ? 'fallback' : 'primary'}` : `${currentUrl}-${hasTriedFallback ? 'fallback' : 'primary'}`}
          source={{ 
            uri: currentUrl,
            cache: 'default' // Use default cache
          }}
          style={style}
          resizeMode={resizeMode}
          onError={(e) => {
            try {
              handleError(e);
            } catch (err) {
              // If error handler fails, show placeholder (silently)
              setShowPlaceholder(true);
            }
          }}
          onLoad={() => {
            try {
              handleLoad();
            } catch (err) {
              // Silently handle load callback errors
            }
          }}
        />
      );
    } catch (error) {
      // If rendering fails, show placeholder (silently)
      return (
        <Image
          source={require('@/assets/crops/Wheat.jpg')}
          style={style}
          resizeMode={resizeMode}
        />
      );
    }
  }

  // Show placeholder only if no URL exists
  return (
    <Image
      source={require('@/assets/crops/Wheat.jpg')}
      style={style}
      resizeMode={resizeMode}
    />
  );
};

export default function TimeLapseViewScreen() {
  const router = useRouter();
  const { cropId } = useLocalSearchParams<{ cropId: string }>();
  
  const [data, setData] = useState<TimelapseData | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimelapseEntry | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayIndex, setCurrentPlayIndex] = useState(0);
  const [activeChart, setActiveChart] = useState<ChartType>('severity');
  
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadData();
    loadPrediction();
  }, [cropId]);

  useEffect(() => {
    if (isPlaying && data?.entries) {
      startPlayback();
    } else {
      stopPlayback();
    }
    return () => stopPlayback();
  }, [isPlaying, data]);

  const loadData = async () => {
    if (!cropId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        setLoading(false);
        return;
      }

      const baseUrl = getApiBaseUrl();
      const url = `${baseUrl}/api/timelapse/${cropId}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
      // Silently handle errors - allow UI to show empty state
    } catch (error: any) {
      // Silently handle errors - don't crash the app
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
        // Silently handle prediction errors
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    loadPrediction();
  };

  const startPlayback = () => {
    if (!data?.entries || data.entries.length === 0) return;
    
    setCurrentPlayIndex(0);
    
    const interval = setInterval(() => {
      setCurrentPlayIndex((prev) => {
        const next = prev + 1;
        if (next >= data.entries.length) {
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

  const getSeverityLabel = (severity: string | null) => {
    if (!severity || severity === 'None') return 'Healthy';
    return severity;
  };

  // Prepare chart data
  const entriesReversed = data?.entries ? [...data.entries].reverse() : [];
  
  const severityChartData = entriesReversed.length > 0 ? {
    labels: entriesReversed.map((e) => {
      const date = new Date(e.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }),
    datasets: [{
      data: entriesReversed.map((e) => e.severity_score ?? 0),
      color: (opacity = 1) => `rgba(236, 72, 153, ${opacity})`, // Vibrant pink/magenta
      strokeWidth: 3,
    }],
  } : null;

  const weatherChartData = entriesReversed.length > 0 ? {
    labels: entriesReversed.map((e) => {
      const date = new Date(e.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }),
    datasets: [
      {
        data: entriesReversed.map((e) => e.weather_temp ?? 0),
        color: (opacity = 1) => `rgba(251, 146, 60, ${opacity})`, // Warm orange for temperature
        strokeWidth: 3,
      },
      {
        data: entriesReversed.map((e) => e.weather_humidity ?? 0),
        color: (opacity = 1) => `rgba(96, 165, 250, ${opacity})`, // Bright sky blue for humidity
        strokeWidth: 3,
      },
    ],
  } : null;

  // Disease distribution
  const diseaseDistribution = data?.entries.reduce((acc, entry) => {
    const disease = entry.detected_disease || 'Healthy';
    acc[disease] = (acc[disease] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const diseasePieData = Object.entries(diseaseDistribution).map(([name, count], index) => {
    // User-friendly vibrant color palette - easy to distinguish
    const colors_list = [
      '#10B981', // Emerald green - healthy
      '#F59E0B', // Amber - warning
      '#EF4444', // Red - critical
      '#8B5CF6', // Purple - disease
      '#3B82F6', // Blue - info
      '#EC4899', // Pink - other
      '#14B8A6', // Teal - additional
      '#F97316', // Orange - additional
    ];
    return {
      name: name.length > 15 ? name.substring(0, 15) + '...' : name,
      population: count,
      color: colors_list[index % colors_list.length],
      legendFontColor: '#FFFFFF',
      legendFontSize: 12,
    };
  });

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

  // Confidence chart
  const confidenceChartData = entriesReversed.length > 0 ? {
    labels: entriesReversed.map((e) => {
      const date = new Date(e.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }),
    datasets: [{
      data: entriesReversed.map((e) => (e.ai_confidence ?? 0) * 100),
      color: (opacity = 1) => `rgba(168, 85, 247, ${opacity})`, // Vibrant purple
      strokeWidth: 3,
    }],
  } : null;

  // Calculate statistics with fallbacks
  const stats = data ? {
    totalEntries: data.stats.total_entries || 0,
    avgSeverity: data.stats.avg_severity_score || 0,
    trend: data.stats.trend || 'stable',
    avgTemp: (() => {
      const temps = data.entries.filter(e => e.weather_temp !== null && e.weather_temp !== undefined);
      if (temps.length === 0) return null;
      const sum = temps.reduce((acc, e) => acc + (e.weather_temp || 0), 0);
      return sum / temps.length;
    })(),
    avgHumidity: (() => {
      const humidities = data.entries.filter(e => e.weather_humidity !== null && e.weather_humidity !== undefined);
      if (humidities.length === 0) return null;
      const sum = humidities.reduce((acc, e) => acc + (e.weather_humidity || 0), 0);
      return sum / humidities.length;
    })(),
    avgConfidence: (() => {
      const confidences = data.entries.filter(e => e.ai_confidence !== null && e.ai_confidence !== undefined);
      if (confidences.length === 0) return 0;
      const sum = confidences.reduce((acc, e) => acc + (e.ai_confidence || 0), 0);
      return sum / confidences.length;
    })(),
    mostCommonDisease: Object.entries(diseaseDistribution).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None',
  } : null;

  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: 'transparent',
    backgroundGradientTo: 'transparent',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: borderRadius.lg,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: colors.primary,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: 'rgba(255, 255, 255, 0.2)',
      strokeWidth: 1,
    },
  };

  if (!cropId) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.loadingContainer}
        >
          <AlertCircle size={48} color="white" />
          <Text style={styles.loadingText}>No Crop Selected</Text>
          <Text style={[styles.loadingText, { fontSize: 14, marginTop: 8 }]}>
            Please select a crop first
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.back()}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.emptyButtonGradient}
            >
              <Text style={styles.emptyButtonText}>Go Back</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
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

  if (!data) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.loadingContainer}
        >
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.loadingText}>Loading TimeLapse Data...</Text>
        </LinearGradient>
      </View>
    );
  }

  if (!data.entries || data.entries.length === 0) {
    return (
      <View style={styles.container}>
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
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark, '#15803D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerOverlay} />
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
              style={styles.backButtonGradient}
            >
              <ArrowLeft size={22} color="white" />
            </LinearGradient>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={styles.sparkleContainer}>
              <Sparkles size={32} color="#FFD700" />
              <View style={styles.sparkleGlow} />
            </View>
            <Text style={styles.headerTitle}>{data.crop_name}</Text>
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>
                {data.stats.total_entries} entries • {data.crop_type}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <LinearGradient
              colors={[colors.primary, colors.primaryDark, '#15803D']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCardGradient}
            >
              <View style={styles.statIconContainer}>
                <Activity size={22} color="white" />
                <View style={styles.statIconGlow} />
              </View>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {stats?.totalEntries || 0}
              </Text>
              <Text style={styles.statLabel}>Total Scans</Text>
            </LinearGradient>
          </View>
          <View style={styles.statCard}>
            <LinearGradient
              colors={['#F59E0B', '#D97706', '#B45309']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCardGradient}
            >
              <View style={styles.statIconContainer}>
                <BarChart3 size={22} color="white" />
                <View style={styles.statIconGlow} />
              </View>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {stats?.avgSeverity.toFixed(1) || '0.0'}
              </Text>
              <Text style={styles.statLabel}>Avg Severity</Text>
            </LinearGradient>
          </View>
          <View style={styles.statCard}>
            <LinearGradient
              colors={
                stats?.trend === 'improving' 
                  ? [colors.success, colors.primaryDark, '#15803D']
                  : stats?.trend === 'worsening'
                  ? [colors.error, '#DC2626', '#B91C1C']
                  : ['#F59E0B', '#D97706', '#B45309']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCardGradient}
            >
              <View style={styles.statIconContainer}>
                {stats?.trend === 'improving' ? (
                  <TrendingDown size={22} color="white" />
                ) : stats?.trend === 'worsening' ? (
                  <TrendingUp size={22} color="white" />
                ) : (
                  <Minus size={22} color="white" />
                )}
                <View style={styles.statIconGlow} />
              </View>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                {stats?.trend ? stats.trend.charAt(0).toUpperCase() + stats.trend.slice(1) : 'STABLE'}
              </Text>
              <Text style={styles.statLabel}>Status</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Additional Stats */}
        <View style={styles.additionalStatsContainer}>
          <View style={styles.additionalStatCard}>
            <Thermometer size={20} color={colors.warning} />
            <Text style={styles.additionalStatValue}>
              {stats?.avgTemp !== null && stats?.avgTemp !== undefined 
                ? `${stats.avgTemp.toFixed(1)}°C` 
                : 'N/A'}
            </Text>
            <Text style={styles.additionalStatLabel}>Avg Temp</Text>
          </View>
          <View style={styles.additionalStatCard}>
            <Droplets size={20} color={colors.info} />
            <Text style={styles.additionalStatValue}>
              {stats?.avgHumidity !== null && stats?.avgHumidity !== undefined 
                ? `${stats.avgHumidity.toFixed(0)}%` 
                : 'N/A'}
            </Text>
            <Text style={styles.additionalStatLabel}>Avg Humidity</Text>
          </View>
          <View style={styles.additionalStatCard}>
            <Activity size={20} color={colors.primary} />
            <Text style={styles.additionalStatValue}>
              {((stats?.avgConfidence ?? 0) * 100).toFixed(0)}%
            </Text>
            <Text style={styles.additionalStatLabel}>AI Confidence</Text>
          </View>
          <View style={styles.additionalStatCard}>
            <AlertCircle size={20} color={colors.error} />
            <Text style={styles.additionalStatValue} numberOfLines={1}>
              {stats?.mostCommonDisease || 'None'}
            </Text>
            <Text style={styles.additionalStatLabel}>Top Disease</Text>
          </View>
        </View>

        {/* Comparison Section - First vs Latest */}
        {data.entries.length >= 2 && (
          <View style={styles.comparisonSection}>
            <View style={styles.comparisonHeader}>
              <GitCompare size={24} color={colors.primary} />
              <Text style={styles.comparisonTitle}>Progress Comparison</Text>
            </View>
            <View style={styles.comparisonCard}>
              <View style={styles.comparisonRow}>
                {/* First Entry - Show first uploaded image (oldest entry) */}
                {(() => {
                  // Entries are ordered newest first (desc order by date)
                  // If 2 entries: [0]=second uploaded (newest), [1]=first uploaded (older)
                  // So First Scan should use index 1 (first uploaded) when there are 2 entries
                  // Otherwise use the oldest entry (last index)
                  const firstEntryIndex = data.entries.length === 2 ? 1 : data.entries.length - 1;
                  const firstEntry = data.entries[firstEntryIndex];
                  
                  const baseUrl = getApiBaseUrl();
                  const primaryImageUrl = firstEntry.photo_url ? `${baseUrl}${firstEntry.photo_url}` : null;
                  const fallbackImageUrl = firstEntry.highlighted_photo_url ? `${baseUrl}${firstEntry.highlighted_photo_url}` : null;
                  
                  return (
                    <View style={styles.comparisonItem}>
                      <Text style={styles.comparisonLabel}>First Scan</Text>
                      <Text style={styles.comparisonDate}>
                        {new Date(firstEntry.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                      <ImageWithFallback
                        imageKey={`first-${firstEntry.id}-${firstEntry.photo_url || 'no-url'}`}
                        primaryUrl={primaryImageUrl}
                        fallbackUrl={fallbackImageUrl}
                        style={styles.comparisonImage}
                        resizeMode="cover"
                      />
                      <View style={styles.comparisonStats}>
                        <View style={styles.comparisonStat}>
                          <Text style={styles.comparisonStatLabel} numberOfLines={1}>Severity</Text>
                          <View
                            style={[
                              styles.comparisonSeverityBadge,
                              { backgroundColor: getSeverityColor(firstEntry.severity_score) },
                            ]}
                          >
                            <Text 
                              style={styles.comparisonSeverityText} 
                              numberOfLines={1}
                              adjustsFontSizeToFit
                              minimumFontScale={0.7}
                            >
                              {getSeverityLabel(firstEntry.severity)}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.comparisonStat}>
                          <Text style={styles.comparisonStatLabel} numberOfLines={1}>Confidence</Text>
                          <Text style={styles.comparisonStatValue} numberOfLines={1}>
                            {firstEntry?.ai_confidence != null
                              ? `${((firstEntry?.ai_confidence ?? 0) * 100).toFixed(0)}%`
                              : 'N/A'}
                          </Text>
                        </View>
                        <View style={styles.comparisonStat}>
                          <Text style={styles.comparisonStatLabel} numberOfLines={1}>Score</Text>
                          <Text style={styles.comparisonStatValue} numberOfLines={1}>
                            {firstEntry.severity_score ?? 0}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })()}

                {/* Arrow */}
                <View style={styles.comparisonArrow}>
                  <ArrowRight size={32} color={colors.primary} />
                </View>

                {/* Latest Entry - Show second uploaded image (newest entry) */}
                <View style={styles.comparisonItem}>
                  <Text style={styles.comparisonLabel}>Latest Scan</Text>
                  {(() => {
                    // Entries are ordered newest first (desc order by date)
                    // If 2 entries: [0] = second uploaded (newest), [1] = first uploaded (older)
                    // So Latest Scan should always use index 0 (newest/second uploaded)
                    const latestEntryIndex = 0;
                    const latestEntry = data.entries[latestEntryIndex];
                    
                    const baseUrl = getApiBaseUrl();
                    const primaryImageUrl = latestEntry.photo_url ? `${baseUrl}${latestEntry.photo_url}` : null;
                    const fallbackImageUrl = latestEntry.highlighted_photo_url ? `${baseUrl}${latestEntry.highlighted_photo_url}` : null;
                    
                    return (
                      <>
                        <Text style={styles.comparisonDate}>
                          {new Date(latestEntry.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Text>
                        <ImageWithFallback
                          imageKey={`latest-${latestEntry.id}-${latestEntry.photo_url || 'no-url'}`}
                          primaryUrl={primaryImageUrl}
                          fallbackUrl={fallbackImageUrl}
                          style={styles.comparisonImage}
                          resizeMode="cover"
                        />
                        <View style={styles.comparisonStats}>
                          <View style={styles.comparisonStat}>
                            <Text style={styles.comparisonStatLabel} numberOfLines={1}>Severity</Text>
                            <View
                              style={[
                                styles.comparisonSeverityBadge,
                                { backgroundColor: getSeverityColor(latestEntry.severity_score) },
                              ]}
                            >
                              <Text 
                                style={styles.comparisonSeverityText} 
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.7}
                              >
                                {getSeverityLabel(latestEntry.severity)}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.comparisonStat}>
                            <Text style={styles.comparisonStatLabel} numberOfLines={1}>Confidence</Text>
                            <Text style={styles.comparisonStatValue} numberOfLines={1}>
                              {latestEntry.ai_confidence
                                ? `${(latestEntry.ai_confidence * 100).toFixed(0)}%`
                                : 'N/A'}
                            </Text>
                          </View>
                          <View style={styles.comparisonStat}>
                            <Text style={styles.comparisonStatLabel} numberOfLines={1}>Score</Text>
                            <Text style={styles.comparisonStatValue} numberOfLines={1}>
                              {latestEntry.severity_score ?? 0}
                            </Text>
                          </View>
                        </View>
                      </>
                    );
                  })()}
                </View>
              </View>

              {/* Improvement Summary */}
              {(() => {
                // First entry: if 2 entries, use index 1 (first uploaded), otherwise use oldest
                const firstEntryIndex = data.entries.length === 2 ? 1 : data.entries.length - 1;
                const firstEntry = data.entries[firstEntryIndex];
                // Latest entry: always use index 0 (newest/second uploaded)
                const latestEntry = data.entries[0];
                const severityChange = (latestEntry.severity_score ?? 0) - (firstEntry.severity_score ?? 0);
                const confidenceChange = (latestEntry.ai_confidence ?? 0) - (firstEntry.ai_confidence ?? 0);
                const isImproving = severityChange < 0;
                const isWorsening = severityChange > 0;
                const isStable = severityChange === 0;

                return (
                  <View style={styles.improvementCard}>
                    <LinearGradient
                      colors={
                        isImproving
                          ? [colors.success, colors.primaryDark]
                          : isWorsening
                          ? [colors.error, '#DC2626']
                          : [colors.warning, '#D97706']
                      }
                      style={styles.improvementGradient}
                    >
                      {isImproving ? (
                        <Award size={24} color="white" />
                      ) : isWorsening ? (
                        <AlertTriangle size={24} color="white" />
                      ) : (
                        <Minus size={24} color="white" />
                      )}
                      <Text style={styles.improvementTitle}>
                        {isImproving
                          ? '🎉 Improvement Detected!'
                          : isWorsening
                          ? '⚠️ Condition Worsening'
                          : '➡️ Condition Stable'}
                      </Text>
                      <View style={styles.improvementDetails}>
                        <View style={styles.improvementDetail}>
                          <Text style={styles.improvementLabel}>Severity Change:</Text>
                          <Text style={styles.improvementValue}>
                            {severityChange > 0 ? '+' : ''}{severityChange.toFixed(1)} points
                            {isImproving && ' ↓'}
                            {isWorsening && ' ↑'}
                          </Text>
                        </View>
                        {confidenceChange !== 0 && (
                          <View style={styles.improvementDetail}>
                            <Text style={styles.improvementLabel}>Confidence Change:</Text>
                            <Text style={styles.improvementValue}>
                              {confidenceChange > 0 ? '+' : ''}
                              {(confidenceChange * 100).toFixed(1)}%
                            </Text>
                          </View>
                        )}
                        <View style={styles.improvementDetail}>
                          <Text style={styles.improvementLabel}>Time Span:</Text>
                          <Text style={styles.improvementValue}>
                            {Math.ceil(
                              (new Date(latestEntry.date).getTime() -
                                new Date(firstEntry.date).getTime()) /
                                (1000 * 60 * 60 * 24)
                            )}{' '}
                            days
                          </Text>
                        </View>
                      </View>
                      {isImproving && (
                        <Text style={styles.improvementMessage}>
                          Great progress! Your crop health is improving. Keep up the good work! 🌱
                        </Text>
                      )}
                      {isWorsening && (
                        <Text style={styles.improvementMessage}>
                          Disease severity has increased. Consider applying treatment soon. 💊
                        </Text>
                      )}
                      {isStable && (
                        <Text style={styles.improvementMessage}>
                          Condition remains stable. Continue monitoring regularly. 📊
                        </Text>
                      )}
                    </LinearGradient>
                  </View>
                );
              })()}
            </View>
          </View>
        )}

        {/* Chart Tabs */}
        <View style={styles.chartTabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartTabs}>
            <TouchableOpacity
              style={[styles.chartTab, activeChart === 'severity' && styles.chartTabActive]}
              onPress={() => setActiveChart('severity')}
            >
              <LineChartIcon size={18} color={activeChart === 'severity' ? colors.primary : colors.text.secondary} />
              <Text style={[styles.chartTabText, activeChart === 'severity' && styles.chartTabTextActive]}>
                Severity
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chartTab, activeChart === 'weather' && styles.chartTabActive]}
              onPress={() => setActiveChart('weather')}
            >
              <Cloud size={18} color={activeChart === 'weather' ? colors.primary : colors.text.secondary} />
              <Text style={[styles.chartTabText, activeChart === 'weather' && styles.chartTabTextActive]}>
                Weather
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chartTab, activeChart === 'disease' && styles.chartTabActive]}
              onPress={() => setActiveChart('disease')}
            >
              <PieChartIcon size={18} color={activeChart === 'disease' ? colors.primary : colors.text.secondary} />
              <Text style={[styles.chartTabText, activeChart === 'disease' && styles.chartTabTextActive]}>
                Disease
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chartTab, activeChart === 'confidence' && styles.chartTabActive]}
              onPress={() => setActiveChart('confidence')}
            >
              <BarChart3 size={18} color={activeChart === 'confidence' ? colors.primary : colors.text.secondary} />
              <Text style={[styles.chartTabText, activeChart === 'confidence' && styles.chartTabTextActive]}>
                Confidence
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Charts Section */}
        <View style={styles.chartsSection}>
          {/* Severity Trend Chart */}
          {activeChart === 'severity' && severityChartData && (
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <LineChartIcon size={24} color={colors.primary} />
                <Text style={styles.chartTitle}>Disease Severity Trend</Text>
              </View>
              <LineChart
                data={severityChartData}
                width={cardWidth - spacing.lg * 2}
                height={isSmallScreen ? 200 : 240}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
              />
              {prediction && (
                <View style={styles.predictionCard}>
                  <Text style={styles.predictionTitle}>📊 AI Prediction</Text>
                  <Text style={styles.predictionText}>
                    Next week: {prediction.predicted_severity} (score: {prediction.score.toFixed(1)})
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Weather Chart */}
          {activeChart === 'weather' && weatherChartData && (
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Cloud size={24} color={colors.info} />
                <Text style={styles.chartTitle}>Weather Trends</Text>
              </View>
              <LineChart
                data={weatherChartData}
                width={cardWidth - spacing.lg * 2}
                height={isSmallScreen ? 200 : 240}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(251, 146, 60, ${opacity})`, // Warm orange for temperature
                }}
                bezier
                style={styles.chart}
              />
              <View style={styles.weatherLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#FB923C' }]} />
                  <Text style={styles.legendText}>Temperature (°C)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#60A5FA' }]} />
                  <Text style={styles.legendText}>Humidity (%)</Text>
                </View>
              </View>
            </View>
          )}

          {/* Disease Distribution Pie Chart */}
          {activeChart === 'disease' && diseasePieData.length > 0 && (
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <PieChartIcon size={24} color={colors.primary} />
                <Text style={styles.chartTitle}>Disease Distribution</Text>
              </View>
              <PieChart
                data={diseasePieData}
                width={cardWidth - spacing.lg * 2}
                height={isSmallScreen ? 200 : 240}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
              <View style={styles.severityBarContainer}>
                <Text style={styles.chartSubtitle}>Severity Breakdown</Text>
                <BarChart
                  data={severityBarData}
                  width={cardWidth - spacing.lg * 2}
                  height={isSmallScreen ? 160 : 200}
                  chartConfig={chartConfig}
                  style={styles.chart}
                  yAxisLabel=""
                  yAxisSuffix=""
                />
              </View>
            </View>
          )}

          {/* Confidence Chart */}
          {activeChart === 'confidence' && confidenceChartData && (
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <BarChart3 size={24} color={colors.primary} />
                <Text style={styles.chartTitle}>AI Confidence Over Time</Text>
              </View>
              <LineChart
                data={confidenceChartData}
                width={cardWidth - spacing.lg * 2}
                height={isSmallScreen ? 200 : 240}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(168, 85, 247, ${opacity})`, // Vibrant purple
                }}
                bezier
                style={styles.chart}
              />
            </View>
          )}
        </View>

        {/* Playback Section */}
        {data.entries.length > 0 && (
          <View style={styles.playbackSection}>
            <View style={styles.playbackCard}>
              <View style={styles.playbackHeader}>
                <Text style={styles.playbackTitle}>TimeLapse Playback</Text>
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
              {isPlaying && data.entries[currentPlayIndex] && (
                <View style={styles.playbackImageContainer}>
                  <ImageWithFallback
                    imageKey={`playback-${data.entries[currentPlayIndex].id}`}
                    primaryUrl={data.entries[currentPlayIndex].photo_url ? `${getApiBaseUrl()}${data.entries[currentPlayIndex].photo_url}` : null}
                    fallbackUrl={data.entries[currentPlayIndex].highlighted_photo_url ? `${getApiBaseUrl()}${data.entries[currentPlayIndex].highlighted_photo_url}` : null}
                    style={styles.playbackImage}
                    resizeMode="cover"
                  />
                  <View style={styles.playbackOverlay}>
                    <Text style={styles.playbackDate}>
                      {new Date(data.entries[currentPlayIndex].date).toLocaleDateString()}
                    </Text>
                    <View
                      style={[
                        styles.severityBadge,
                        {
                          backgroundColor: getSeverityColor(
                            data.entries[currentPlayIndex].severity_score
                          ),
                        },
                      ]}
                    >
                      <Text style={styles.severityBadgeText}>
                        {getSeverityLabel(data.entries[currentPlayIndex].severity)}
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
          <Text style={styles.timelineTitle}>Timeline</Text>
          {data.entries.map((entry, index) => (
            <TouchableOpacity
              key={entry.id}
              style={styles.timelineItem}
              onPress={() => setSelectedEntry(entry)}
              activeOpacity={0.8}
            >
              <View style={styles.timelineCard}>
                <ImageWithFallback
                  imageKey={`timeline-${entry.id}`}
                  primaryUrl={entry.photo_url ? `${getApiBaseUrl()}${entry.photo_url}` : null}
                  fallbackUrl={entry.highlighted_photo_url ? `${getApiBaseUrl()}${entry.highlighted_photo_url}` : null}
                  style={styles.timelineImage}
                  resizeMode="cover"
                />
                <View style={styles.timelineContent}>
                  <View style={styles.timelineHeader}>
                    <Calendar size={16} color={colors.text.secondary} />
                    <Text style={styles.timelineDate}>
                      {new Date(entry.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  {entry.detected_disease && (
                    <Text style={styles.timelineDisease}>
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
                      <View style={styles.weatherBadge}>
                        <Droplets size={14} color={colors.info} />
                        <Text style={styles.weatherText}>
                          {entry.weather_humidity}%
                        </Text>
                      </View>
                    )}
                    {entry.weather_temp && (
                      <View style={styles.weatherBadge}>
                        <Sun size={14} color={colors.warning} />
                        <Text style={styles.weatherText}>
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
              <ImageWithFallback
                key={`modal-${selectedEntry.id}`}
                primaryUrl={selectedEntry.highlighted_photo_url ? `${getApiBaseUrl()}${selectedEntry.highlighted_photo_url}` : null}
                fallbackUrl={selectedEntry.photo_url ? `${getApiBaseUrl()}${selectedEntry.photo_url}` : null}
                style={styles.modalImage}
                resizeMode="contain"
              />
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
    position: 'relative',
    overflow: 'hidden',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: spacing.base,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    ...shadows.md,
  },
  backButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
    marginTop: spacing.base,
    gap: spacing.md,
    zIndex: 1,
  },
  sparkleContainer: {
    position: 'relative',
    marginBottom: spacing.xs,
  },
  sparkleGlow: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    borderRadius: 20,
    opacity: 0.6,
  },
  headerTitle: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold as any,
    color: 'white',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 0.5,
  },
  headerBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    marginTop: spacing.xs,
  },
  headerBadgeText: {
    fontSize: typography.fontSize.sm,
    color: 'white',
    fontWeight: typography.fontWeight.semibold as any,
    textTransform: 'capitalize',
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
    alignItems: 'stretch',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    minWidth: 0,
    maxWidth: statCardWidth,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statCardGradient: {
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 110,
    maxHeight: 120,
    position: 'relative',
    justifyContent: 'center',
  },
  statIconContainer: {
    position: 'relative',
    marginBottom: spacing.xs,
  },
  statIconGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    opacity: 0.5,
  },
  statValue: {
    fontSize: isSmallScreen ? typography.fontSize.base : typography.fontSize.lg,
    fontWeight: typography.fontWeight.extrabold as any,
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 0.5,
    textAlign: 'center',
    maxWidth: '100%',
    paddingHorizontal: spacing.xs,
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
    fontWeight: typography.fontWeight.semibold as any,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  additionalStatsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    marginBottom: spacing.xl,
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  additionalStatCard: {
    width: additionalStatCardWidth,
    minWidth: isSmallScreen ? (width - spacing.base * 2 - spacing.sm) / 2 : additionalStatCardWidth,
    backgroundColor: colors.bg.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.lg,
    borderWidth: 1.5,
    borderColor: colors.border.light,
    position: 'relative',
    overflow: 'hidden',
  },
  additionalStatValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold as any,
    color: colors.text.primary,
    marginTop: spacing.xs,
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
    backgroundColor: colors.bg.primary,
    borderRadius: borderRadius['2xl'],
    padding: spacing.xl,
    ...shadows.xl,
    borderWidth: 1.5,
    borderColor: colors.border.light,
    position: 'relative',
    overflow: 'hidden',
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
    ...shadows.lg,
    borderWidth: 1.5,
    borderColor: colors.border.light,
    position: 'relative',
    overflow: 'hidden',
  },
  timelineImage: {
    width: isSmallScreen ? 95 : 105,
    height: isSmallScreen ? 95 : 105,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.bg.tertiary,
    ...shadows.md,
    borderWidth: 1.5,
    borderColor: colors.border.light,
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
    width: 68,
    height: 68,
    borderRadius: 34,
    overflow: 'hidden',
    ...shadows['2xl'],
    zIndex: 10,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
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
    borderRadius: borderRadius['2xl'],
    padding: spacing.lg,
    ...shadows.xl,
    borderWidth: 1.5,
    borderColor: colors.border.light,
    position: 'relative',
    overflow: 'hidden',
  },
  comparisonRow: {
    flexDirection: isSmallScreen ? 'column' : 'row',
    alignItems: isSmallScreen ? 'stretch' : 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.base,
    width: '100%',
  },
  comparisonItem: {
    flex: 1,
    alignItems: 'stretch',
    minWidth: isSmallScreen ? '100%' : 120,
    maxWidth: isSmallScreen ? '100%' : '45%',
    padding: spacing.md,
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.xl,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    position: 'relative',
    overflow: 'hidden',
  },
  comparisonLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold as any,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
    width: '100%',
  },
  comparisonDate: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    fontWeight: typography.fontWeight.medium as any,
    textAlign: 'center',
    width: '100%',
  },
  comparisonImage: {
    width: isSmallScreen ? Math.min(100, width * 0.3) : Math.min(110, (width - spacing.base * 4) * 0.35),
    height: isSmallScreen ? Math.min(100, width * 0.3) : Math.min(110, (width - spacing.base * 4) * 0.35),
    borderRadius: borderRadius.lg,
    backgroundColor: colors.bg.tertiary,
    marginBottom: spacing.sm,
    ...shadows.md,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 197, 94, 0.2)',
    alignSelf: 'center',
  },
  comparisonStats: {
    width: '100%',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    maxWidth: '100%',
  },
  comparisonStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.bg.primary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    minHeight: 36,
    width: '100%',
    gap: spacing.xs,
    overflow: 'hidden',
  },
  comparisonStatLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium as any,
    flexShrink: 0,
    width: 55,
  },
  comparisonStatValue: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold as any,
    color: colors.text.primary,
    flexShrink: 0,
    textAlign: 'right',
    minWidth: 35,
  },
  comparisonSeverityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    minWidth: 50,
    maxWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    flex: 1,
    overflow: 'hidden',
  },
  comparisonSeverityText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.semibold as any,
    color: 'white',
    textAlign: 'center',
    maxWidth: '100%',
  },
  comparisonArrow: {
    padding: spacing.sm,
    transform: [{ rotate: isSmallScreen ? '90deg' : '0deg' }],
    alignSelf: isSmallScreen ? 'center' : 'center',
    marginVertical: isSmallScreen ? spacing.sm : 0,
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
});
