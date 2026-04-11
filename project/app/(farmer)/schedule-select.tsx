/**
 * Schedule Select Screen - placeholder for crop selection flow.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Calendar } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

export default function ScheduleSelectScreen() {
  const router = useRouter();
  const { colors: tc } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: tc.screen }]}>
      <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        <Calendar color="white" size={28} />
        <Text style={styles.title}>Select Schedule</Text>
      </LinearGradient>
      <View style={styles.content}>
        <Text style={[styles.text, { color: tc.textMuted }]}>
          Choose a crop to view its schedule.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    alignSelf: 'flex-start',
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
  },
});
