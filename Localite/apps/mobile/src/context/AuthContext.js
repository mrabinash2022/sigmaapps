import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { api, loadTokens, saveTokens, clearTokens } from '../services/api';
import { UserRole } from '@localite/shared';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const AuthContext = createContext(null);

function getExpoProjectId() {
  return (
    Constants.expoConfig?.extra?.eas?.projectId
    ?? Constants.easConfig?.projectId
    ?? Constants.expoConfig?.extra?.projectId
  );
}

async function registerForPushNotifications() {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    const projectId = getExpoProjectId();
    if (!projectId) {
      console.warn('Push notifications skipped: no Expo projectId in app config');
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    return token;
  } catch (err) {
    console.warn('Push notification registration failed:', err?.message || err);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [storedRefreshToken, setStoredRefreshToken] = useState(null);

  useEffect(() => {
    (async () => {
      const { accessToken, refreshToken: rt } = await loadTokens();
      setStoredRefreshToken(rt);
      if (accessToken) {
        try {
          const { user: me } = await api.getMe();
          setUser(me);
          const pushToken = await registerForPushNotifications();
          if (pushToken) {
            await api.registerDevice(pushToken, Platform.OS).catch(() => {});
          }
        } catch {
          await clearTokens();
        }
      }
      setLoading(false);
    })();
  }, []);

  const handleAuthSuccess = async (data) => {
    await saveTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    setStoredRefreshToken(data.refreshToken);
    const { user: me } = await api.getMe();
    setUser(me);
    const pushToken = await registerForPushNotifications();
    if (pushToken) {
      await api.registerDevice(pushToken, Platform.OS).catch(() => {});
    }
    return data;
  };

  const loginPassword = (identifier, password) =>
    api.loginPassword(identifier, password).then(handleAuthSuccess);

  const loginOtp = (phone, otp) =>
    api.verifyOtp(phone, otp).then(handleAuthSuccess);

  const registerSendEmailCode = (body) => api.registerSendEmailCode(body);

  const registerVerifyEmailCode = (body) => api.registerVerifyEmailCode(body);

  const registerPassword = (body) =>
    api.registerPassword(body).then(handleAuthSuccess);

  const logout = async () => {
    try {
      const { refreshToken: rt } = await loadTokens();
      if (rt) await api.logout(rt).catch(() => {});
    } finally {
      await clearTokens();
      setUser(null);
      setStoredRefreshToken(null);
    }
  };

  const refreshUser = async () => {
    const { user: me } = await api.getMe();
    setUser(me);
    return me;
  };

  const role = user?.role;
  const needsOnboarding = user && !user.isOnboarded;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        needsOnboarding,
        loginPassword,
        loginOtp,
        registerSendEmailCode,
        registerVerifyEmailCode,
        registerPassword,
        logout,
        refreshUser,
        isSuperAdmin: role === UserRole.SUPER_ADMIN,
        isAdmin: role === UserRole.ADMIN,
        isCustomer: role === UserRole.CUSTOMER,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
