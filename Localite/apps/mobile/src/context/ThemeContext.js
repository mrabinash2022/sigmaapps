import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from './AuthContext';
import { UserRole } from '@localite/shared';
import {
  ACCENT_OPTIONS,
  DEFAULT_ACCENT,
  buildThemeColors,
  isValidAccent,
} from '../theme/colors';

const LEGACY_THEME_STORAGE_KEY = 'colorScheme';
const LEGACY_ACCENT_STORAGE_KEY = 'accentColor';

const ROLE_DEFAULT_DARK = {
  [UserRole.CUSTOMER]: false,
  [UserRole.ADMIN]: false,
  [UserRole.SUPER_ADMIN]: true,
};

const ThemeContext = createContext(null);

function getDarkModeStorageKey(userId, role) {
  return `colorScheme:user:${userId}:role:${role || 'customer'}`;
}

function getAccentStorageKey(userId, role) {
  return `accentColor:user:${userId}:role:${role || 'customer'}`;
}

async function readStoredDarkMode(userId, role) {
  const userKey = getDarkModeStorageKey(userId, role);
  let stored = await SecureStore.getItemAsync(userKey);

  if (stored == null) {
    const legacyUserKey = `colorScheme:user:${userId}`;
    const legacy = await SecureStore.getItemAsync(legacyUserKey)
      ?? await SecureStore.getItemAsync(LEGACY_THEME_STORAGE_KEY);
    if (legacy != null) {
      stored = legacy;
      await SecureStore.setItemAsync(userKey, legacy);
    }
  }

  if (stored == null) return ROLE_DEFAULT_DARK[role] ?? false;
  return stored === 'dark';
}

async function readStoredAccent(userId, role) {
  const userKey = getAccentStorageKey(userId, role);
  let stored = await SecureStore.getItemAsync(userKey);

  if (stored == null) {
    const legacyUserKey = `accentColor:user:${userId}`;
    const legacy = await SecureStore.getItemAsync(legacyUserKey)
      ?? await SecureStore.getItemAsync(LEGACY_ACCENT_STORAGE_KEY);
    if (legacy != null && isValidAccent(legacy)) {
      stored = legacy;
      await SecureStore.setItemAsync(userKey, legacy);
    }
  }

  return isValidAccent(stored) ? stored : DEFAULT_ACCENT;
}

export function ThemeProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const userRole = user?.role ?? null;
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
          readStoredDarkMode(userId, userRole),
          readStoredAccent(userId, userRole),
        ]);
        if (!cancelled) {
          setIsDark(dark);
          setAccentColorState(accent);
        }
      } catch {
        if (!cancelled) {
          setIsDark(ROLE_DEFAULT_DARK[userRole] ?? false);
          setAccentColorState(DEFAULT_ACCENT);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, userRole, authLoading]);

  const setDarkMode = useCallback(async (value) => {
    setIsDark(value);
    if (!userId) return;

    try {
      await SecureStore.setItemAsync(
        getDarkModeStorageKey(userId, userRole),
        value ? 'dark' : 'light',
      );
    } catch {
      // Preference stays in memory for this session.
    }
  }, [userId, userRole]);

  const setAccentColor = useCallback(async (value) => {
    const next = isValidAccent(value) ? value : DEFAULT_ACCENT;
    setAccentColorState(next);
    if (!userId) return;

    try {
      await SecureStore.setItemAsync(getAccentStorageKey(userId, userRole), next);
    } catch {
      // Preference stays in memory for this session.
    }
  }, [userId, userRole]);

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
      roleDefaultDark: ROLE_DEFAULT_DARK[userRole] ?? false,
      setDarkMode,
      setAccentColor,
      toggleDarkMode,
    }),
    [isDark, accentColor, colors, userRole, setDarkMode, setAccentColor, toggleDarkMode],
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
