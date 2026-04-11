import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { ArrowLeft, Leaf, TriangleAlert } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet } from '@/utils/api';

type DetectionRow = {
  id: string;
  cropType?: string;
  diseaseName?: string;
  name?: string;
  detectedAt?: string;
  severity?: 'low' | 'medium' | 'high' | string;
  imageUrl?: string;
};

export default function CureGuidanceHistoryScreen() {
  const router = useRouter();
  const { colors: tc } = useTheme();
  const { user } = useAuth();
  const [rows, setRows] = useState<DetectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError('');
    try {
      const resp = await apiGet<{ detections: DetectionRow[] }>(
        `/api/farmer/detections/recent?farmerId=${encodeURIComponent(user.id)}`,
      );
      setRows(resp.detections || []);
    } catch {
      setError('Unable to load scans. Please try again.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = (id: string) => {
    router.push(`/(farmer)/cure-guidance-detail?scanId=${encodeURIComponent(id)}` as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: tc.screen }]}>
      <View style={[styles.header, { backgroundColor: tc.headerBg, borderBottomColor: tc.border }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: tc.screenSecondary }]} onPress={() => router.back()}>
          <ArrowLeft color={tc.text} size={22} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: tc.text }]}>Cure Guidance Scan History</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ScrollView contentContainerStyle={styles.content}>
          {[1, 2, 3].map((k) => (
            <View key={k} style={[styles.skeletonCard, { backgroundColor: tc.card, borderColor: tc.border }]} />
          ))}
          <ActivityIndicator color={tc.primary} style={{ marginTop: 8 }} />
        </ScrollView>
      ) : error ? (
        <View style={styles.center}>
          <TriangleAlert color="#EF4444" size={28} />
          <Text style={[styles.msg, { color: tc.text }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: tc.primary }]} onPress={load}>
            <Text style={styles.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.msg, { color: tc.textMuted }]}>No previous scans available.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {rows.map((row) => {
            const sev = String(row.severity || 'low').toLowerCase();
            const sevBg = sev === 'high' ? '#EF4444' : sev === 'medium' ? '#F59E0B' : '#22C55E';
            const crop = (row.cropType || 'crop').toUpperCase();
            const disease = row.diseaseName || row.name || 'Unknown Disease';
            return (
              <TouchableOpacity
                key={row.id}
                activeOpacity={0.8}
                onPress={() => openDetail(row.id)}
                style={[styles.card, { backgroundColor: tc.card, borderColor: tc.border }]}
              >
                {row.imageUrl ? (
                  <Image source={{ uri: row.imageUrl }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, { backgroundColor: tc.screenSecondary, justifyContent: 'center', alignItems: 'center' }]}>
                    <Leaf color={tc.textMuted} size={18} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: tc.text }]}>{crop}</Text>
                  <Text style={[styles.rowSub, { color: tc.textSecondary }]}>{disease}</Text>
                  <Text style={[styles.rowDate, { color: tc.textMuted }]}>
                    {row.detectedAt ? new Date(row.detectedAt).toLocaleString() : '—'}
                  </Text>
                  <View style={[styles.sevBadge, { backgroundColor: sevBg }]}>
                    <Text style={styles.sevTxt}>{sev.toUpperCase()}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => openDetail(row.id)} style={[styles.viewBtn, { backgroundColor: '#22C55E' }]}>
                  <Text style={styles.viewTxt}>View Guidance</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700' },
  content: { padding: 16, gap: 12, paddingBottom: 28 },
  card: { borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row', gap: 10, alignItems: 'center' },
  thumb: { width: 64, height: 64, borderRadius: 10 },
  rowTitle: { fontSize: 14, fontWeight: '700' },
  rowSub: { fontSize: 13, marginTop: 2 },
  rowDate: { fontSize: 12, marginTop: 3 },
  sevBadge: { marginTop: 6, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  sevTxt: { color: 'white', fontSize: 11, fontWeight: '700' },
  viewBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  viewTxt: { color: 'white', fontSize: 12, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 10 },
  msg: { fontSize: 15, textAlign: 'center' },
  retryBtn: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  retryTxt: { color: 'white', fontWeight: '700' },
  skeletonCard: { height: 96, borderRadius: 14, borderWidth: 1, opacity: 0.55 },
});
