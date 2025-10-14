import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { TriangleAlert as AlertTriangle, X } from 'lucide-react-native';

interface ErrorAlertProps {
  visible: boolean;
  message: string;
  onClose: () => void;
  onRetry?: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  visible,
  message,
  onClose,
  onRetry
}) => {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.alertContainer}>
          <View style={styles.header}>
            <AlertTriangle color="#EF4444" size={24} />
            <Text style={styles.title}>Error</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X color="#6B7280" size={20} />
            </TouchableOpacity>
          </View>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Close</Text>
            </TouchableOpacity>
            {onRetry && (
              <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  closeButton: {
    padding: 4,
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#22C55E',
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});