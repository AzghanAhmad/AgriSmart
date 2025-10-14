import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

interface LoadingSpinnerProps {
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ text = 'Loading...' }) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#22C55E" />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 20,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});