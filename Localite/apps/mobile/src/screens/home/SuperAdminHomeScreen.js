import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import ScreenLayout from '../../components/ScreenLayout';

function ShopRankCard({ rank, shop, orderCount, totalRevenue, styles }) {
  return (
    <View style={styles.rankCard}>
      <Text style={styles.rank}>#{rank}</Text>
      <View style={styles.rankInfo}>
        <Text style={styles.shopName}>{shop?.name}</Text>
        <Text style={styles.shopMeta}>{shop?.category} · {shop?.shopCode}</Text>
        <Text style={styles.stats}>{orderCount} orders · ₹{Number(totalRevenue).toFixed(0)} revenue</Text>
      </View>
    </View>
  );
}

export default function SuperAdminHomeScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (force = false) => {
    try {
      const payload = await api.getSuperAdminHome({ force });
      setData(payload);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    load();
  }, [load]));

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <ScreenLayout>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={colors.brand} />
        }
      >
        <Text style={styles.heading}>Localite overview</Text>
        <Text style={styles.sub}>Top performing stores by delivered orders.</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>By revenue</Text>
          {(data?.topShopsByRevenue || []).map((row, index) => (
            <ShopRankCard
              key={row.shopId}
              rank={index + 1}
              shop={row.shop}
              orderCount={row.orderCount}
              totalRevenue={row.totalRevenue}
              styles={styles}
            />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>By order volume</Text>
          {(data?.topShopsByVolume || []).map((row, index) => (
            <ShopRankCard
              key={`vol-${row.shopId}`}
              rank={index + 1}
              shop={row.shop}
              orderCount={row.orderCount}
              totalRevenue={row.totalRevenue}
              styles={styles}
            />
          ))}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    scroll: { flex: 1 },
    content: { padding: 16, paddingBottom: 32 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    heading: { fontSize: 22, fontWeight: '800', color: colors.text },
    sub: { fontSize: 14, color: colors.textSecondary, marginTop: 6 },
    section: { marginTop: 22 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.brand, marginBottom: 10 },
    rankCard: {
      flexDirection: 'row',
      gap: 12,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    rank: { fontSize: 22, fontWeight: '800', color: colors.brand, width: 36 },
    rankInfo: { flex: 1 },
    shopName: { fontSize: 16, fontWeight: '700', color: colors.text },
    shopMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    stats: { fontSize: 13, color: colors.text, marginTop: 6, fontWeight: '600' },
  });
}
