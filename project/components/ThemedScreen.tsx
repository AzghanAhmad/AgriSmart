import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Wraps screen root with theme background (light/dark). */
export function ThemedScreen({ children, style }: Props) {
  const { colors: tc } = useTheme();
  return <View style={[{ flex: 1, backgroundColor: tc.screen }, style]}>{children}</View>;
}
