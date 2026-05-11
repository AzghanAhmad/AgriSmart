import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, ImageBackground } from 'react-native';
import { Camera, Shield, Calendar, MapPin, MessageCircle, Sun, Droplets, Wind, Sparkles, Briefcase } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import { translate } from '@/utils/translations';
import { colors, spacing, borderRadius, shadows } from '@/utils/designSystem';
import { useFocusEffect, useRouter } from 'expo-router';
import { apiGet } from '@/utils/api';
import { getApiBaseUrl } from '@/utils/env';
import { resolveWeatherCoordinates } from '@/utils/pakistanGeocode';
import { CropHealthPieSummary } from '@/components/farmer/CropHealthPieSummary';
import { YieldTrendChart } from '@/components/farmer/YieldTrendChart';
import { warmupChatbot } from '@/services/chatbotService';

const screenWidth = Dimensions.get('window').width;

const HEADER_FIELD_BG = require('@/assets/crops/background.jpg');
type ProfileStatsResponse = {
  acresFarmed: number | null;
  cropTypesCount: number | null;
  healthScorePercent: number | null;
  monthlyRevenue: number | null;
  totalScans: number;
};

export default function FarmerHomeScreen() {
  const { user } = useAuth();
  const { language } = useApp();
  const { colors: tc, isDark } = useTheme();
  const router = useRouter();

  const [healthData, setHealthData] = useState({
    healthy: 0,
    atRisk: 0,
    diseased: 0,
    totalScans: 0,
    healthyCount: 0,
    atRiskCount: 0,
    diseasedCount: 0,
  });
  const [diseaseData, setDiseaseData] = useState({ wheat: 0, rice: 0, cotton: 0, corn: 0 });
  const [farmOverview, setFarmOverview] = useState<ProfileStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [todayWeather, setTodayWeather] = useState<{
    temp: number;
    description: string;
    humidity: number;
    windSpeed: number;
    icon: string;
  } | null>(null);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return translate('goodMorning', language);
    if (hour < 17) return translate('goodAfternoon', language);
    return translate('goodEvening', language);
  };

  const fetchStats = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);

      // Fetch crop health stats
      const health = await apiGet<any>(`/api/farmer/stats/health?farmerId=${encodeURIComponent(user.id)}`);
      setHealthData({
        healthy: Number(health.healthy) || 0,
        atRisk: Number(health.atRisk) || 0,
        diseased: Number(health.diseased) || 0,
        totalScans: Number(health.totalScans) || 0,
        healthyCount: Number(health.healthyCount) || 0,
        atRiskCount: Number(health.atRiskCount) || 0,
        diseasedCount: Number(health.diseasedCount) || 0,
      });

      // Fetch disease incidence stats
      const disease = await apiGet<any>(`/api/farmer/stats/disease-incidence?farmerId=${encodeURIComponent(user.id)}`);
      setDiseaseData({
        wheat: Number(disease?.wheat) || 0,
        rice: Number(disease?.rice) || 0,
        cotton: Number(disease?.cotton) || 0,
        corn: Number(disease?.corn) || 0,
      });

      const profile = await apiGet<ProfileStatsResponse>(
        `/api/farmer/stats/profile?farmerId=${encodeURIComponent(user.id)}`
      );
      setFarmOverview(profile);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      // Keep current data on error
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Initial fetch + refresh whenever Home tab is focused.
  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  useFocusEffect(
    useCallback(() => {
      void fetchStats();
    }, [fetchStats]),
  );

  // Fetch today's weather (profile coordinates or geocoded city in Pakistan)
  useEffect(() => {
    const fetchTodayWeather = async () => {
      try {
        const { latitude: lat, longitude: lon } = await resolveWeatherCoordinates(user);
        
        const API_BASE_URL = getApiBaseUrl();
        const response = await fetch(
          `${API_BASE_URL}/api/farmer/schedule/weather?lat=${lat}&lon=${lon}`
        );
        
        if (response.ok) {
          const data = await response.json();
          // Get today's weather (first day in forecast)
          if (data.forecast && data.forecast.length > 0) {
            const today = data.forecast[0];
            setTodayWeather({
              temp: Math.round(today.temp_max),
              description: today.description,
              humidity: today.humidity,
              windSpeed: today.wind_speed,
              icon: today.icon,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching weather:', error);
        // Keep default values on error
      }
    };
    
    fetchTodayWeather();
  }, [user?.id, user?.latitude, user?.longitude, user?.location]);

  const quickActions = [
    { title: translate('scanCrop', language), icon: Camera, color: '#22C55E', route: '/disease-detection' },
    { title: translate('smartTimelapse', language), icon: Sparkles, color: '#FFD700', route: '/timelapse-upload' },
    { title: translate('cureGuidance', language), icon: Shield, color: '#3B82F6', route: '/cure-guidance-history' },
    { title: translate('farmingSchedule', language), icon: Calendar, color: '#F59E0B', route: '/schedule' },
    { title: translate('diseaseHeatmap', language), icon: MapPin, color: '#EF4444', route: '/heatmap' },
    { title: translate('viewAvailableSubsidiesNav', language), icon: Briefcase, color: '#14B8A6', route: '/subsidies' },
    { title: translate('chatbot', language), icon: MessageCircle, color: '#8B5CF6', route: '/chatbot' },
  ];

  const handleQuickAction = (route: string) => {
    if (route === '/chatbot') {
      warmupChatbot().catch((err) => console.warn('Chatbot warmup (prefetch):', err));
    }
    router.push(route as any);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: tc.screen }]} contentContainerStyle={styles.content}>
      <ImageBackground source={HEADER_FIELD_BG} style={styles.header} resizeMode="cover" imageStyle={styles.headerImage}>
        <View style={styles.headerOverlay} pointerEvents="none" />
        <View style={styles.headerContent}>
          <View style={styles.greetingSection}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{user?.name || translate('defaultFarmerName', language)}</Text>
            <Text style={styles.headerSubtext}>{translate('welcomeBackFarm', language)}</Text>
          </View>
          <View
            style={[
              styles.weatherCard,
              {
                backgroundColor: tc.card,
                borderWidth: isDark ? 1 : 0,
                borderColor: isDark ? tc.border : 'transparent',
              },
            ]}
          >
            <Sun color="#F59E0B" size={32} />
            <Text style={[styles.temperature, { color: tc.text }]}>
              {todayWeather ? `${todayWeather.temp}°C` : '--°C'}
            </Text>
            <Text style={[styles.weatherDesc, { color: tc.textMuted }]}>
              {todayWeather ? todayWeather.description : translate('loading', language)}
            </Text>
            <View style={styles.weatherDetails}>
              <View style={styles.weatherItem}>
                <Droplets color="#3B82F6" size={16} />
                <Text style={[styles.weatherSmall, { color: tc.textMuted }]}>
                  {todayWeather ? `${todayWeather.humidity}%` : '--%'}
                </Text>
              </View>
              <View style={styles.weatherItem}>
                <Wind color={tc.textMuted} size={16} />
                <Text style={[styles.weatherSmall, { color: tc.textMuted }]}>
                  {todayWeather ? `${todayWeather.windSpeed.toFixed(1)} m/s` : '-- m/s'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ImageBackground>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: tc.text }]}>{translate('quickActions', language)}</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action, index) => {
            const IconComponent = action.icon;
            return (
              <TouchableOpacity 
                key={index} 
                style={[styles.actionCard, { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border }]}
                onPress={() => handleQuickAction(action.route)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
                  <IconComponent color="white" size={24} />
                </View>
                <Text style={[styles.actionText, { color: tc.text }]}>{action.title}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Crop Health Summary */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: tc.text }]}>{translate('cropHealthSummary', language)}</Text>
        </View>
        <View style={[styles.chartCard, { backgroundColor: tc.card, borderColor: tc.border }]}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#22C55E" />
              <Text style={[styles.loadingText, { color: tc.textMuted }]}>
                {translate('loadingStatistics', language)}
              </Text>
            </View>
          ) : (
            <CropHealthPieSummary
              healthy={healthData.healthy}
              atRisk={healthData.atRisk}
              diseased={healthData.diseased}
              totalScans={healthData.totalScans}
              healthyCount={healthData.healthyCount}
              atRiskCount={healthData.atRiskCount}
              diseasedCount={healthData.diseasedCount}
            />
          )}
        </View>
      </View>

      {/* Weekly Yield Trend */}
      <View style={styles.section}>
        <View style={[styles.chartCard, { backgroundColor: tc.card, borderColor: tc.border }]}>
          <YieldTrendChart />
        </View>
      </View>

      {/* Disease Incidence - Redesigned */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: tc.text }]}>{translate('diseaseIncidence', language)}</Text>
        <View style={styles.diseaseGrid}>
          {[
            { crop: translate('cropWheat', language), count: diseaseData.wheat, color: '#F59E0B', icon: '🌾' },
            { crop: translate('cropRice', language), count: diseaseData.rice, color: '#10B981', icon: '🍚' },
            { crop: translate('cropCotton', language), count: diseaseData.cotton, color: '#8B5CF6', icon: '☁️' },
          ].map((item, index) => (
            <View key={index} style={[styles.diseaseCard, { backgroundColor: tc.card, borderColor: tc.border }]}>
              <View style={[styles.diseaseIconBg, { backgroundColor: item.color + '20' }]}>
                <Text style={styles.diseaseIcon}>{item.icon}</Text>
              </View>
              <Text style={[styles.diseaseCrop, { color: tc.text }]}>{item.crop}</Text>
              <Text style={[styles.diseaseCount, { color: item.color }]}>{item.count}</Text>
              <Text style={[styles.diseaseLabel, { color: tc.textMuted }]}>{translate('casesLabel', language)}</Text>
              {item.count > 0 && (
                <View style={[styles.diseaseBar, { backgroundColor: item.color }]}>
                  <View style={[styles.diseaseBarFill, { width: `${Math.min((item.count / 20) * 100, 100)}%` }]} />
                </View>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* Farm Statistics */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: tc.text }]}>{translate('farmOverview', language)}</Text>
        <View style={styles.statsGrid}>
          {[
            {
              v:
                farmOverview?.acresFarmed != null
                  ? String(farmOverview.acresFarmed)
                  : '—',
              l: translate('statAcres', language),
            },
            {
              v:
                farmOverview?.cropTypesCount != null
                  ? String(farmOverview.cropTypesCount)
                  : '—',
              l: translate('statCrops', language),
            },
            {
              v:
                farmOverview?.healthScorePercent != null
                  ? `${Math.round(farmOverview.healthScorePercent)}%`
                  : '—',
              l: translate('statHealthScore', language),
            },
            {
              v:
                farmOverview?.monthlyRevenue != null
                  ? `Rs ${Math.round(farmOverview.monthlyRevenue).toLocaleString()}`
                  : '—',
              l: translate('statMonthlyRevenue', language),
            },
          ].map((s, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: tc.card, borderColor: tc.border }]}>
              <Text style={styles.statValue}>{s.v}</Text>
              <Text style={[styles.statLabel, { color: tc.textMuted }]}>{s.l}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.secondary,
  },
  content: {
    paddingBottom: spacing['2xl'],
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xl,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  headerImage: {
    borderRadius: 0,
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(22, 101, 52, 0.45)',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greetingSection: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  weatherCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    alignItems: 'center',
    minWidth: 100,
    ...shadows.lg,
  },
  temperature: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  weatherDesc: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  weatherDetails: {
    flexDirection: 'row',
    gap: 12,
  },
  weatherItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weatherSmall: {
    fontSize: 12,
  },
  section: {
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.base,
  },
  sectionHeader: {
    marginBottom: spacing.base,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 18,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  loadingContainer: {
    minHeight: 260,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionCard: {
    width: (screenWidth - 56) / 2,
    backgroundColor: colors.bg.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.lg,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.md,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
  },
  chartCard: {
    backgroundColor: colors.bg.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.base,
    alignItems: 'center',
    ...shadows.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    width: (screenWidth - 56) / 2,
    backgroundColor: colors.bg.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.lg,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  diseaseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  diseaseCard: {
    width: (screenWidth - 56) / 2,
    backgroundColor: colors.bg.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.md,
  },
  diseaseIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  diseaseIcon: {
    fontSize: 28,
  },
  diseaseCrop: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  diseaseCount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  diseaseLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  diseaseBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    opacity: 0.3,
  },
  diseaseBarFill: {
    height: '100%',
    backgroundColor: 'currentColor',
  },
});