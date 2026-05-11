import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { CircleDollarSign, Calendar, CircleCheck } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { apiGet, apiPost } from '@/utils/api';
import { useFocusEffect } from 'expo-router';

type FarmerSubsidyItem = {
  id: string;
  title: string;
  description: string;
  amount: number;
  maxAmount: number;
  eligibilityCriteria: string[];
  applicationDeadline: string | null;
  status: string;
  subSubsidies?: FarmerSubsidyItem[];
};

type FarmerSubsidyApplicationItem = {
  applicationId: string;
  subsidyId: string;
  subsidyTitle: string;
  status: 'pending' | 'accepted' | 'rejected' | string;
  applyNote?: string | null;
  decisionNote?: string | null;
  createdAt?: string | null;
  decidedAt?: string | null;
};

export default function FarmerSubsidiesScreen() {
  const { colors: tc } = useTheme();
  const [items, setItems] = useState<FarmerSubsidyItem[]>([]);
  const [applications, setApplications] = useState<FarmerSubsidyApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [payload, appsPayload] = await Promise.all([
        apiGet<{ total: number; items: FarmerSubsidyItem[] }>('/api/farmer/subsidies/available'),
        apiGet<{ total: number; items: FarmerSubsidyApplicationItem[] }>('/api/farmer/subsidy-applications'),
      ]);
      setItems(Array.isArray(payload.items) ? payload.items : []);
      setApplications(Array.isArray(appsPayload.items) ? appsPayload.items : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load subsidies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(value || 0);

  const latestAppBySubsidy = applications.reduce((acc, app) => {
    const existing = acc[app.subsidyId];
    if (!existing) {
      acc[app.subsidyId] = app;
      return acc;
    }
    const a = new Date(app.createdAt || 0).getTime();
    const b = new Date(existing.createdAt || 0).getTime();
    if (a >= b) acc[app.subsidyId] = app;
    return acc;
  }, {} as Record<string, FarmerSubsidyApplicationItem>);

  const getStatusBadgeColor = (status: string) => {
    if (status === 'accepted') return '#22C55E';
    if (status === 'rejected') return '#EF4444';
    return '#F59E0B';
  };

  const applyForSubsidy = async (subsidyId: string, subsidyTitle: string) => {
    try {
      setApplyingId(subsidyId);
      await apiPost(`/api/farmer/subsidies/${encodeURIComponent(subsidyId)}/apply`, {});
      await load();
      Alert.alert('Applied', `Your request for "${subsidyTitle}" has been sent to admin.`);
    } catch (e: any) {
      Alert.alert('Apply Failed', e?.message || 'Could not submit request');
    } finally {
      setApplyingId(null);
    }
  };

  const renderCard = (item: FarmerSubsidyItem, nested: boolean = false) => (
    <View
      key={item.id}
      style={[
        styles.card,
        { backgroundColor: tc.card, borderColor: tc.border },
        nested && styles.subCard,
      ]}
    >
      <Text style={[styles.title, { color: tc.text }]}>{item.title}</Text>
      {!!item.description && <Text style={[styles.desc, { color: tc.textSecondary }]}>{item.description}</Text>}

      <View style={styles.row}>
        <CircleDollarSign size={16} color="#16A34A" />
        <Text style={[styles.rowText, { color: tc.textSecondary }]}>
          {formatCurrency(item.amount)} to {formatCurrency(item.maxAmount)}
        </Text>
      </View>
      <View style={styles.row}>
        <Calendar size={16} color="#EA580C" />
        <Text style={[styles.rowText, { color: tc.textSecondary }]}>
          Deadline: {item.applicationDeadline ? new Date(item.applicationDeadline).toLocaleDateString() : 'Open'}
        </Text>
      </View>
      {latestAppBySubsidy[item.id] && (
        <View style={[styles.statusBadge, { backgroundColor: getStatusBadgeColor(latestAppBySubsidy[item.id].status) + '22', borderColor: getStatusBadgeColor(latestAppBySubsidy[item.id].status) }]}>
          <Text style={[styles.statusText, { color: getStatusBadgeColor(latestAppBySubsidy[item.id].status) }]}>
            Application: {latestAppBySubsidy[item.id].status}
          </Text>
        </View>
      )}
      {!!latestAppBySubsidy[item.id]?.decisionNote && (
        <Text style={[styles.decisionNote, { color: tc.textMuted }]}>
          Admin note: {latestAppBySubsidy[item.id]?.decisionNote}
        </Text>
      )}

      {!!item.eligibilityCriteria?.length && (
        <View style={[styles.criteriaBox, { backgroundColor: tc.screenSecondary }]}>
          {item.eligibilityCriteria.slice(0, 4).map((line, i) => (
            <Text key={`${item.id}-${i}`} style={[styles.criteriaLine, { color: tc.textMuted }]}>• {line}</Text>
          ))}
        </View>
      )}

      {(() => {
        const app = latestAppBySubsidy[item.id];
        const disableApply = !!app && (app.status === 'pending' || app.status === 'accepted');
        return (
          <TouchableOpacity
            style={[
              styles.applyButton,
              { backgroundColor: disableApply ? '#9CA3AF' : '#22C55E' },
              applyingId === item.id && { opacity: 0.7 },
            ]}
            onPress={() => applyForSubsidy(item.id, item.title)}
            disabled={disableApply || applyingId === item.id}
          >
            <Text style={styles.applyButtonText}>
              {app?.status === 'pending'
                ? 'Application Pending'
                : app?.status === 'accepted'
                  ? 'Application Accepted'
                  : applyingId === item.id
                    ? 'Applying...'
                    : 'Apply'}
            </Text>
          </TouchableOpacity>
        );
      })()}

      {!!item.subSubsidies?.length && (
        <View style={styles.subWrap}>
          <Text style={[styles.subTitle, { color: tc.textSecondary }]}>Available sub-subsidies</Text>
          {item.subSubsidies.map((sub) => renderCard(sub, true))}
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: tc.screen }]}>
      <View style={[styles.header, { backgroundColor: tc.headerBg, borderBottomColor: tc.border }]}>
        <Text style={[styles.headerTitle, { color: tc.text }]}>Available Subsidies</Text>
        <TouchableOpacity onPress={load}>
          <CircleCheck color="#22C55E" size={22} />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#22C55E" />
          </View>
        )}
        {!!error && !loading && (
          <View style={styles.center}>
            <Text style={{ color: '#DC2626' }}>{error}</Text>
          </View>
        )}
        {!loading && !error && items.map((item) => renderCard(item))}
        {!loading && !error && items.length === 0 && (
          <View style={styles.center}>
            <Text style={{ color: tc.textMuted }}>No active subsidies available right now.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 60,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  list: { flex: 1 },
  listContent: { padding: 16 },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 36 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  subCard: {
    borderStyle: 'dashed',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  desc: {
    fontSize: 13,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  rowText: { fontSize: 13 },
  criteriaBox: {
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
  },
  criteriaLine: { fontSize: 12, marginBottom: 3 },
  subWrap: { marginTop: 10 },
  subTitle: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  applyButton: {
    marginTop: 8,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 13,
  },
  statusBadge: {
    borderWidth: 1,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 2,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  decisionNote: {
    fontSize: 12,
    marginBottom: 4,
  },
});
