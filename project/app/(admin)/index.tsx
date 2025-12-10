import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Image } from 'react-native';
import { Users, FileText, MapPin, TrendingUp, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, Clock, DollarSign } from 'lucide-react-native';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminDetections, useOutbreakAlerts } from '@/hooks/useAdmin';
import { useRouter } from 'expo-router';

const screenWidth = Dimensions.get('window').width;

const chartConfig = {
  backgroundColor: '#22C55E',
  backgroundGradientFrom: '#22C55E',
  backgroundGradientTo: '#16A34A',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
  style: {
    borderRadius: 16,
  },
};

export default function AdminDashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { total, items, error: detectionsError } = useAdminDetections(1, 10);
  const { items: pendingAlerts, approveAlert, error: alertsError } = useOutbreakAlerts('pending');

  const statsCards = useMemo(() => ([
    {
      title: 'Total Farmers',
      value: '2,847',
      change: '+12%',
      icon: Users,
      color: '#22C55E',
      bgColor: '#F0FDF4'
    },
    {
      title: 'Reports Submitted',
      value: String(total || 0),
      change: '+8%',
      icon: FileText,
      color: '#3B82F6',
      bgColor: '#EFF6FF'
    },
    {
      title: 'Active Diseases',
      value: '23',
      change: '-5%',
      icon: AlertTriangle,
      color: '#EF4444',
      bgColor: '#FEF2F2'
    },
    {
      title: 'Subsidies Approved',
      value: '₨2.4M',
      change: '+15%',
      icon: DollarSign,
      color: '#F59E0B',
      bgColor: '#FFFBEB'
    }
  ]), [total]);

  // Mock data for charts
  const farmerRegistrationData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      data: [120, 145, 167, 198, 225, 284],
      color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
      strokeWidth: 2,
    }],
  };

  const cropDistributionData = [
    { name: 'Wheat', population: 40, color: '#22C55E', legendFontColor: '#374151', legendFontSize: 12 },
    { name: 'Rice', population: 25, color: '#3B82F6', legendFontColor: '#374151', legendFontSize: 12 },
    { name: 'Cotton', population: 20, color: '#F59E0B', legendFontColor: '#374151', legendFontSize: 12 },
    { name: 'Corn', population: 15, color: '#EF4444', legendFontColor: '#374151', legendFontSize: 12 },
  ];

  const diseaseReportsData = {
    labels: ['Rust', 'Blast', 'Blight', 'Rot'],
    datasets: [{
      data: [45, 32, 28, 19],
    }],
  };

  const recentActivities = [
    {
      id: '1',
      type: 'farmer_registered',
      message: 'New farmer registered: Ahmad Khan',
      time: '2 hours ago',
      icon: Users,
      color: '#22C55E'
    },
    {
      id: '2',
      type: 'disease_reported',
      message: 'Wheat rust reported in Punjab Sector A',
      time: '4 hours ago',
      icon: AlertTriangle,
      color: '#EF4444'
    },
    {
      id: '3',
      type: 'subsidy_approved',
      message: 'Kisan Card subsidy approved for 15 farmers',
      time: '6 hours ago',
      icon: CheckCircle,
      color: '#10B981'
    },
    {
      id: '4',
      type: 'report_pending',
      message: 'Disease report pending review',
      time: '8 hours ago',
      icon: Clock,
      color: '#F59E0B'
    }
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good morning,</Text>
          <Text style={styles.adminName}>{user?.name || 'Administrator'}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.notificationButton}>
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
            <View key={index} style={styles.statCard}>
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
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statTitle}>{stat.title}</Text>
            </View>
          );
        })}
      </View>

      {/* Charts Section */}
      <View style={styles.chartsSection}>
        {/* Farmer Registration Trend */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Farmer Registration Trend</Text>
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
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Crop Distribution</Text>
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
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Disease Reports by Type</Text>
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
        <Text style={styles.sectionTitle}>Recent Activities</Text>
        <View style={styles.activitiesCard}>
          {recentActivities.map((activity) => {
            const IconComponent = activity.icon;
            return (
              <View key={activity.id} style={styles.activityItem}>
                <View style={[styles.activityIcon, { backgroundColor: activity.color + '20' }]}>
                  <IconComponent color={activity.color} size={16} />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityMessage}>{activity.message}</Text>
                  <Text style={styles.activityTime}>{activity.time}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Recent Detections from Backend */}
      <View style={styles.activitiesSection}>
        <Text style={styles.sectionTitle}>Recent Detections</Text>
        <View style={styles.activitiesCard}>
          {items.map((d) => (
            <View key={d.detectionId} style={styles.detectionItem}>
              <Image source={{ uri: d.imageUrl || '' }} style={styles.detectionImage} />
              <View style={{ flex: 1 }}>
                <Text style={styles.detectionTitle}>Detection #{d.detectionId.slice(0, 8)}</Text>
                <Text style={styles.detectionMeta}>
                  Farmer: {d.farmerId || 'N/A'}  •  Confidence: {d.confidence ?? '-'}%
                </Text>
                <Text style={styles.detectionMeta}>Status: {d.status || 'pending'}</Text>
                <Text style={styles.detectionMeta}>{d.timestamp || ''}</Text>
              </View>
            </View>
          ))}
          {items.length === 0 && !detectionsError && (
            <Text style={styles.detectionEmpty}>No detections yet.</Text>
          )}
          {detectionsError && (
            <Text style={styles.errorText}>Error loading detections: {detectionsError}</Text>
          )}
        </View>
      </View>

      {/* Outbreak Alerts */}
      <View style={styles.activitiesSection}>
        <Text style={styles.sectionTitle}>Outbreak Alerts</Text>
        <View style={styles.activitiesCard}>
          {pendingAlerts.map((a) => (
            <View key={a.alertId} style={styles.alertItem}>
              <View style={styles.alertHeader}>
                <View style={styles.alertIcon}>
                  <AlertTriangle color="#EF4444" size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitle}>{a.diseaseName || 'Disease'} Outbreak</Text>
                  <Text style={styles.alertMeta}>
                    Radius: {a.radiusKm} km • {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''}
                  </Text>
                  <Text style={styles.alertMeta}>
                    Location: {a.centerLat.toFixed(4)}, {a.centerLng.toFixed(4)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.alertApproveButton}
                  onPress={() => approveAlert(a.alertId)}
                >
                  <Text style={styles.alertApproveText}>Approve</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {pendingAlerts.length === 0 && !alertsError && (
            <Text style={styles.detectionEmpty}>No pending outbreak alerts.</Text>
          )}
          {alertsError && (
            <Text style={styles.errorText}>Error loading alerts: {alertsError}</Text>
          )}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard}>
            <Users color="#22C55E" size={32} />
            <Text style={styles.actionText}>Manage Farmers</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/(admin)/heatmap')}
          >
            <MapPin color="#3B82F6" size={32} />
            <Text style={styles.actionText}>View Heatmap</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <FileText color="#F59E0B" size={32} />
            <Text style={styles.actionText}>Review Reports</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <DollarSign color="#EF4444" size={32} />
            <Text style={styles.actionText}>Manage Subsidies</Text>
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