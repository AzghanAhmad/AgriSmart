/**
 * App-wide light/dark palette (green brand stays in both modes).
 */
export type AppThemeColors = {
  screen: string;
  screenSecondary: string;
  card: string;
  cardElevated: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  headerBg: string;
  tabBarBg: string;
  tabBarBorder: string;
  inputBg: string;
  overlay: string;
  chartBg: string;
  chartLabel: string;
  chartGrid: string;
  primary: string;
  primaryDark: string;
};

export const lightTheme: AppThemeColors = {
  screen: '#F9FAFB',
  screenSecondary: '#F3F4F6',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  text: '#111827',
  textSecondary: '#374151',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  headerBg: '#FFFFFF',
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#E5E7EB',
  inputBg: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.5)',
  chartBg: '#FFFFFF',
  chartLabel: '#111827',
  chartGrid: '#E5E7EB',
  primary: '#22C55E',
  primaryDark: '#16A34A',
};

export const darkTheme: AppThemeColors = {
  screen: '#0F172A',
  screenSecondary: '#111827',
  card: '#1E293B',
  cardElevated: '#334155',
  text: '#F9FAFB',
  textSecondary: '#E5E7EB',
  textMuted: '#CBD5E1',
  border: '#334155',
  headerBg: '#1E293B',
  tabBarBg: '#1E293B',
  tabBarBorder: '#334155',
  inputBg: '#334155',
  overlay: 'rgba(0,0,0,0.7)',
  chartBg: '#1E293B',
  chartLabel: '#F9FAFB',
  chartGrid: '#475569',
  primary: '#22C55E',
  primaryDark: '#16A34A',
};
