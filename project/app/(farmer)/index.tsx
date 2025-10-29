import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Camera, Shield, Calendar, MapPin, MessageCircle, TrendingUp, Sun, Droplets, Wind } from 'lucide-react-native';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { translate } from '@/utils/translations';
import { colors, spacing, borderRadius, shadows } from '@/utils/designSystem';

const screenWidth = Dimensions.get('window').width;

const chartConfig = {
  backgroundColor: '#22C55E',
  backgroundGradientFrom: '#22C55E',
  backgroundGradientTo: '#16A34A',
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
  style: {
    borderRadius: 16,
  },
};

export default function FarmerHomeScreen() {
  const { user } = useAuth();
  const { language } = useApp();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return translate('goodMorning', language);
    if (hour < 17) return translate('goodAfternoon', language);
    return translate('goodEvening', language);
  };

  // Mock data for charts
  const yieldData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [{
      data: [45, 52, 48, 61],
      color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
      strokeWidth: 2,
    }],
  };

  const cropHealthData = [
    { name: 'Healthy', population: 75, color: '#22C55E', legendFontColor: '#374151', legendFontSize: 14 },
    { name: 'At Risk', population: 15, color: '#F59E0B', legendFontColor: '#374151', legendFontSize: 14 },
    { name: 'Diseased', population: 10, color: '#EF4444', legendFontColor: '#374151', legendFontSize: 14 },
  ];

  const diseaseData = {
    labels: ['Wheat', 'Rice', 'Cotton', 'Corn'],
    datasets: [{
      data: [12, 8, 15, 5],
    }],
  };

  const quickActions = [
    { title: translate('scanCrop', language), icon: Camera, color: '#22C55E' },
    { title: translate('cureGuidance', language), icon: Shield, color: '#3B82F6' },
    { title: translate('farmingSchedule', language), icon: Calendar, color: '#F59E0B' },
    { title: translate('diseaseHeatmap', language), icon: MapPin, color: '#EF4444' },
    { title: translate('chatbot', language), icon: MessageCircle, color: '#8B5CF6' },
  ];

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
            <Text style={styles.temperature}>28°C</Text>
            <Text style={styles.weatherDesc}>Sunny</Text>
            <View style={styles.weatherDetails}>
              <View style={styles.weatherItem}>
                <Droplets color="#3B82F6" size={16} />
                <Text style={styles.weatherSmall}>65%</Text>
              </View>
              <View style={styles.weatherItem}>
                <Wind color="#6B7280" size={16} />
                <Text style={styles.weatherSmall}>12 km/h</Text>
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
              <TouchableOpacity key={index} style={styles.actionCard}>
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
        <Text style={styles.sectionTitle}>{translate('cropHealthSummary', language)}</Text>
        <View style={styles.chartCard}>
          <PieChart
            data={cropHealthData}
            width={screenWidth - 48}
            height={200}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
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

      {/* Disease Incidence */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{translate('diseaseIncidence', language)}</Text>
        <View style={styles.chartCard}>
          <BarChart
            data={diseaseData}
            width={screenWidth - 48}
            height={220}
            chartConfig={chartConfig}
            verticalLabelRotation={30}
            style={{
              marginVertical: 8,
              borderRadius: 16,
            }}
          />
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
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.base,
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
});