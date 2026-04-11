import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { ArrowLeft, TriangleAlert } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { getApiBaseUrl } from '@/utils/env';

type Task = { id: string; title: string; description: string; dueDate: string; priority: 'high' | 'medium' | 'low' };

export default function PersonalizedScheduleScreen() {
  const { cropType, diseaseName } = useLocalSearchParams<{ cropType: string; diseaseName: string }>();
  const router = useRouter();
  const { colors: tc } = useTheme();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError('');
    try {
      const API_BASE_URL = getApiBaseUrl();
      const res = await fetch(`${API_BASE_URL}/api/farmer/schedule/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmerId: user.id,
          cropType: cropType || 'wheat',
          location: user.location || 'Islamabad',
          latitude: user.latitude,
          longitude: user.longitude,
          weekNumber: 'week1',
          diseaseName: diseaseName || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to generate schedule.');
      const data = await res.json();
      setTasks((data.tasks || []) as Task[]);
    } catch {
      setError('Failed to generate schedule.');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [user?.id, cropType, diseaseName]);

  const grouped = useMemo(() => {
    const byDay: Record<string, Task[]> = {};
    tasks.forEach((t) => {
      const k = (t.dueDate || '').split('T')[0] || 'Unknown';
      if (!byDay[k]) byDay[k] = [];
      byDay[k].push(t);
    });
    return Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0]));
  }, [tasks]);

  return (
    <View style={[styles.container, { backgroundColor: tc.screen }]}>
      <View style={[styles.header, { backgroundColor: tc.headerBg, borderBottomColor: tc.border }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: tc.screenSecondary }]} onPress={() => router.back()}>
          <ArrowLeft color={tc.text} size={22} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: tc.text }]}>Personalized Farming Schedule</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
        <Text style={[styles.cropText, { color: tc.textSecondary }]}>Crop: {(cropType || 'wheat').toUpperCase()}</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={tc.primary} size="large" /></View>
      ) : error ? (
        <View style={styles.center}>
          <TriangleAlert color="#EF4444" size={28} />
          <Text style={[styles.msg, { color: tc.text }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: tc.primary }]} onPress={load}>
            <Text style={styles.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {grouped.map(([day, dayTasks]) => (
            <View key={day} style={[styles.dayCard, { backgroundColor: tc.card, borderColor: tc.border }]}>
              <Text style={[styles.dayTitle, { color: tc.text }]}>{new Date(day).toDateString()}</Text>
              {dayTasks.map((t) => (
                <View key={t.id} style={[styles.taskRow, { borderBottomColor: tc.border }]}>
                  <Text style={[styles.taskTitle, { color: tc.text }]}>{t.title}</Text>
                  <Text style={[styles.taskDesc, { color: tc.textSecondary }]}>{t.description}</Text>
                </View>
              ))}
            </View>
          ))}
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
  cropText: { fontSize: 13, fontWeight: '600' },
  content: { padding: 16, gap: 10, paddingBottom: 24 },
  dayCard: { borderWidth: 1, borderRadius: 12, padding: 12 },
  dayTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  taskRow: { borderBottomWidth: 1, paddingVertical: 8 },
  taskTitle: { fontSize: 13, fontWeight: '700' },
  taskDesc: { fontSize: 12, marginTop: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingHorizontal: 24 },
  msg: { textAlign: 'center' },
  retryBtn: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  retryTxt: { color: 'white', fontWeight: '700' },
});
