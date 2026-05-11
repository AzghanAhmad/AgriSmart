import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import {
  House as Home,
  ScanLine,
  CalendarCheck,
  MapPin,
  MessageSquare,
  CircleUser,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useApp } from '@/contexts/AppContext';
import { translate } from '@/utils/translations';

export default function FarmerTabLayout() {
  const { colors: tc, isDark } = useTheme();
  const { language } = useApp();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#22C55E',
        tabBarInactiveTintColor: tc.textMuted,
        tabBarStyle: {
          backgroundColor: tc.tabBarBg,
          borderTopWidth: 1,
          borderTopColor: tc.tabBarBorder,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
            },
            android: {
              elevation: 8,
            },
          }),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: translate('tabHome', language),
          tabBarIcon: ({ size, color, focused }) => (
            <View style={focused ? styles.activeIconBg : undefined}>
              <Home size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="disease-detection"
        options={{
          title: translate('tabScanCrop', language),
          tabBarIcon: ({ size, color, focused }) => (
            <View style={focused ? styles.activeIconBg : undefined}>
              <ScanLine size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: translate('tabSchedule', language),
          tabBarIcon: ({ size, color, focused }) => (
            <View style={focused ? styles.activeIconBg : undefined}>
              <CalendarCheck size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="heatmap"
        options={{
          title: translate('tabDiseaseMap', language),
          tabBarIcon: ({ size, color, focused }) => (
            <View style={focused ? styles.activeIconBg : undefined}>
              <MapPin size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="chatbot"
        options={{
          title: translate('tabAssistant', language),
          tabBarIcon: ({ size, color, focused }) => (
            <View style={focused ? styles.activeIconBg : undefined}>
              <MessageSquare size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: translate('tabProfile', language),
          tabBarIcon: ({ size, color, focused }) => (
            <View style={focused ? styles.activeIconBg : undefined}>
              <CircleUser size={22} color={color} />
            </View>
          ),
        }}
      />
      {/* Hidden pages — accessible via navigation but not visible in tab bar */}
      <Tabs.Screen name="weather" options={{ href: null }} />
      <Tabs.Screen name="schedule-select" options={{ href: null }} />
      <Tabs.Screen name="timelapse-upload" options={{ href: null }} />
      <Tabs.Screen name="timelapse-view" options={{ href: null }} />
      <Tabs.Screen name="privacy-settings" options={{ href: null }} />
      <Tabs.Screen name="help-support" options={{ href: null }} />
      <Tabs.Screen name="subsidies" options={{ href: null }} />
      <Tabs.Screen name="cure-guidance-history" options={{ href: null }} />
      <Tabs.Screen name="cure-guidance-detail" options={{ href: null }} />
      <Tabs.Screen name="personalized-schedule" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeIconBg: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderRadius: 10,
    padding: 6,
    marginBottom: -4,
  },
});
