import { Tabs } from 'expo-router';
import { ChartBar as BarChart3, Users, MapPin, Settings, Briefcase, Database } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

export default function AdminTabLayout() {
  const { colors: tc } = useTheme();

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
          title: 'Dashboard',
          tabBarIcon: ({ size, color }) => <BarChart3 size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="farmers"
        options={{
          title: 'Farmers',
          tabBarIcon: ({ size, color }) => <Users size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ size, color }) => <MapPin size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="subsidies"
        options={{
          title: 'Subsidies',
          tabBarIcon: ({ size, color }) => <Briefcase size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="data"
        options={{
          title: 'Data',
          tabBarIcon: ({ size, color }) => <Database size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ size, color }) => <Settings size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="heatmap"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
