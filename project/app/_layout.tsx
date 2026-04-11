import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AppProvider } from '@/contexts/AppContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/components/Toast';
import { testBackendConnection } from '@/utils/env';

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Test backend connection on mount
  useEffect(() => {
    testBackendConnection().catch(console.error);
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'auth';
    const inFarmerGroup = segments[0] === '(farmer)';
    const inAdminGroup = segments[0] === '(admin)';

    if (!user && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/auth/login');
    } else if (user && inAuthGroup) {
      // Redirect based on user role after authentication
      if (user.role === 'farmer') {
        router.replace('/(farmer)');
      } else if (user.role === 'admin') {
        router.replace('/(admin)');
      }
    } else if (user && !inAuthGroup) {
      // Ensure user is in correct role-based route
      if (user.role === 'farmer' && !inFarmerGroup) {
        router.replace('/(farmer)');
      } else if (user.role === 'admin' && !inAdminGroup) {
        router.replace('/(admin)');
      }
    }
  }, [user, segments, isLoading]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth" />
      <Stack.Screen name="(farmer)" />
      <Stack.Screen name="(admin)" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <AuthProvider>
      <AppProvider>
        <ThemeProvider>
          <ToastProvider>
            <RootLayoutNav />
            <ThemedStatusBar />
          </ToastProvider>
        </ThemeProvider>
      </AppProvider>
    </AuthProvider>
  );
}