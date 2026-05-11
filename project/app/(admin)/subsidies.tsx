import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Search, Plus, DollarSign, Calendar, Users, CircleCheck as CheckCircle, Clock, CircleAlert as AlertCircle, Trash2, GitBranchPlus } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { AdminSubsidyItem, useAdminSubsidies, useAdminSubsidyApplications } from '@/hooks/useAdmin';

type SubsidyStatus = 'all' | 'active' | 'paused' | 'expired';

export default function SubsidiesScreen() {
  const { colors: tc } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<SubsidyStatus>('all');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [eligibilityText, setEligibilityText] = useState('');
  const [parentSubsidyId, setParentSubsidyId] = useState('');
  const [creating, setCreating] = useState(false);
  const { items, allItems, total, loading, error, createSubsidy, deleteSubsidy, updateSubsidyStatus } = useAdminSubsidies(selectedFilter, searchQuery);
  const { items: pendingApps, loading: appsLoading, error: appsError, decide: decideApplication } = useAdminSubsidyApplications('pending');

  const topLevelSubsidies = useMemo(
    () => allItems.filter((item) => !item.parentSubsidyId),
    [allItems]
  );

  const filters = [
    { id: 'all', label: 'All Programs' },
    { id: 'active', label: 'Active' },
    { id: 'paused', label: 'Paused' },
    { id: 'expired', label: 'Expired' },
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const clearForm = () => {
    setTitle('');
    setDescription('');
    setAmount('');
    setMaxAmount('');
    setDeadline('');
    setEligibilityText('');
    setParentSubsidyId('');
  };

  const submitCreate = async () => {
    const titleValue = title.trim();
    const amountValue = Number(amount);
    if (!titleValue) {
      Alert.alert('Validation', 'Title is required.');
      return;
    }
    if (!Number.isFinite(amountValue) || amountValue < 0) {
      Alert.alert('Validation', 'Amount must be a valid non-negative number.');
      return;
    }
    const maxAmountValue = maxAmount.trim() ? Number(maxAmount) : amountValue;
    if (!Number.isFinite(maxAmountValue) || maxAmountValue < 0) {
      Alert.alert('Validation', 'Maximum amount must be a valid non-negative number.');
      return;
    }

    try {
      setCreating(true);
      await createSubsidy({
        title: titleValue,
        description: description.trim(),
        amount: amountValue,
        maxAmount: maxAmountValue,
        applicationDeadline: deadline.trim() || null,
        eligibilityCriteria: eligibilityText,
        parentSubsidyId: parentSubsidyId.trim() || null,
      });
      clearForm();
      Alert.alert('Success', 'Subsidy has been created.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create subsidy');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (subsidy: AdminSubsidyItem) => {
    Alert.alert(
      'Delete Subsidy',
      `Delete "${subsidy.title}"? Any sub-subsidies under it will also be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSubsidy(subsidy.id);
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to delete subsidy');
            }
          },
        },
      ]
    );
  };

  const renderSubsidyCard = (subsidy: AdminSubsidyItem, nested: boolean = false) => {
    const StatusIcon = getStatusIcon(subsidy.status);
    const nextStatus = subsidy.status === 'active' ? 'paused' : 'active';
    return (
      <View
        key={subsidy.id}
        style={[
          styles.programCard,
          { backgroundColor: tc.card, borderColor: tc.border, borderWidth: 1 },
          nested && styles.subCard,
        ]}
      >
        <View style={styles.programHeader}>
          <View style={styles.programInfo}>
            <Text style={[styles.programTitle, { color: tc.text }]}>{subsidy.title}</Text>
            <Text style={[styles.metaId, { color: tc.textMuted }]}>ID: {subsidy.id}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(subsidy.status), borderColor: getStatusColor(subsidy.status) }]}>
              <StatusIcon color={getStatusColor(subsidy.status)} size={12} />
              <Text style={[styles.statusText, { color: getStatusColor(subsidy.status) }]}>{subsidy.status}</Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: tc.inputBg }]} onPress={() => handleDelete(subsidy)}>
            <Trash2 color="#EF4444" size={16} />
          </TouchableOpacity>
        </View>

        {!!subsidy.description && <Text style={[styles.programDescription, { color: tc.textSecondary }]}>{subsidy.description}</Text>}
        <View style={styles.detailRow}>
          <DollarSign color="#22C55E" size={16} />
          <Text style={[styles.detailText, { color: tc.textSecondary }]}>
            {formatCurrency(subsidy.amount)} to {formatCurrency(subsidy.maxAmount)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Calendar color="#F59E0B" size={16} />
          <Text style={[styles.detailText, { color: tc.textSecondary }]}>
            Deadline: {subsidy.applicationDeadline ? new Date(subsidy.applicationDeadline).toLocaleDateString() : 'Open'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Users color="#3B82F6" size={16} />
          <Text style={[styles.detailText, { color: tc.textSecondary }]}>
            {subsidy.approvedApplicants}/{subsidy.totalApplicants} approved
          </Text>
        </View>
        {!!subsidy.eligibilityCriteria?.length && (
          <View style={[styles.criteriaSection, { backgroundColor: tc.screenSecondary }]}>
            {subsidy.eligibilityCriteria.slice(0, 3).map((line, index) => (
              <Text key={`${subsidy.id}-${index}`} style={[styles.criteriaText, { color: tc.textMuted }]}>• {line}</Text>
            ))}
          </View>
        )}

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.toggleButton, { backgroundColor: subsidy.status === 'active' ? '#F59E0B' : '#22C55E' }]}
            onPress={() => updateSubsidyStatus(subsidy.id, nextStatus as 'active' | 'paused' | 'expired')}
          >
            <Text style={styles.toggleButtonText}>{subsidy.status === 'active' ? 'Pause' : 'Activate'}</Text>
          </TouchableOpacity>
          {!nested && (
            <TouchableOpacity
              style={[styles.toggleButton, { backgroundColor: '#3B82F6' }]}
              onPress={() => setParentSubsidyId(subsidy.id)}
            >
              <GitBranchPlus color="white" size={14} />
              <Text style={styles.toggleButtonText}>Add Sub</Text>
            </TouchableOpacity>
          )}
        </View>

        {!nested && subsidy.subSubsidies?.length ? (
          <View style={styles.subList}>
            <Text style={[styles.subListLabel, { color: tc.textSecondary }]}>Sub-subsidies</Text>
            {subsidy.subSubsidies.map((child) => renderSubsidyCard(child, true))}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: tc.screen }]}>
      <View style={[styles.header, { backgroundColor: tc.headerBg, borderBottomColor: tc.border }]}>
        <Text style={[styles.title, { color: tc.text }]}>Subsidy Management</Text>
      </View>

      <ScrollView style={[styles.programsList, { backgroundColor: tc.screen }]} contentContainerStyle={styles.programsContent}>
        <View style={[styles.createBox, { backgroundColor: tc.card, borderColor: tc.border }]}>
          <View style={styles.createHead}>
            <Plus color="#22C55E" size={18} />
            <Text style={[styles.createTitle, { color: tc.text }]}>Add Program / Sub-Subsidy</Text>
          </View>
          <TextInput style={[styles.input, { color: tc.text, borderColor: tc.border, backgroundColor: tc.inputBg }]} placeholder="Title" value={title} onChangeText={setTitle} placeholderTextColor={tc.textMuted} />
          <TextInput style={[styles.input, { color: tc.text, borderColor: tc.border, backgroundColor: tc.inputBg }]} placeholder="Description" value={description} onChangeText={setDescription} placeholderTextColor={tc.textMuted} />
          <View style={styles.row}>
            <TextInput style={[styles.input, styles.half, { color: tc.text, borderColor: tc.border, backgroundColor: tc.inputBg }]} placeholder="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholderTextColor={tc.textMuted} />
            <TextInput style={[styles.input, styles.half, { color: tc.text, borderColor: tc.border, backgroundColor: tc.inputBg }]} placeholder="Max Amount" value={maxAmount} onChangeText={setMaxAmount} keyboardType="numeric" placeholderTextColor={tc.textMuted} />
          </View>
          <TextInput style={[styles.input, { color: tc.text, borderColor: tc.border, backgroundColor: tc.inputBg }]} placeholder="Deadline (YYYY-MM-DD)" value={deadline} onChangeText={setDeadline} placeholderTextColor={tc.textMuted} />
          <TextInput style={[styles.input, { color: tc.text, borderColor: tc.border, backgroundColor: tc.inputBg }]} placeholder="Eligibility (comma separated)" value={eligibilityText} onChangeText={setEligibilityText} placeholderTextColor={tc.textMuted} />
          <TextInput style={[styles.input, { color: tc.text, borderColor: tc.border, backgroundColor: tc.inputBg }]} placeholder="Parent Subsidy ID (optional, for sub-subsidy)" value={parentSubsidyId} onChangeText={setParentSubsidyId} placeholderTextColor={tc.textMuted} />
          {!!topLevelSubsidies.length && (
            <Text style={[styles.hint, { color: tc.textMuted }]}>
              Parent IDs: {topLevelSubsidies.slice(0, 4).map((x) => x.id).join(', ')}
            </Text>
          )}
          <TouchableOpacity style={[styles.addButton, creating && { opacity: 0.7 }]} onPress={submitCreate} disabled={creating}>
            <Text style={styles.addButtonText}>{creating ? 'Saving...' : 'Save Subsidy'}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.statsBox, { backgroundColor: tc.card, borderColor: tc.border }]}>
          <Text style={[styles.statValue, { color: tc.text }]}>{total}</Text>
          <Text style={[styles.statLabel, { color: tc.textMuted }]}>Visible Programs</Text>
        </View>

        <View style={[styles.statsBox, { backgroundColor: tc.card, borderColor: tc.border }]}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{pendingApps.length}</Text>
          <Text style={[styles.statLabel, { color: tc.textMuted }]}>Pending Applications</Text>
        </View>

        <View style={[styles.createBox, { backgroundColor: tc.card, borderColor: tc.border }]}>
          <Text style={[styles.createTitle, { color: tc.text, marginBottom: 10 }]}>Farmer Requests (Accept / Reject)</Text>
          {appsLoading && <ActivityIndicator size="small" color="#22C55E" />}
          {!!appsError && <Text style={{ color: '#DC2626' }}>{appsError}</Text>}
          {!appsLoading && !appsError && pendingApps.length === 0 && (
            <Text style={{ color: tc.textMuted }}>No pending applications right now.</Text>
          )}
          {!appsLoading && !appsError && pendingApps.map((app) => (
            <View key={app.applicationId} style={[styles.requestCard, { borderColor: tc.border, backgroundColor: tc.inputBg }]}>
              <Text style={[styles.requestTitle, { color: tc.text }]}>{app.subsidyTitle}</Text>
              <Text style={{ color: tc.textSecondary, fontSize: 12 }}>Farmer: {app.farmerName}</Text>
              {!!app.farmerLocation && <Text style={{ color: tc.textMuted, fontSize: 12 }}>Location: {app.farmerLocation}</Text>}
              {!!app.applyNote && <Text style={{ color: tc.textMuted, fontSize: 12, marginTop: 4 }}>Note: {app.applyNote}</Text>}
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.toggleButton, { backgroundColor: '#22C55E' }]}
                  onPress={() => decideApplication(app.applicationId, 'accepted')}
                >
                  <Text style={styles.toggleButtonText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleButton, { backgroundColor: '#EF4444' }]}
                  onPress={() => decideApplication(app.applicationId, 'rejected')}
                >
                  <Text style={styles.toggleButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

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
                  selectedFilter === filter.id && styles.activeFilterButton,
                ]}
                onPress={() => setSelectedFilter(filter.id as SubsidyStatus)}
              >
                <Text style={[styles.filterText, { color: tc.textSecondary }, selectedFilter === filter.id && styles.activeFilterText]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {loading && (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color="#22C55E" />
          </View>
        )}
        {!!error && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: '#DC2626' }]}>{error}</Text>
          </View>
        )}
        {!loading && !error && items.map((item) => renderSubsidyCard(item))}
        {!loading && !error && !items.length && (
          <View style={styles.emptyState}>
            <DollarSign color={tc.textMuted} size={48} />
            <Text style={[styles.emptyTitle, { color: tc.text }]}>No programs found</Text>
            <Text style={[styles.emptyText, { color: tc.textMuted }]}>Try changing filter or add a new subsidy.</Text>
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
    backgroundColor: '#22C55E',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
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
  createBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  createHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  createTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  half: {
    flex: 1,
  },
  hint: {
    fontSize: 11,
    marginBottom: 4,
  },
  statsBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  requestCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  requestTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  metaId: {
    fontSize: 11,
    marginBottom: 6,
  },
  subList: {
    marginTop: 8,
  },
  subListLabel: {
    fontWeight: '600',
    fontSize: 12,
    marginBottom: 6,
  },
  subCard: {
    marginBottom: 8,
    borderStyle: 'dashed',
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