import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
} from 'react-native';
import { Search, Filter, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, Clock, Eye, MapPin, Calendar } from 'lucide-react-native';

interface DiseaseReport {
  id: string;
  farmerId: string;
  farmerName: string;
  diseaseName: string;
  cropType: string;
  location: string;
  severity: 'low' | 'medium' | 'high';
  status: 'pending' | 'reviewed' | 'resolved';
  imageUrl: string;
  description: string;
  submittedAt: string;
  reviewedAt?: string;
  confidence: number;
}

export default function ReportsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const mockReports: DiseaseReport[] = [
    {
      id: '1',
      farmerId: '1',
      farmerName: 'Ahmad Khan',
      diseaseName: 'Wheat Rust',
      cropType: 'Wheat',
      location: 'Punjab, Lahore',
      severity: 'high',
      status: 'pending',
      imageUrl: 'https://images.pexels.com/photos/1714208/pexels-photo-1714208.jpeg',
      description: 'Orange-brown pustules observed on wheat leaves. Spread noticed in approximately 30% of the field.',
      submittedAt: '2024-01-15T10:30:00Z',
      confidence: 87
    },
    {
      id: '2',
      farmerId: '2',
      farmerName: 'Muhammad Ali',
      diseaseName: 'Cotton Bollworm',
      cropType: 'Cotton',
      location: 'Sindh, Karachi',
      severity: 'medium',
      status: 'reviewed',
      imageUrl: 'https://images.pexels.com/photos/1714208/pexels-photo-1714208.jpeg',
      description: 'Larvae feeding damage observed on cotton bolls. Estimated 15% crop damage.',
      submittedAt: '2024-01-14T14:20:00Z',
      reviewedAt: '2024-01-15T09:00:00Z',
      confidence: 92
    },
    {
      id: '3',
      farmerId: '3',
      farmerName: 'Fatima Bibi',
      diseaseName: 'Rice Blast',
      cropType: 'Rice',
      location: 'Punjab, Multan',
      severity: 'low',
      status: 'resolved',
      imageUrl: 'https://images.pexels.com/photos/2589457/pexels-photo-2589457.jpeg',
      description: 'Small lesions on rice leaves. Early detection allowed for prompt treatment.',
      submittedAt: '2024-01-12T08:45:00Z',
      reviewedAt: '2024-01-13T11:30:00Z',
      confidence: 78
    },
    {
      id: '4',
      farmerId: '4',
      farmerName: 'Hassan Sheikh',
      diseaseName: 'Corn Smut',
      cropType: 'Corn',
      location: 'KPK, Peshawar',
      severity: 'medium',
      status: 'pending',
      imageUrl: 'https://images.pexels.com/photos/1714208/pexels-photo-1714208.jpeg',
      description: 'Galls formation on corn ears and tassels. Affecting approximately 20% of the field.',
      submittedAt: '2024-01-13T16:15:00Z',
      confidence: 85
    }
  ];

  const filters = [
    { id: 'all', label: 'All Reports' },
    { id: 'pending', label: 'Pending Review' },
    { id: 'reviewed', label: 'Reviewed' },
    { id: 'resolved', label: 'Resolved' }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#22C55E';
      default: return '#6B7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'reviewed': return '#3B82F6';
      case 'resolved': return '#22C55E';
      default: return '#6B7280';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FFFBEB';
      case 'reviewed': return '#EFF6FF';
      case 'resolved': return '#F0FDF4';
      default: return '#F3F4F6';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return Clock;
      case 'reviewed': return Eye;
      case 'resolved': return CheckCircle;
      default: return AlertTriangle;
    }
  };

  const filteredReports = mockReports.filter(report => {
    const matchesSearch = report.diseaseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         report.farmerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         report.cropType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || report.status === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const statsData = [
    { label: 'Total Reports', value: mockReports.length.toString(), color: '#22C55E' },
    { label: 'Pending', value: mockReports.filter(r => r.status === 'pending').length.toString(), color: '#F59E0B' },
    { label: 'Reviewed', value: mockReports.filter(r => r.status === 'reviewed').length.toString(), color: '#3B82F6' },
    { label: 'Resolved', value: mockReports.filter(r => r.status === 'resolved').length.toString(), color: '#10B981' }
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Disease Reports</Text>
        <TouchableOpacity style={styles.exportButton}>
          <Text style={styles.exportButtonText}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
        {statsData.map((stat, index) => (
          <View key={index} style={styles.statCard}>
            <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Search and Filter */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Search color="#6B7280" size={20} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search reports..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterButton,
                selectedFilter === filter.id && styles.activeFilterButton
              ]}
              onPress={() => setSelectedFilter(filter.id)}
            >
              <Text style={[
                styles.filterText,
                selectedFilter === filter.id && styles.activeFilterText
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Reports List */}
      <ScrollView style={styles.reportsList} contentContainerStyle={styles.reportsContent}>
        {filteredReports.map((report) => {
          const StatusIcon = getStatusIcon(report.status);
          return (
            <TouchableOpacity key={report.id} style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <View style={styles.reportImage}>
                  <Image source={{ uri: report.imageUrl }} style={styles.cropImage} />
                  <View style={[
                    styles.severityIndicator,
                    { backgroundColor: getSeverityColor(report.severity) }
                  ]} />
                </View>
                
                <View style={styles.reportInfo}>
                  <Text style={styles.diseaseName}>{report.diseaseName}</Text>
                  <Text style={styles.farmerName}>{report.farmerName}</Text>
                  
                  <View style={styles.reportMeta}>
                    <View style={styles.metaItem}>
                      <MapPin color="#6B7280" size={12} />
                      <Text style={styles.metaText}>{report.location}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Calendar color="#6B7280" size={12} />
                      <Text style={styles.metaText}>{formatDate(report.submittedAt)}</Text>
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
                      {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                    </Text>
                  </View>
                  <Text style={styles.confidenceText}>{report.confidence}% confidence</Text>
                </View>
              </View>

              <View style={styles.reportDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Crop:</Text>
                  <Text style={styles.detailValue}>{report.cropType}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Severity:</Text>
                  <View style={styles.severityBadge}>
                    <View style={[
                      styles.severityDot,
                      { backgroundColor: getSeverityColor(report.severity) }
                    ]} />
                    <Text style={[
                      styles.severityText,
                      { color: getSeverityColor(report.severity) }
                    ]}>
                      {report.severity.charAt(0).toUpperCase() + report.severity.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.description}>{report.description}</Text>

              {report.status === 'pending' && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity style={styles.reviewButton}>
                    <Text style={styles.reviewButtonText}>Review Report</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.viewDetailsButton}>
                    <Eye color="#6B7280" size={16} />
                  </TouchableOpacity>
                </View>
              )}

              {report.reviewedAt && (
                <Text style={styles.reviewedText}>
                  Reviewed on {formatDate(report.reviewedAt)}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}

        {filteredReports.length === 0 && (
          <View style={styles.emptyState}>
            <AlertTriangle color="#6B7280" size={48} />
            <Text style={styles.emptyTitle}>No reports found</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Try adjusting your search terms' : 'No reports match the selected filter'}
            </Text>
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
    padding: 16,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
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
    paddingVertical: 16,
  },
  statCard: {
    paddingHorizontal: 16,
    alignItems: 'center',
    marginLeft: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 2,
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
  severityIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  severityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '500',
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
});