import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Animated, ActivityIndicator } from 'react-native';
import { ArrowLeft, ShieldCheck, TriangleAlert } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet } from '@/utils/api';

type DetectionDetail = {
  id: string;
  cropType: string;
  diseaseName: string;
  imageUrl?: string;
  detectedAt?: string;
  severity: 'low' | 'medium' | 'high' | string;
  verificationStatus?: 'pending' | 'verified' | 'rejected' | 'resolved' | string;
  verificationMessage?: string;
  treatment: string;
  steps: string[];
  prevention: string[];
  safetyTips: string[];
};

export default function CureGuidanceDetailScreen() {
  const { scanId } = useLocalSearchParams<{ scanId: string }>();
  const router = useRouter();
  const { colors: tc } = useTheme();
  const { user } = useAuth();
  const [detail, setDetail] = useState<DetectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const x = useRef(new Animated.Value(30)).current;

  const load = async () => {
    if (!scanId || !user?.id) return;
    setLoading(true);
    setError('');
    try {
      const resp = await apiGet<DetectionDetail>(
        `/api/farmer/detections/${encodeURIComponent(scanId)}?farmerId=${encodeURIComponent(user.id)}`,
      );
      setDetail(resp);
      Animated.timing(x, { toValue: 0, duration: 260, useNativeDriver: true }).start();
    } catch {
      setError('Unable to load scans. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [scanId, user?.id]);

  const verificationColor = (status?: string) => {
    switch ((status || 'pending').toLowerCase()) {
      case 'verified':
      case 'resolved':
        return '#22C55E';
      case 'rejected':
        return '#EF4444';
      default:
        return '#F59E0B';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: tc.screen }]}>
      <View style={[styles.header, { backgroundColor: tc.headerBg, borderBottomColor: tc.border }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: tc.screenSecondary }]} onPress={() => router.back()}>
          <ArrowLeft color={tc.text} size={22} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: tc.text }]}>Cure Guidance Detail</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={tc.primary} size="large" /></View>
      ) : error || !detail ? (
        <View style={styles.center}>
          <TriangleAlert color="#EF4444" size={28} />
          <Text style={[styles.msg, { color: tc.text }]}>{error || 'No previous scans available.'}</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: tc.primary }]} onPress={load}>
            <Text style={styles.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Animated.View style={{ flex: 1, transform: [{ translateX: x }] }}>
            <ScrollView contentContainerStyle={styles.content}>
              <View style={[styles.card, { backgroundColor: tc.card, borderColor: tc.border }]}>
                {detail.imageUrl ? <Image source={{ uri: detail.imageUrl }} style={styles.hero} /> : null}
                <Text style={[styles.crop, { color: tc.text }]}>{detail.cropType.toUpperCase()}</Text>
                <Text style={[styles.disease, { color: tc.textSecondary }]}>{detail.diseaseName}</Text>
                <View style={[styles.badge, { backgroundColor: detail.severity === 'high' ? '#EF4444' : detail.severity === 'medium' ? '#F59E0B' : '#22C55E' }]}>
                  <Text style={styles.badgeTxt}>{String(detail.severity).toUpperCase()}</Text>
                </View>
                <View style={[styles.verifyBox, { borderColor: verificationColor(detail.verificationStatus), backgroundColor: verificationColor(detail.verificationStatus) + '12' }]}>
                  <ShieldCheck color={verificationColor(detail.verificationStatus)} size={16} />
                  <Text style={[styles.verifyText, { color: verificationColor(detail.verificationStatus) }]}>
                    {detail.verificationMessage || 'Pending admin verification'}
                  </Text>
                </View>
              </View>

              <View style={[styles.card, { backgroundColor: tc.card, borderColor: tc.border }]}>
                <Text style={[styles.secTitle, { color: tc.text }]}>Cure Instructions</Text>
                {detail.steps.map((s, i) => <Text key={i} style={[styles.li, { color: tc.textSecondary }]}>{`${i + 1}. ${s}`}</Text>)}
                <Text style={[styles.subHead, { color: tc.text }]}>Recommended solution</Text>
                <Text style={[styles.li, { color: tc.textSecondary }]}>{detail.treatment}</Text>
                <Text style={[styles.subHead, { color: tc.text }]}>Preventive measures</Text>
                {detail.prevention.map((p, i) => <Text key={`p${i}`} style={[styles.li, { color: tc.textSecondary }]}>{`${i + 1}. ${p}`}</Text>)}
                <Text style={[styles.subHead, { color: tc.text }]}>Safety tips</Text>
                {detail.safetyTips.map((p, i) => <Text key={`s${i}`} style={[styles.li, { color: tc.textSecondary }]}>{`${i + 1}. ${p}`}</Text>)}
              </View>
            </ScrollView>
          </Animated.View>

          <TouchableOpacity
            style={[styles.fixedBtn, { backgroundColor: '#22C55E' }]}
            onPress={() =>
              router.push(
                `/(farmer)/schedule?fromCureGuidance=1&cropType=${encodeURIComponent(detail.cropType)}&diseaseName=${encodeURIComponent(detail.diseaseName)}` as any
              )
            }
          >
            <ShieldCheck color="white" size={18} />
            <Text style={styles.fixedBtnTxt}>Create Personalized Farming Schedule</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700' },
  content: { padding: 16, gap: 12, paddingBottom: 100 },
  card: { borderWidth: 1, borderRadius: 14, padding: 12 },
  hero: { width: '100%', height: 170, borderRadius: 10, marginBottom: 10 },
  crop: { fontSize: 15, fontWeight: '700' },
  disease: { fontSize: 14, marginTop: 4 },
  badge: { marginTop: 8, alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  badgeTxt: { color: 'white', fontSize: 11, fontWeight: '700' },
  verifyBox: { marginTop: 10, borderWidth: 1, borderRadius: 10, padding: 10, flexDirection: 'row', gap: 8, alignItems: 'center' },
  verifyText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  secTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  subHead: { fontSize: 14, fontWeight: '700', marginTop: 8, marginBottom: 4 },
  li: { fontSize: 13, lineHeight: 19, marginBottom: 2 },
  fixedBtn: { position: 'absolute', left: 16, right: 16, bottom: 14, borderRadius: 12, paddingVertical: 14, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 },
  fixedBtnTxt: { color: 'white', fontWeight: '800', fontSize: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingHorizontal: 24 },
  msg: { textAlign: 'center' },
  retryBtn: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  retryTxt: { color: 'white', fontWeight: '700' },
});
