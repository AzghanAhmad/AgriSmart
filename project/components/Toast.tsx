/**
 * Global Toast Notification System
 * Supports success, error, warning, and info toasts with smooth animations.
 */
import React, { useEffect, useRef, useState, useCallback, createContext, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  CircleCheck as CheckCircle,
  CircleAlert as AlertCircle,
  TriangleAlert as AlertTriangle,
  Info,
  X,
  RefreshCw,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastConfig {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
  onRetry?: () => void;
}

interface ToastContextValue {
  showToast: (config: Omit<ToastConfig, 'id'>) => void;
  showError: (message: string, onRetry?: () => void) => void;
  showSuccess: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
  showNetworkError: (onRetry?: () => void) => void;
  showInputError: (message?: string) => void;
  showServerError: (onRetry?: () => void) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const TOAST_COLORS: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
  success: { bg: '#F0FDF4', border: '#22C55E', icon: '#22C55E', text: '#166534' },
  error: { bg: '#FEF2F2', border: '#EF4444', icon: '#EF4444', text: '#991B1B' },
  warning: { bg: '#FFFBEB', border: '#F59E0B', icon: '#F59E0B', text: '#92400E' },
  info: { bg: '#EFF6FF', border: '#3B82F6', icon: '#3B82F6', text: '#1E40AF' },
};

const TOAST_ICONS: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

function ToastItem({ toast, onDismiss }: { toast: ToastConfig; onDismiss: (id: string) => void }) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const colors = TOAST_COLORS[toast.type];
  const IconComponent = TOAST_ICONS[toast.type];

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    const duration = toast.duration || 4000;
    const timer = setTimeout(() => {
      dismissToast();
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const dismissToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss(toast.id));
  };

  return (
    <Animated.View
      style={[
        toastStyles.toast,
        {
          backgroundColor: colors.bg,
          borderLeftColor: colors.border,
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
    >
      <View style={toastStyles.iconContainer}>
        <IconComponent color={colors.icon} size={22} />
      </View>
      <View style={toastStyles.textContainer}>
        <Text style={[toastStyles.title, { color: colors.text }]}>{toast.title}</Text>
        <Text style={[toastStyles.message, { color: colors.text }]} numberOfLines={2}>
          {toast.message}
        </Text>
      </View>
      <View style={toastStyles.actions}>
        {toast.onRetry && (
          <TouchableOpacity
            style={[toastStyles.retryBtn, { backgroundColor: colors.border }]}
            onPress={() => {
              toast.onRetry?.();
              dismissToast();
            }}
            activeOpacity={0.7}
          >
            <RefreshCw color="white" size={14} />
            <Text style={toastStyles.retryText}>Retry</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={dismissToast} style={toastStyles.closeBtn} activeOpacity={0.6}>
          <X color={colors.icon} size={18} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastConfig[]>([]);

  const showToast = useCallback((config: Omit<ToastConfig, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    setToasts((prev) => [...prev.slice(-2), { ...config, id }]); // max 3 toasts
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showError = useCallback(
    (message: string, onRetry?: () => void) =>
      showToast({ type: 'error', title: 'Error', message, onRetry }),
    [showToast]
  );

  const showSuccess = useCallback(
    (message: string) => showToast({ type: 'success', title: 'Success', message }),
    [showToast]
  );

  const showWarning = useCallback(
    (message: string) => showToast({ type: 'warning', title: 'Warning', message }),
    [showToast]
  );

  const showInfo = useCallback(
    (message: string) => showToast({ type: 'info', title: 'Info', message }),
    [showToast]
  );

  const showNetworkError = useCallback(
    (onRetry?: () => void) =>
      showToast({
        type: 'error',
        title: 'Network Error',
        message: 'Network error, please try again.',
        onRetry,
      }),
    [showToast]
  );

  const showInputError = useCallback(
    (message?: string) =>
      showToast({
        type: 'warning',
        title: 'Invalid Input',
        message: message || 'Please fill all required fields.',
      }),
    [showToast]
  );

  const showServerError = useCallback(
    (onRetry?: () => void) =>
      showToast({
        type: 'error',
        title: 'Server Error',
        message: 'Something went wrong. Please try again.',
        onRetry,
      }),
    [showToast]
  );

  const value: ToastContextValue = {
    showToast,
    showError,
    showSuccess,
    showWarning,
    showInfo,
    showNetworkError,
    showInputError,
    showServerError,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View style={toastStyles.container} pointerEvents="box-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

const toastStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    width: width - 32,
    marginBottom: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.85,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
  },
});
