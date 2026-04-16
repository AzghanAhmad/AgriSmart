import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { Search, Plus, DollarSign, Calendar, Users, CircleCheck as CheckCircle, Clock, CreditCard as Edit3, Trash2, CircleAlert as AlertCircle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface SubsidyProgram {
  id: string;
  title: string;
  description: string;
  amount: number;
  maxAmount: number;
  eligibilityCriteria: string[];
  applicationDeadline: string;
  status: 'active' | 'paused' | 'expired';
  totalApplicants: number;
  approvedApplicants: number;
  totalDisbursed: number;
  createdAt: string;
}

export default function SubsidiesScreen() {
  const { colors: tc } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const mockPrograms: SubsidyProgram[] = [
    {
      id: '1',
      title: 'Kisan Card Financial Support',
      description: 'Financial assistance program for small-scale farmers to support crop cultivation and modern farming techniques.',
      amount: 50000,
      maxAmount: 100000,
      eligibilityCriteria: [
        'Land ownership less than 5 acres',
        'Annual income below PKR 200,000',
        'Pakistani citizenship required',
        'No previous subsidy in last 2 years'
      ],
      applicationDeadline: '2024-03-31',
      status: 'active',
      totalApplicants: 1250,
      approvedApplicants: 785,
      totalDisbursed: 39250000,
      createdAt: '2024-01-01'
    },
    {
      id: '2',
      title: 'Organic Farming Initiative Grant',
      description: 'Supporting farmers transitioning to organic farming practices with equipment and training subsidies.',
      amount: 75000,
      maxAmount: 150000,
      eligibilityCriteria: [
        'Certified organic farming course completion',
        'Minimum 2 years farming experience',
        'Commitment to organic practices for 3 years',
        'Farm size between 2-20 acres'
      ],
      applicationDeadline: '2024-06-30',
      status: 'active',
      totalApplicants: 340,
      approvedApplicants: 245,
      totalDisbursed: 18375000,
      createdAt: '2024-01-15'
    },
    {
      id: '3',
      title: 'Wheat Production Incentive',
      description: 'Special incentive program for wheat farmers to increase production and improve food security.',
      amount: 30000,
      maxAmount: 80000,
      eligibilityCriteria: [
        'Primary crop must be wheat',
        'Minimum 3 acres wheat cultivation',
        'Use of approved seed varieties',
        'Participation in government training programs'
      ],
      applicationDeadline: '2024-02-28',
      status: 'paused',
      totalApplicants: 892,
      approvedApplicants: 567,
      totalDisbursed: 17010000,
      createdAt: '2023-11-01'
    },
    {
      id: '4',
      title: 'Youth Farmer Startup Scheme',
      description: 'Supporting young entrepreneurs in agriculture with startup capital and mentorship programs.',
      amount: 100000,
      maxAmount: 200000,
      eligibilityCriteria: [
        'Age between 18-35 years',
        'Agriculture degree or diploma',
        'Business plan submission',
        'Land lease agreement for minimum 3 years'
      ],
      applicationDeadline: '2023-12-31',
      status: 'expired',
      totalApplicants: 156,
      approvedApplicants: 89,
      totalDisbursed: 8900000,
      createdAt: '2023-10-01'
    }
  ];

  const filters = [
    { id: 'all', label: 'All Programs' },
    { id: 'active', label: 'Active' },
    { id: 'paused', label: 'Paused' },
    { id: 'expired', label: 'Expired' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#22C55E';
      case 'paused': return '#F59E0B';
      case 'expired': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'active': return '#F0FDF4';
      case 'paused': return '#FFFBEB';
      case 'expired': return '#FEF2F2';
      default: return '#F3F4F6';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return CheckCircle;
      case 'paused': return Clock;
      case 'expired': return AlertCircle;
      default: return Clock;
    }
  };

  const filteredPrograms = mockPrograms.filter(program => {
    const matchesSearch = program.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         program.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || program.status === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const totalStats = {
    totalPrograms: mockPrograms.length,
    activePrograms: mockPrograms.filter(p => p.status === 'active').length,
    totalApplicants: mockPrograms.reduce((sum, p) => sum + p.totalApplicants, 0),
    totalDisbursed: mockPrograms.reduce((sum, p) => sum + p.totalDisbursed, 0)
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleEdit = (programId: string) => {
    Alert.alert('Edit Program', `Edit program ${programId} functionality would be implemented here.`);
  };

  const handleDelete = (programId: string) => {
    Alert.alert(
      'Delete Program',
      'Are you sure you want to delete this subsidy program? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => console.log('Deleted:', programId) }
      ]
    );
  };

  const handleToggleStatus = (programId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    Alert.alert(
      `${newStatus === 'active' ? 'Activate' : 'Pause'} Program`,
      `Are you sure you want to ${newStatus === 'active' ? 'activate' : 'pause'} this program?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => console.log('Status changed:', programId, newStatus) }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: tc.screen }]}>
      <View style={[styles.header, { backgroundColor: tc.headerBg, borderBottomColor: tc.border }]}>
        <Text style={[styles.title, { color: tc.text }]}>Subsidy Management</Text>
        <TouchableOpacity style={styles.addButton}>
          <Plus color="white" size={20} />
          <Text style={styles.addButtonText}>Add Program</Text>
        </TouchableOpacity>
      </View>

      {/* Statistics Cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.statsScroll, { backgroundColor: tc.headerBg }]}>
        <View style={[styles.statCard, { backgroundColor: tc.card, borderColor: tc.border, borderWidth: 1 }]}>
          <Text style={[styles.statValue, { color: tc.text }]}>{totalStats.totalPrograms}</Text>
          <Text style={[styles.statLabel, { color: tc.textMuted }]}>Total Programs</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: tc.card, borderColor: tc.border, borderWidth: 1 }]}>
          <Text style={[styles.statValue, { color: '#22C55E' }]}>{totalStats.activePrograms}</Text>
          <Text style={[styles.statLabel, { color: tc.textMuted }]}>Active</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: tc.card, borderColor: tc.border, borderWidth: 1 }]}>
          <Text style={[styles.statValue, { color: tc.text }]}>{totalStats.totalApplicants.toLocaleString()}</Text>
          <Text style={[styles.statLabel, { color: tc.textMuted }]}>Total Applicants</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: tc.card, borderColor: tc.border, borderWidth: 1 }]}>
          <Text style={[styles.statValue, { fontSize: 18, color: tc.text }]}>
            {formatCurrency(totalStats.totalDisbursed).replace('PKR', '₨')}
          </Text>
          <Text style={[styles.statLabel, { color: tc.textMuted }]}>Disbursed</Text>
        </View>
      </ScrollView>

      {/* Search and Filter */}
      <View style={[styles.searchSection, { backgroundColor: tc.headerBg, borderBottomColor: tc.border }]}>
        <View style={[styles.searchContainer, { backgroundColor: tc.inputBg }]}>
          <Search color={tc.textMuted} size={20} />
          <TextInput
            style={[styles.searchInput, { color: tc.text }]}
            placeholder="Search programs..."
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

      {/* Programs List */}
      <ScrollView style={[styles.programsList, { backgroundColor: tc.screen }]} contentContainerStyle={styles.programsContent}>
        {filteredPrograms.map((program) => {
          const StatusIcon = getStatusIcon(program.status);
          const approvalRate = Math.round((program.approvedApplicants / program.totalApplicants) * 100);
          
          return (
            <View key={program.id} style={[styles.programCard, { backgroundColor: tc.card, borderColor: tc.border, borderWidth: 1 }]}>
              <View style={styles.programHeader}>
                <View style={styles.programInfo}>
                  <Text style={[styles.programTitle, { color: tc.text }]}>{program.title}</Text>
                  <View style={[
                    styles.statusBadge,
                    {
                      backgroundColor: getStatusBgColor(program.status),
                      borderColor: getStatusColor(program.status)
                    }
                  ]}>
                    <StatusIcon color={getStatusColor(program.status)} size={12} />
                    <Text style={[styles.statusText, { color: getStatusColor(program.status) }]}>
                      {program.status.charAt(0).toUpperCase() + program.status.slice(1)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.programActions}>
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: tc.inputBg }]}
                    onPress={() => handleEdit(program.id)}
                  >
                    <Edit3 color={tc.textMuted} size={16} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: tc.inputBg }]}
                    onPress={() => handleDelete(program.id)}
                  >
                    <Trash2 color="#EF4444" size={16} />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={[styles.programDescription, { color: tc.textSecondary }]}>{program.description}</Text>

              {/* Program Details */}
              <View style={styles.programDetails}>
                <View style={styles.detailRow}>
                  <DollarSign color="#22C55E" size={16} />
                  <Text style={[styles.detailText, { color: tc.textSecondary }]}>
                    {formatCurrency(program.amount)} - {formatCurrency(program.maxAmount)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Calendar color="#F59E0B" size={16} />
                  <Text style={[styles.detailText, { color: tc.textSecondary }]}>
                    Deadline: {formatDate(program.applicationDeadline)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Users color="#3B82F6" size={16} />
                  <Text style={[styles.detailText, { color: tc.textSecondary }]}>
                    {program.approvedApplicants}/{program.totalApplicants} approved ({approvalRate}%)
                  </Text>
                </View>
              </View>

              {/* Eligibility Criteria */}
              <View style={[styles.criteriaSection, { backgroundColor: tc.screenSecondary }]}>
                <Text style={[styles.criteriaTitle, { color: tc.text }]}>Eligibility Criteria:</Text>
                {program.eligibilityCriteria.slice(0, 2).map((criteria, index) => (
                  <Text key={index} style={[styles.criteriaText, { color: tc.textMuted }]}>• {criteria}</Text>
                ))}
                {program.eligibilityCriteria.length > 2 && (
                  <Text style={[styles.moreText, { color: tc.textMuted }]}>
                    +{program.eligibilityCriteria.length - 2} more criteria
                  </Text>
                )}
              </View>

              {/* Progress Bar */}
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={[styles.progressLabel, { color: tc.textMuted }]}>Disbursement Progress</Text>
                  <Text style={[styles.progressValue, { color: tc.text }]}>
                    {formatCurrency(program.totalDisbursed)}
                  </Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: tc.border }]}>
                  <View 
                    style={[
                      styles.progressFill,
                      { 
                        width: `${Math.min((program.totalDisbursed / (program.maxAmount * program.totalApplicants)) * 100, 100)}%`,
                        backgroundColor: getStatusColor(program.status)
                      }
                    ]} 
                  />
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.cardActions}>
                <TouchableOpacity 
                  style={[
                    styles.toggleButton,
                    { backgroundColor: program.status === 'active' ? '#F59E0B' : '#22C55E' }
                  ]}
                  onPress={() => handleToggleStatus(program.id, program.status)}
                >
                  <Text style={styles.toggleButtonText}>
                    {program.status === 'active' ? 'Pause' : 'Activate'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.viewButton, { backgroundColor: tc.inputBg, borderColor: tc.border, borderWidth: 1 }]}>
                  <Text style={[styles.viewButtonText, { color: tc.textSecondary }]}>View Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {filteredPrograms.length === 0 && (
          <View style={styles.emptyState}>
            <DollarSign color={tc.textMuted} size={48} />
            <Text style={[styles.emptyTitle, { color: tc.text }]}>No programs found</Text>
            <Text style={[styles.emptyText, { color: tc.textMuted }]}>
              {searchQuery ? 'Try adjusting your search terms' : 'No programs match the selected filter'}
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
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#22C55E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
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
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
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
  programsList: {
    flex: 1,
  },
  programsContent: {
    padding: 16,
  },
  programCard: {
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
  programHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  programInfo: {
    flex: 1,
    marginRight: 12,
  },
  programTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  programActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  programDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  programDetails: {
    gap: 6,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
  },
  criteriaSection: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  criteriaTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  criteriaText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  moreText: {
    fontSize: 12,
    color: '#22C55E',
    fontStyle: 'italic',
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  progressValue: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  viewButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  viewButtonText: {
    color: '#374151',
    fontWeight: '500',
    fontSize: 14,
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