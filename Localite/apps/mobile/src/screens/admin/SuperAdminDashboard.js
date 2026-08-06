import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import SuperAdminScreen from './SuperAdminScreen';
import SuperAdminUsersScreen from './SuperAdminUsersScreen';
import ScreenLayout from '../../components/ScreenLayout';

const MAIN_TABS = [
  { key: 'shops', label: 'Shops' },
  { key: 'users', label: 'Users' },
];

export default function SuperAdminDashboard() {
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
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8faf9' },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 3, borderBottomColor: '#1a7f4b' },
  tabText: { color: '#666', fontWeight: '600', fontSize: 15 },
  tabTextActive: { color: '#1a7f4b', fontWeight: '700' },
  content: { flex: 1 },
});
