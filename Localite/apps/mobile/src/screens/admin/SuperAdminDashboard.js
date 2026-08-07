import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import SuperAdminScreen from './SuperAdminScreen';
import SuperAdminUsersScreen from './SuperAdminUsersScreen';
import ScreenLayout from '../../components/ScreenLayout';
import { useTheme } from '../../context/ThemeContext';
import { createAdminStyles } from '../../theme/adminScreenStyles';

const MAIN_TABS = [
  { key: 'shops', label: 'Shops' },
  { key: 'users', label: 'Users' },
];

export default function SuperAdminDashboard() {
  const { colors } = useTheme();
  const styles = useMemo(() => createAdminStyles(colors), [colors]);
  const [tab, setTab] = useState('shops');

  return (
    <ScreenLayout>
      <View style={styles.container}>
        <View style={styles.tabs}>
          {MAIN_TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, tab === t.key && styles.tabActive]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.mainTabText, tab === t.key && styles.mainTabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.content}>
          {tab === 'shops' ? <SuperAdminScreen /> : <SuperAdminUsersScreen />}
        </View>
      </View>
    </ScreenLayout>
  );
}
