import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppThemeColors, darkTheme, lightTheme } from '@/utils/appTheme';

const STORAGE_KEY = 'agriSmart_dark_mode';

type ThemeContextValue = {
  isDark: boolean;
  colors: AppThemeColors;
  setDarkMode: (value: boolean) => Promise<void>;
  toggleDarkMode: () => Promise<void>;
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const v = await AsyncStorage.getItem(STORAGE_KEY);
        if (mounted) {
          setIsDark(v === '1');
        }
      } catch {
        /* ignore */
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setDarkMode = useCallback(async (value: boolean) => {
    setIsDark(value);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, value ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, []);

  const toggleDarkMode = useCallback(async () => {
    await setDarkMode(!isDark);
  }, [isDark, setDarkMode]);

  const colors = useMemo(() => (isDark ? darkTheme : lightTheme), [isDark]);

  const value = useMemo(
    () => ({ isDark, colors, setDarkMode, toggleDarkMode, ready }),
    [isDark, colors, setDarkMode, toggleDarkMode, ready]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
