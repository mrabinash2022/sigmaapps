import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from './AuthContext';
import {
  ACCENT_OPTIONS,
  DEFAULT_ACCENT,
  buildThemeColors,
  isValidAccent,
} from '../theme/colors';

const LEGACY_THEME_STORAGE_KEY = 'colorScheme';
const LEGACY_ACCENT_STORAGE_KEY = 'accentColor';

const ThemeContext = createContext(null);

function getDarkModeStorageKey(userId) {
  return `colorScheme:user:${userId}`;
}

function getAccentStorageKey(userId) {
  return `accentColor:user:${userId}`;
}

async function readStoredDarkMode(userId) {
  const userKey = getDarkModeStorageKey(userId);
  let stored = await SecureStore.getItemAsync(userKey);

  if (stored == null) {
    const legacy = await SecureStore.getItemAsync(LEGACY_THEME_STORAGE_KEY);
    if (legacy != null) {
      stored = legacy;
      await SecureStore.setItemAsync(userKey, legacy);
      await SecureStore.deleteItemAsync(LEGACY_THEME_STORAGE_KEY);
    }
  }

  return stored === 'dark';
}

async function readStoredAccent(userId) {
  const userKey = getAccentStorageKey(userId);
  let stored = await SecureStore.getItemAsync(userKey);

  if (stored == null) {
    const legacy = await SecureStore.getItemAsync(LEGACY_ACCENT_STORAGE_KEY);
    if (legacy != null && isValidAccent(legacy)) {
      stored = legacy;
      await SecureStore.setItemAsync(userKey, legacy);
      await SecureStore.deleteItemAsync(LEGACY_ACCENT_STORAGE_KEY);
    }
  }

  return isValidAccent(stored) ? stored : DEFAULT_ACCENT;
}

export function ThemeProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const [isDark, setIsDark] = useState(false);
  const [accentColor, setAccentColorState] = useState(DEFAULT_ACCENT);

  useEffect(() => {
    if (authLoading) return undefined;

    let cancelled = false;

    (async () => {
      if (!userId) {
        if (!cancelled) {
          setIsDark(false);
          setAccentColorState(DEFAULT_ACCENT);
        }
        return;
      }

      try {
        const [dark, accent] = await Promise.all([
          readStoredDarkMode(userId),
          readStoredAccent(userId),
        ]);
        if (!cancelled) {
          setIsDark(dark);
          setAccentColorState(accent);
        }
      } catch {
        if (!cancelled) {
          setIsDark(false);
          setAccentColorState(DEFAULT_ACCENT);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, authLoading]);

  const setDarkMode = useCallback(async (value) => {
    setIsDark(value);
    if (!userId) return;

    try {
      await SecureStore.setItemAsync(getDarkModeStorageKey(userId), value ? 'dark' : 'light');
    } catch {
      // Preference stays in memory for this session.
    }
  }, [userId]);

  const setAccentColor = useCallback(async (value) => {
    const next = isValidAccent(value) ? value : DEFAULT_ACCENT;
    setAccentColorState(next);
    if (!userId) return;

    try {
      await SecureStore.setItemAsync(getAccentStorageKey(userId), next);
    } catch {
      // Preference stays in memory for this session.
    }
  }, [userId]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode(!isDark);
  }, [isDark, setDarkMode]);

  const colors = useMemo(
    () => buildThemeColors(isDark, accentColor),
    [isDark, accentColor],
  );

  const value = useMemo(
    () => ({
      isDark,
      accentColor,
      accentOptions: ACCENT_OPTIONS,
      colors,
      setDarkMode,
      setAccentColor,
      toggleDarkMode,
    }),
    [isDark, accentColor, colors, setDarkMode, setAccentColor, toggleDarkMode],
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
