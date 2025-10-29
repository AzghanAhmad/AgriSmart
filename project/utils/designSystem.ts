// 🎨 AgriSmart Design System
// Consistent colors, typography, spacing, and shadows

export const colors = {
  // Primary
  primary: '#22C55E',
  primaryDark: '#16A34A',
  primaryLight: '#4ADE80',
  primaryLighter: '#BBF7D0',
  primaryBg: '#F0FDF4',

  // Crop Colors
  wheat: '#F59E0B',
  rice: '#10B981',
  cotton: '#8B5CF6',

  // Text
  text: {
    primary: '#111827',
    secondary: '#6B7280',
    tertiary: '#9CA3AF',
    inverse: '#FFFFFF',
  },

  // Backgrounds
  bg: {
    primary: '#FFFFFF',
    secondary: '#F9FAFB',
    tertiary: '#F3F4F6',
  },

  // Borders
  border: {
    light: '#E5E7EB',
    medium: '#D1D5DB',
    dark: '#9CA3AF',
  },

  // Status
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Severity
  severity: {
    low: '#22C55E',
    medium: '#F59E0B',
    high: '#EF4444',
  },
};

export const typography = {
  // Font Sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 36,
  },

  // Font Weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },

  // Line Heights
  lineHeight: {
    tight: 20,
    normal: 24,
    relaxed: 28,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  '2xl': {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Common Card Style
export const cardStyle = {
  backgroundColor: colors.bg.primary,
  borderRadius: borderRadius.lg,
  padding: spacing.base,
  ...shadows.md,
};

// Common Button Style
export const buttonStyle = {
  primary: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    ...shadows.lg,
  },
  secondary: {
    backgroundColor: colors.bg.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
};

// Common Header Style
export const headerStyle = {
  paddingTop: 60,
  paddingHorizontal: spacing.base,
  paddingBottom: spacing.lg,
  backgroundColor: colors.bg.primary,
  ...shadows.sm,
};

// Common Page Container
export const pageContainer = {
  flex: 1,
  backgroundColor: colors.bg.secondary,
};

// Common Content Padding
export const contentPadding = {
  padding: spacing.base,
  paddingBottom: spacing['2xl'],
};

