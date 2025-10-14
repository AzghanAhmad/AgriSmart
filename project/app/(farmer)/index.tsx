import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Camera, Shield, Calendar, MapPin, MessageCircle, TrendingUp } from 'lucide-react-native';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { translate } from '@/utils/translations';

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
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.userName}>{user?.name || 'Farmer'}</Text>
        </View>
        <View style={styles.weatherCard}>
          <Text style={styles.temperature}>28°C</Text>
          <Text style={styles.weatherDesc}>Sunny</Text>
        </View>
      </View>

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
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  greeting: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  weatherCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  temperature: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#22C55E',
  },
  weatherDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 8,
  },
  actionCard: {
    width: (screenWidth - 64) / 2,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  chartCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 8,
  },
  statCard: {
    width: (screenWidth - 64) / 2,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#22C55E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});