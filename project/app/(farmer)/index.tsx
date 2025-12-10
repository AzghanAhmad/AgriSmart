import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Image, ActivityIndicator } from 'react-native';
import { Camera, Shield, Calendar, MapPin, MessageCircle, TrendingUp, Sun, Droplets, Wind, BarChart3, Sparkles } from 'lucide-react-native';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { translate } from '@/utils/translations';
import { colors, spacing, borderRadius, shadows } from '@/utils/designSystem';
import { useRouter } from 'expo-router';
import { apiGet } from '@/utils/api';
import { getApiBaseUrl } from '@/utils/env';

const screenWidth = Dimensions.get('window').width;

const chartConfig = {
  backgroundColor: '#FFFFFF',
  backgroundGradientFrom: '#FFFFFF',
  backgroundGradientTo: '#FFFFFF',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(22, 163, 74, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForBackgroundLines: {
    strokeDasharray: '', // solid lines
    stroke: '#E5E7EB',
    strokeWidth: 1,
  },
};

export default function FarmerHomeScreen() {
  const { user } = useAuth();
  const { language } = useApp();
  const router = useRouter();
  
  const [healthData, setHealthData] = useState({ healthy: 75, atRisk: 15, diseased: 10, totalScans: 0 });
  const [diseaseData, setDiseaseData] = useState({ wheat: 12, rice: 8, cotton: 15, corn: 5 });
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

  // Fetch real data from backend
  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        
        // Fetch crop health stats
        const health = await apiGet<any>(`/api/farmer/stats/health?farmerId=${encodeURIComponent(user.id)}`);
        setHealthData(health);
        
        // Fetch disease incidence stats
        const disease = await apiGet<any>(`/api/farmer/stats/disease-incidence?farmerId=${encodeURIComponent(user.id)}`);
        setDiseaseData(disease);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        // Keep default mock data on error
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [user?.id]);

  // Fetch today's weather
  useEffect(() => {
    const fetchTodayWeather = async () => {
      try {
        // Default to Lahore, Pakistan coordinates
        const lat = 31.5204;
        const lon = 74.3587;
        
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
  }, []);

  // Mock data for weekly yield
  const yieldData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [{
      data: [45, 52, 48, 61],
      color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
      strokeWidth: 3,
    }],
  };

  // Dynamic crop health data from backend
  const cropHealthData = [
    { name: 'Healthy', population: healthData.healthy, color: '#22C55E', legendFontColor: '#16A34A', legendFontSize: 18 },
    { name: 'At Risk', population: healthData.atRisk, color: '#F59E0B', legendFontColor: '#D97706', legendFontSize: 18 },
    { name: 'Diseased', population: healthData.diseased, color: '#EF4444', legendFontColor: '#DC2626', legendFontSize: 18 },
  ];

  // Dynamic disease incidence data
  const diseaseIncidenceData = {
    labels: ['Wheat', 'Rice', 'Cotton', 'Corn'],
    datasets: [{
      data: [diseaseData.wheat || 1, diseaseData.rice || 1, diseaseData.cotton || 1, diseaseData.corn || 1],
    }],
  };

  const quickActions = [
    { title: translate('scanCrop', language), icon: Camera, color: '#22C55E', route: '/disease-detection' },
    { title: 'Smart TimeLapse', icon: Sparkles, color: '#FFD700', route: '/timelapse-upload' },
    { title: translate('cureGuidance', language), icon: Shield, color: '#3B82F6', route: '/disease-detection' },
    { title: translate('farmingSchedule', language), icon: Calendar, color: '#F59E0B', route: '/schedule' },
    { title: translate('diseaseHeatmap', language), icon: MapPin, color: '#EF4444', route: '/heatmap' },
    { title: translate('yieldEstimate', language), icon: BarChart3, color: '#10B981', route: '/yield-estimation' },
    { title: translate('chatbot', language), icon: MessageCircle, color: '#8B5CF6', route: '/chatbot' },
  ];

  const handleQuickAction = (route: string) => {
    router.push(route as any);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Enhanced Header with Gradient */}
      <LinearGradient
        colors={['#22C55E', '#16A34A']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.greetingSection}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{user?.name || 'Farmer'}</Text>
            <Text style={styles.headerSubtext}>Welcome back to your farm</Text>
          </View>
          <View style={styles.weatherCard}>
            <Sun color="#F59E0B" size={32} />
            <Text style={styles.temperature}>
              {todayWeather ? `${todayWeather.temp}°C` : '--°C'}
            </Text>
            <Text style={styles.weatherDesc}>
              {todayWeather ? todayWeather.description : 'Loading...'}
            </Text>
            <View style={styles.weatherDetails}>
              <View style={styles.weatherItem}>
                <Droplets color="#3B82F6" size={16} />
                <Text style={styles.weatherSmall}>
                  {todayWeather ? `${todayWeather.humidity}%` : '--%'}
                </Text>
              </View>
              <View style={styles.weatherItem}>
                <Wind color="#6B7280" size={16} />
                <Text style={styles.weatherSmall}>
                  {todayWeather ? `${todayWeather.windSpeed.toFixed(1)} m/s` : '-- m/s'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action, index) => {
            const IconComponent = action.icon;
            return (
              <TouchableOpacity 
                key={index} 
                style={styles.actionCard}
                onPress={() => handleQuickAction(action.route)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
                  <IconComponent color="white" size={24} />
                </View>
                <Text style={styles.actionText}>{action.title}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Crop Health Summary */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{translate('cropHealthSummary', language)}</Text>
          {healthData.totalScans > 0 && (
            <Text style={styles.sectionSubtitle}>Based on {healthData.totalScans} scans</Text>
          )}
        </View>
        <View style={styles.chartCard}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#22C55E" />
              <Text style={styles.loadingText}>Loading statistics...</Text>
            </View>
          ) : (
            <PieChart
              data={cropHealthData}
              width={screenWidth - 48}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          )}
        </View>
      </View>

      {/* Weekly Yield Trend */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{translate('weeklyYieldTrend', language)}</Text>
        <View style={styles.chartCard}>
          <LineChart
            data={yieldData}
            width={screenWidth - 48}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={{
              marginVertical: 8,
              borderRadius: 16,
            }}
          />
        </View>
      </View>

      {/* Disease Incidence - Redesigned */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{translate('diseaseIncidence', language)}</Text>
        <View style={styles.diseaseGrid}>
          {[
            { crop: 'Wheat', count: diseaseData.wheat, color: '#F59E0B', icon: '🌾' },
            { crop: 'Rice', count: diseaseData.rice, color: '#10B981', icon: '🍚' },
            { crop: 'Cotton', count: diseaseData.cotton, color: '#8B5CF6', icon: '☁️' },
          ].map((item, index) => (
            <View key={index} style={styles.diseaseCard}>
              <View style={[styles.diseaseIconBg, { backgroundColor: item.color + '20' }]}>
                <Text style={styles.diseaseIcon}>{item.icon}</Text>
              </View>
              <Text style={styles.diseaseCrop}>{item.crop}</Text>
              <Text style={[styles.diseaseCount, { color: item.color }]}>{item.count}</Text>
              <Text style={styles.diseaseLabel}>Cases</Text>
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
        <Text style={styles.sectionTitle}>Farm Overview</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>12.5</Text>
            <Text style={styles.statLabel}>Acres</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>4</Text>
            <Text style={styles.statLabel}>Crops</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>95%</Text>
            <Text style={styles.statLabel}>Health Score</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>₨25K</Text>
            <Text style={styles.statLabel}>Monthly Revenue</Text>
          </View>
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
    backgroundColor: 'white',
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    alignItems: 'center',
    minWidth: 100,
    ...shadows.lg,
  },
  temperature: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: 4,
  },
  weatherDesc: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
    marginBottom: 8,
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
    color: colors.text.secondary,
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
    height: 220,
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