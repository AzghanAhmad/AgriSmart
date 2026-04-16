import React, { useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Image } from 'react-native';
import { Users, FileText, MapPin, TrendingUp, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, Clock, DollarSign } from 'lucide-react-native';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import { translate } from '@/utils/translations';
import { useAdminDetections, useOutbreakAlerts } from '@/hooks/useAdmin';
import { useRouter } from 'expo-router';

const screenWidth = Dimensions.get('window').width;

export default function AdminDashboardScreen() {
  const { user } = useAuth();
  const { language } = useApp();
  const { colors: tc, isDark } = useTheme();
  const router = useRouter();

  const adminGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return translate('adminGoodMorning', language);
    if (hour < 17) return translate('adminGoodAfternoon', language);
    return translate('adminGoodEvening', language);
  }, [language]);

  const chartConfig = useMemo(
    () =>
      isDark
        ? {
            backgroundColor: tc.chartBg,
            backgroundGradientFrom: tc.chartBg,
            backgroundGradientTo: tc.screen,
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(249, 250, 251, ${opacity})`,
            style: { borderRadius: 16 },
            propsForBackgroundLines: { stroke: tc.chartGrid, strokeWidth: 1 },
          }
        : {
            backgroundColor: '#22C55E',
            backgroundGradientFrom: '#22C55E',
            backgroundGradientTo: '#16A34A',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            style: { borderRadius: 16 },
          },
    [isDark, tc]
  );
  const { total, items, error: detectionsError } = useAdminDetections(1, 10);
  const { items: pendingAlerts, approveAlert, error: alertsError } = useOutbreakAlerts('pending');

  const statsCards = useMemo(
    () => [
      {
        title: translate('adminStatTotalFarmers', language),
        value: '2,847',
        change: '+12%',
        icon: Users,
        color: '#22C55E',
        bgColor: '#F0FDF4',
      },
      {
        title: translate('adminStatReportsSubmitted', language),
        value: String(total || 0),
        change: '+8%',
        icon: FileText,
        color: '#3B82F6',
        bgColor: '#EFF6FF',
      },
      {
        title: translate('adminStatActiveDiseases', language),
        value: '23',
        change: '-5%',
        icon: AlertTriangle,
        color: '#EF4444',
        bgColor: '#FEF2F2',
      },
      {
        title: translate('adminStatSubsidiesApproved', language),
        value: '₨2.4M',
        change: '+15%',
        icon: DollarSign,
        color: '#F59E0B',
        bgColor: '#FFFBEB',
      },
    ],
    [total, language],
  );

  const farmerRegistrationData = useMemo(
    () => ({
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [
        {
          data: [120, 145, 167, 198, 225, 284],
          color: (opacity = 1) =>
            isDark ? `rgba(34, 197, 94, ${opacity})` : `rgba(255, 255, 255, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    }),
    [isDark]
  );

  const cropDistributionData = useMemo(
    () => [
      { name: translate('cropWheat', language), population: 40, color: '#22C55E', legendFontColor: tc.text, legendFontSize: 12 },
      { name: translate('cropRice', language), population: 25, color: '#3B82F6', legendFontColor: tc.text, legendFontSize: 12 },
      { name: translate('cropCotton', language), population: 20, color: '#F59E0B', legendFontColor: tc.text, legendFontSize: 12 },
      { name: translate('cropCorn', language), population: 15, color: '#EF4444', legendFontColor: tc.text, legendFontSize: 12 },
    ],
    [tc.text, language],
  );

  const diseaseReportsData = {
    labels: ['Rust', 'Blast', 'Blight', 'Rot'],
    datasets: [{
      data: [45, 32, 28, 19],
    }],
  };

  const recentActivities = useMemo(
    () => [
      {
        id: '1',
        type: 'farmer_registered',
        message: translate('adminActivity1', language),
        time: translate('adminActivity1Time', language),
        icon: Users,
        color: '#22C55E',
      },
      {
        id: '2',
        type: 'disease_reported',
        message: translate('adminActivity2', language),
        time: translate('adminActivity2Time', language),
        icon: AlertTriangle,
        color: '#EF4444',
      },
      {
        id: '3',
        type: 'subsidy_approved',
        message: translate('adminActivity3', language),
        time: translate('adminActivity3Time', language),
        icon: CheckCircle,
        color: '#10B981',
      },
      {
        id: '4',
        type: 'report_pending',
        message: translate('adminActivity4', language),
        time: translate('adminActivity4Time', language),
        icon: Clock,
        color: '#F59E0B',
      },
    ],
    [language],
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: tc.screen }]} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: tc.headerBg, borderBottomColor: tc.border }]}>
        <View>
          <Text style={[styles.greeting, { color: tc.textMuted }]}>{adminGreeting()}</Text>
          <Text style={[styles.adminName, { color: tc.text }]}>{user?.name || translate('administratorDefault', language)}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={[styles.notificationButton, { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border }]}>
            <AlertTriangle color="#EF4444" size={20} />
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        {statsCards.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <View key={index} style={[styles.statCard, { backgroundColor: tc.card, borderColor: tc.border, borderWidth: 1 }]}>
              <View style={styles.statHeader}>
                <View style={[styles.statIcon, { backgroundColor: stat.bgColor }]}>
                  <IconComponent color={stat.color} size={24} />
                </View>
                <Text style={[styles.statChange, { 
                  color: stat.change.startsWith('+') ? '#10B981' : '#EF4444' 
                }]}>
                  {stat.change}
                </Text>
              </View>
              <Text style={[styles.statValue, { color: tc.text }]}>{stat.value}</Text>
              <Text style={[styles.statTitle, { color: tc.textMuted }]}>{stat.title}</Text>
            </View>
          );
        })}
      </View>

      {/* Charts Section */}
      <View style={styles.chartsSection}>
        {/* Farmer Registration Trend */}
        <View style={[styles.chartCard, { backgroundColor: tc.card, borderColor: tc.border, borderWidth: 1 }]}>
          <Text style={[styles.chartTitle, { color: tc.text }]}>{translate('adminChartFarmerReg', language)}</Text>
          <LineChart
            data={farmerRegistrationData}
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

        {/* Crop Distribution */}
        <View style={[styles.chartCard, { backgroundColor: tc.card, borderColor: tc.border, borderWidth: 1 }]}>
          <Text style={[styles.chartTitle, { color: tc.text }]}>{translate('adminChartCropDist', language)}</Text>
          <PieChart
            data={cropDistributionData}
            width={screenWidth - 48}
            height={200}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </View>

        {/* Disease Reports */}
        <View style={[styles.chartCard, { backgroundColor: tc.card, borderColor: tc.border, borderWidth: 1 }]}>
          <Text style={[styles.chartTitle, { color: tc.text }]}>{translate('adminChartDiseaseByType', language)}</Text>
          <BarChart
            data={diseaseReportsData}
            width={screenWidth - 48}
            height={220}
            chartConfig={chartConfig}
            yAxisLabel=""
            yAxisSuffix=""
            style={{
              marginVertical: 8,
              borderRadius: 16,
            }}
          />
        </View>
      </View>

      {/* Recent Activities */}
      <View style={styles.activitiesSection}>
        <Text style={[styles.sectionTitle, { color: tc.text }]}>{translate('adminRecentActivities', language)}</Text>
        <View style={[styles.activitiesCard, { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border }]}>
          {recentActivities.map((activity) => {
            const IconComponent = activity.icon;
            return (
              <View key={activity.id} style={[styles.activityItem, { borderBottomColor: tc.border }]}>
                <View style={[styles.activityIcon, { backgroundColor: activity.color + '20' }]}>
                  <IconComponent color={activity.color} size={16} />
                </View>
                <View style={styles.activityContent}>
                  <Text style={[styles.activityMessage, { color: tc.textSecondary }]}>{activity.message}</Text>
                  <Text style={[styles.activityTime, { color: tc.textMuted }]}>{activity.time}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Recent Detections from Backend */}
      <View style={styles.activitiesSection}>
        <Text style={[styles.sectionTitle, { color: tc.text }]}>{translate('adminRecentDetections', language)}</Text>
        <View style={[styles.activitiesCard, { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border }]}>
          {items.map((d) => (
            <View key={d.detectionId} style={styles.detectionItem}>
              <Image source={{ uri: d.imageUrl || '' }} style={[styles.detectionImage, { backgroundColor: tc.border }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.detectionTitle, { color: tc.text }]}>
                  {translate('adminDetectionPrefix', language)}
                  {d.detectionId.slice(0, 8)}
                </Text>
                <Text style={[styles.detectionMeta, { color: tc.textMuted }]}>
                  {translate('adminFarmerLabel', language)} {d.farmerId || 'N/A'} • {translate('adminConfidenceLabel', language)}{' '}
                  {d.confidence ?? '-'}%
                </Text>
                <Text style={[styles.detectionMeta, { color: tc.textMuted }]}>
                  {translate('adminStatusLabel', language)} {d.status || 'pending'}
                </Text>
                <Text style={[styles.detectionMeta, { color: tc.textMuted }]}>{d.timestamp || ''}</Text>
              </View>
            </View>
          ))}
          {items.length === 0 && !detectionsError && (
            <Text style={[styles.detectionEmpty, { color: tc.textMuted }]}>{translate('adminNoDetections', language)}</Text>
          )}
          {detectionsError && (
            <Text style={styles.errorText}>
              {translate('adminErrorDetectionsPrefix', language)} {detectionsError}
            </Text>
          )}
        </View>
      </View>

      {/* Outbreak Alerts */}
      <View style={styles.activitiesSection}>
        <Text style={[styles.sectionTitle, { color: tc.text }]}>{translate('adminOutbreakAlerts', language)}</Text>
        <View style={[styles.activitiesCard, { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border }]}>
          {pendingAlerts.map((a) => (
            <View key={a.alertId} style={styles.alertItem}>
              <View style={styles.alertHeader}>
                <View style={[styles.alertIcon, { backgroundColor: isDark ? '#450A0A' : '#FEF2F2' }]}>
                  <AlertTriangle color="#EF4444" size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.alertTitle, { color: tc.text }]}>
                    {(a.diseaseName || translate('adminDiseaseFallback', language)) + translate('adminDiseaseOutbreakSuffix', language)}
                  </Text>
                  <Text style={[styles.alertMeta, { color: tc.textMuted }]}>
                    {translate('adminRadiusLabel', language)} {a.radiusKm} km •{' '}
                    {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''}
                  </Text>
                  <Text style={[styles.alertMeta, { color: tc.textMuted }]}>
                    {translate('adminLocationLabel', language)} {a.centerLat.toFixed(4)}, {a.centerLng.toFixed(4)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.alertApproveButton}
                  onPress={() => approveAlert(a.alertId)}
                >
                  <Text style={styles.alertApproveText}>{translate('adminApprove', language)}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {pendingAlerts.length === 0 && !alertsError && (
            <Text style={[styles.detectionEmpty, { color: tc.textMuted }]}>{translate('adminNoPendingAlerts', language)}</Text>
          )}
          {alertsError && (
            <Text style={styles.errorText}>
              {translate('adminErrorAlertsPrefix', language)} {alertsError}
            </Text>
          )}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsSection}>
        <Text style={[styles.sectionTitle, { color: tc.text }]}>{translate('quickActions', language)}</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border }]}>
            <Users color="#22C55E" size={32} />
            <Text style={[styles.actionText, { color: tc.textSecondary }]}>{translate('adminManageFarmers', language)}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border }]}
            onPress={() => router.push('/(admin)/heatmap')}
          >
            <MapPin color="#3B82F6" size={32} />
            <Text style={[styles.actionText, { color: tc.textSecondary }]}>{translate('adminViewHeatmap', language)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border }]}>
            <FileText color="#F59E0B" size={32} />
            <Text style={[styles.actionText, { color: tc.textSecondary }]}>{translate('adminReviewReports', language)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border }]}>
            <DollarSign color="#EF4444" size={32} />
            <Text style={[styles.actionText, { color: tc.textSecondary }]}>{translate('adminManageSubsidies', language)}</Text>
          </TouchableOpacity>
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
  },
  greeting: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  adminName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerActions: {
    position: 'relative',
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: (screenWidth - 44) / 2,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statChange: {
    fontSize: 12,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  chartsSection: {
    gap: 16,
    marginBottom: 24,
  },
  chartCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  activitiesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  activitiesCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityMessage: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
    lineHeight: 20,
  },
  activityTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  quickActionsSection: {
    marginBottom: 24,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: (screenWidth - 44) / 2,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginTop: 8,
    textAlign: 'center',
  },
  detectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  detectionImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  detectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  detectionMeta: {
    fontSize: 12,
    color: '#6B7280',
  },
  detectionEmpty: {
    fontSize: 13,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    padding: 8,
  },
  alertItem: {
    marginBottom: 12,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  alertIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  alertMeta: {
    fontSize: 12,
    color: '#6B7280',
  },
  alertApproveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#22C55E',
  },
  alertApproveText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});