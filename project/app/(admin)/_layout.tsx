import { Tabs } from 'expo-router';
import { ChartBar as BarChart3, Users, MapPin, Settings, Briefcase } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useApp } from '@/contexts/AppContext';
import { translate } from '@/utils/translations';

export default function AdminTabLayout() {
  const { colors: tc } = useTheme();
  const { language } = useApp();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tc.primary,
        tabBarInactiveTintColor: tc.textMuted,
        tabBarStyle: {
          backgroundColor: tc.tabBarBg,
          borderTopWidth: 1,
          borderTopColor: tc.tabBarBorder,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: translate('tabAdminDashboard', language),
          tabBarIcon: ({ size, color }) => <BarChart3 size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="farmers"
        options={{
          title: translate('tabAdminFarmers', language),
          tabBarIcon: ({ size, color }) => <Users size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: translate('tabAdminReports', language),
          tabBarIcon: ({ size, color }) => <MapPin size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="subsidies"
        options={{
          title: translate('tabAdminSubsidies', language),
          tabBarIcon: ({ size, color }) => <Briefcase size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: translate('tabAdminSettings', language),
          tabBarIcon: ({ size, color }) => <Settings size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="heatmap"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="data"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
