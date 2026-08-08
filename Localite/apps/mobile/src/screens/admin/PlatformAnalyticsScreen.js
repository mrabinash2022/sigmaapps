import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';
import ScreenLayout from '../../components/ScreenLayout';

export default function PlatformAnalyticsScreen() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback((force = false) => {
    api.getPlatformAnalytics({ days: 30, force })
      .then(setData)
      .catch(console.error)
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  if (loading && !data) {
    return (
      <ScreenLayout>
        <View style={styles.center}><ActivityIndicator size="large" color="#1a7f4b" /></View>
      </ScreenLayout>
    );
  }

  const summary = data?.summary || {};

  return (
    <ScreenLayout>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
      >
        <Text style={styles.heading}>Platform analytics (30 days)</Text>
        <View style={styles.card}>
          <Text style={styles.metric}>Orders: {summary.orderCount || 0}</Text>
          <Text style={styles.metric}>Revenue: ₹{Number(summary.grossRevenue || 0).toFixed(0)}</Text>
          <Text style={styles.metric}>Discounts: ₹{Number(summary.totalDiscounts || 0).toFixed(0)}</Text>
          <Text style={styles.metric}>Refunds: {summary.refundCount || 0}</Text>
        </View>
        <Text style={styles.section}>Top shops</Text>
        {(data?.topShops || []).map((row) => (
          <View key={row.shopId} style={styles.row}>
            <Text style={styles.shopName}>{row.shopName}</Text>
            <Text style={styles.meta}>{row.orderCount} orders • ₹{Number(row.revenue).toFixed(0)}</Text>
          </View>
        ))}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#eee', marginBottom: 16 },
  metric: { fontSize: 16, marginBottom: 8, fontWeight: '600' },
  section: { fontWeight: '700', marginBottom: 8 },
  row: { paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  shopName: { fontWeight: '600' },
  meta: { color: '#666', marginTop: 2 },
});
