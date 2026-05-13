import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Search, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, Clock, MapPin, Calendar, ShieldCheck, XCircle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAdminReports } from '@/hooks/useAdmin';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export default function ReportsScreen() {
  const { colors: tc } = useTheme();
  const { width } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'verified' | 'rejected' | 'resolved'>('all');
  const { items, total, loading, error, updateStatus, refresh } = useAdminReports(1, 50, selectedFilter, searchQuery);

  const filters = [
    { id: 'all', label: 'All Reports' },
    { id: 'pending', label: 'Pending Verification' },
    { id: 'verified', label: 'Verified' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'resolved', label: 'Resolved' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'verified': return '#3B82F6';
      case 'rejected': return '#EF4444';
      case 'resolved': return '#22C55E';
      default: return '#6B7280';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FFFBEB';
      case 'verified': return '#EFF6FF';
      case 'rejected': return '#FEF2F2';
      case 'resolved': return '#F0FDF4';
      default: return '#F3F4F6';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return Clock;
      case 'verified': return ShieldCheck;
      case 'rejected': return XCircle;
      case 'resolved': return CheckCircle;
      default: return AlertTriangle;
    }
  };

  const statsData = useMemo(() => {
    const pending = items.filter((r) => r.status === 'pending').length;
    const verified = items.filter((r) => r.status === 'verified').length;
    const rejected = items.filter((r) => r.status === 'rejected').length;
    const resolved = items.filter((r) => r.status === 'resolved').length;
    return [
      { label: 'Total Reports', value: String(total), color: '#22C55E' },
      { label: 'Pending', value: String(pending), color: '#F59E0B' },
      { label: 'Verified', value: String(verified), color: '#3B82F6' },
      { label: 'Rejected', value: String(rejected), color: '#EF4444' },
      { label: 'Resolved', value: String(resolved), color: '#10B981' },
    ];
  }, [items, total]);

  const statCardWidth = width < 380 ? 120 : 140;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleExport = async () => {
    try {
      if (!items.length) {
        Alert.alert('No Data', 'There are no reports to export right now.');
        return;
      }

      const escapeCsv = (value: unknown) => {
        const raw = String(value ?? '');
        if (raw.includes('"') || raw.includes(',') || raw.includes('\n')) {
          return `"${raw.replace(/"/g, '""')}"`;
        }
        return raw;
      };

      const headers = [
        'Detection ID',
        'Farmer ID',
        'Farmer Name',
        'Disease',
        'Crop Type',
        'Location',
        'Status',
        'Confidence',
        'Submitted At',
        'Reviewed At',
      ];

      const lines = items.map((report) => ([
        report.detectionId,
        report.farmerId,
        report.farmerName,
        report.diseaseName,
        report.cropType,
        report.location,
        report.status,
        `${report.confidence}%`,
        report.submittedAt ? formatDate(report.submittedAt) : '',
        report.reviewedAt ? formatDate(report.reviewedAt) : '',
      ].map(escapeCsv).join(',')));

      const csv = [headers.join(','), ...lines].join('\n');
      const filename = `admin-reports-${new Date().toISOString().slice(0, 10)}.csv`;

      if (Platform.OS === 'web') {
        Alert.alert('Export', 'CSV export sharing is supported on Android/iOS.');
        return;
      }

      const baseDirectory = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
      if (!baseDirectory) {
        throw new Error('Export storage is unavailable on this device');
      }

      const uri = `${baseDirectory}${filename}`;
      const utf8Encoding = (FileSystem as any).EncodingType?.UTF8 ?? 'utf8';
      await FileSystem.writeAsStringAsync(uri, csv, { encoding: utf8Encoding as any });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Export Saved', `CSV saved at: ${uri}`);
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Disease Reports',
        UTI: 'public.comma-separated-values-text',
      });
    } catch (e: any) {
      Alert.alert('Export Failed', e?.message || 'Unable to export reports');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: tc.screen }]}>
      <View style={[styles.header, { backgroundColor: tc.headerBg, borderBottomColor: tc.border }]}>
        <Text style={[styles.title, { color: tc.text }]}>Disease Reports</Text>
        <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
          <Text style={styles.exportButtonText}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.statsScroll, { backgroundColor: tc.headerBg }]}
        contentContainerStyle={styles.statsRow}
      >
        {statsData.map((stat, index) => (
          <View key={index} style={[styles.statCard, { width: statCardWidth, backgroundColor: tc.card, borderColor: tc.border, borderWidth: 1 }]}>
            <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={[styles.statLabel, { color: tc.textMuted }]}>{stat.label}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Search and Filter */}
      <View style={[styles.searchSection, { backgroundColor: tc.headerBg, borderBottomColor: tc.border }]}>
        <View style={[styles.searchContainer, { backgroundColor: tc.inputBg }]}>
          <Search color={tc.textMuted} size={20} />
          <TextInput
            style={[styles.searchInput, { color: tc.text }]}
            placeholder="Search reports..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={tc.textMuted}
          />
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterButton,
                { backgroundColor: tc.inputBg, borderColor: tc.border },
                selectedFilter === filter.id && styles.activeFilterButton
              ]}
              onPress={() => setSelectedFilter(filter.id)}
            >
              <Text style={[
                styles.filterText,
                { color: tc.textSecondary },
                selectedFilter === filter.id && styles.activeFilterText
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Reports List */}
      <ScrollView style={[styles.reportsList, { backgroundColor: tc.screen }]} contentContainerStyle={styles.reportsContent}>
        {loading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#22C55E" />
          </View>
        )}
        {!loading && items.map((report) => {
          const StatusIcon = getStatusIcon(report.status);
          return (
            <TouchableOpacity key={report.id} style={[styles.reportCard, { backgroundColor: tc.card, borderColor: tc.border, borderWidth: 1 }]}>
              <View style={styles.reportHeader}>
                <View style={styles.reportImage}>
                  <Image source={{ uri: report.imageUrl || '' }} style={styles.cropImage} />
                </View>
                
                <View style={styles.reportInfo}>
                  <Text style={[styles.diseaseName, { color: tc.text }]}>{report.diseaseName}</Text>
                  <Text style={[styles.farmerName, { color: tc.textSecondary }]}>{report.farmerName}</Text>
                  
                  <View style={styles.reportMeta}>
                    <View style={styles.metaItem}>
                      <MapPin color={tc.textMuted} size={12} />
                      <Text style={[styles.metaText, { color: tc.textMuted }]}>{report.location}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Calendar color={tc.textMuted} size={12} />
                      <Text style={[styles.metaText, { color: tc.textMuted }]}>{formatDate(report.submittedAt)}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.reportStatus}>
                  <View style={[
                    styles.statusBadge,
                    {
                      backgroundColor: getStatusBgColor(report.status),
                      borderColor: getStatusColor(report.status)
                    }
                  ]}>
                    <StatusIcon color={getStatusColor(report.status)} size={12} />
                    <Text style={[styles.statusText, { color: getStatusColor(report.status) }]}>
                      {report.status === 'pending'
                        ? 'Pending Verification'
                        : report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                    </Text>
                  </View>
                  <Text style={[styles.confidenceText, { color: tc.textMuted }]}>{report.confidence}% confidence</Text>
                </View>
              </View>

              <View style={styles.reportDetails}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: tc.textMuted }]}>Crop:</Text>
                  <Text style={[styles.detailValue, { color: tc.text }]}>{report.cropType}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: tc.textMuted }]}>Farmer:</Text>
                  <Text style={[styles.detailValue, { color: tc.text }]}>{report.farmerName}</Text>
                </View>
              </View>

              <Text style={[styles.description, { color: tc.textSecondary }]}>
                Detection ID: {report.detectionId}
              </Text>
              {!!report.verificationMessage && (
                <Text style={[styles.description, { color: getStatusColor(report.status) }]}>
                  {report.verificationMessage}
                </Text>
              )}

              {report.status === 'pending' && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.reviewButton}
                    onPress={async () => {
                      try {
                        await updateStatus(report.id, 'verified');
                      } catch (e: any) {
                        Alert.alert('Error', e?.message || 'Failed to update report');
                      }
                    }}
                  >
                    <Text style={styles.reviewButtonText}>Verify Detection</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rejectButton, { backgroundColor: '#FEF2F2' }]}
                    onPress={async () => {
                      try {
                        await updateStatus(report.id, 'rejected');
                      } catch (e: any) {
                        Alert.alert('Error', e?.message || 'Failed to update report');
                      }
                    }}
                  >
                    <XCircle color="#EF4444" size={16} />
                    <Text style={styles.rejectButtonText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
              {report.status === 'verified' && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.reviewButton}
                    onPress={async () => {
                      try {
                        await updateStatus(report.id, 'resolved');
                      } catch (e: any) {
                        Alert.alert('Error', e?.message || 'Failed to resolve report');
                      }
                    }}
                  >
                    <Text style={styles.reviewButtonText}>Mark Resolved</Text>
                  </TouchableOpacity>
                </View>
              )}

              {report.reviewedAt && (
                <Text style={[styles.reviewedText, { color: tc.textMuted }]}>
                  Verification updated on {formatDate(report.reviewedAt)}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}

        {!loading && items.length === 0 && (
          <View style={styles.emptyState}>
            <AlertTriangle color={tc.textMuted} size={48} />
            <Text style={[styles.emptyTitle, { color: tc.text }]}>No reports found</Text>
            <Text style={[styles.emptyText, { color: tc.textMuted }]}>
              {searchQuery ? 'Try adjusting your search terms' : 'No reports match the selected filter'}
            </Text>
          </View>
        )}
        {!!error && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: '#DC2626' }]}>{error}</Text>
            <TouchableOpacity style={styles.reviewButton} onPress={refresh}>
              <Text style={styles.reviewButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  exportButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  exportButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  statsScroll: {
    backgroundColor: 'white',
    maxHeight: 92,
    paddingVertical: 8,
    flexGrow: 0,
  },
  statsRow: {
    alignItems: 'center',
    paddingRight: 8,
  },
  statCard: {
    width: 140,
    height: 72,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
    borderRadius: 12,
    alignSelf: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  searchSection: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  filtersScroll: {
    flexGrow: 0,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  activeFilterButton: {
    backgroundColor: '#F0FDF4',
  },
  filterText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#22C55E',
  },
  reportsList: {
    flex: 1,
  },
  reportsContent: {
    padding: 16,
  },
  reportCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  reportHeader: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  reportImage: {
    position: 'relative',
  },
  cropImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  reportInfo: {
    flex: 1,
  },
  diseaseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  farmerName: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 6,
  },
  reportMeta: {
    gap: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  reportStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  confidenceText: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  reportDetails: {
    gap: 6,
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  reviewButton: {
    flex: 1,
    backgroundColor: '#22C55E',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  reviewButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  viewDetailsButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  rejectButton: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  rejectButtonText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 14,
  },
  reviewedText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingWrap: {
    paddingVertical: 36,
    alignItems: 'center',
  },
});