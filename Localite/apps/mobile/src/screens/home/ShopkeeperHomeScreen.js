import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { formatOfferDiscount, formatWeeklyOffDays } from '@localite/shared';
import { api } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import ScreenLayout from '../../components/ScreenLayout';

export default function ShopkeeperHomeScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (force = false) => {
    try {
      const payload = await api.getShopkeeperHome({ force });
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

  const storeInfo = data?.storeInfo;
  const shop = data?.shop;

  return (
    <ScreenLayout>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={colors.brand} />
        }
      >
        <Text style={styles.heading}>{shop?.name || 'Your shop'}</Text>
        <Text style={styles.sub}>Manage offers and store hours from Profile.</Text>

        <View style={styles.quickRow}>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('ManageOffers')}>
            <Text style={styles.quickBtnText}>Offers</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('ManageStoreInfo')}>
            <Text style={styles.quickBtnText}>Store info</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('ManageShopProfile')}>
            <Text style={styles.quickBtnText}>Shop profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('StaffManagement')}>
            <Text style={styles.quickBtnText}>Staff</Text>
          </TouchableOpacity>
        </View>

        {data?.insights && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>30-day insights</Text>
            <Text style={styles.meta}>Revenue: ₹{Number(data.insights.deliveredRevenue || 0).toFixed(0)}</Text>
            <Text style={styles.meta}>Avg bill: ₹{Number(data.insights.averageBill || 0).toFixed(0)}</Text>
            <Text style={styles.meta}>Returns: {data.insights.returnCount || 0}</Text>
            <Text style={styles.meta}>COD pending collection: {data.insights.codPendingCollection || 0}</Text>
          </View>
        )}

        {data?.lowStockItems?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Low stock alert</Text>
            {data.lowStockItems.map((item) => (
              <Text key={item.id} style={styles.meta}>{item.name}: {item.stockQuantity} left</Text>
            ))}
          </View>
        )}

        {storeInfo && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Store status</Text>
            <Text style={styles.status}>{storeInfo.status?.label || 'Open'}</Text>
            {storeInfo.openTime && storeInfo.closeTime ? (
              <Text style={styles.meta}>Hours: {storeInfo.openTime} – {storeInfo.closeTime}</Text>
            ) : null}
            <Text style={styles.meta}>Weekly off: {formatWeeklyOffDays(storeInfo.weeklyOffDays)}</Text>
          </View>
        )}

        {(data?.announcements || []).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>News from Localite</Text>
            {data.announcements.map((item) => (
              <View key={item.id} style={styles.card}>
                <Text style={styles.newsTitle}>{item.title}</Text>
                <Text style={styles.newsBody}>{item.body}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your top offers</Text>
          {(data?.topOffers || []).length === 0 ? (
            <Text style={styles.empty}>No active offers. Add one from Profile → Offers & discounts.</Text>
          ) : (
            data.topOffers.map((offer) => (
              <View key={offer.id} style={styles.offerCard}>
                <Text style={styles.offerTitle}>{offer.title}</Text>
                <Text style={styles.offerDiscount}>{formatOfferDiscount(offer)}</Text>
              </View>
            ))
          )}
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
    sub: { fontSize: 14, color: colors.textSecondary, marginTop: 6, lineHeight: 20 },
    quickRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
    quickBtn: {
      flex: 1,
      backgroundColor: colors.brand,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
    },
    quickBtnText: { color: '#fff', fontWeight: '700' },
    section: { marginTop: 22 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.brand, marginBottom: 10 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
    status: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 6 },
    meta: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
    newsTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    newsBody: { fontSize: 14, color: colors.textSecondary, marginTop: 6, lineHeight: 20 },
    empty: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
    offerCard: {
      backgroundColor: colors.linkCardBg,
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.linkCardBorder,
    },
    offerTitle: { fontWeight: '700', color: colors.text },
    offerDiscount: { color: colors.brand, fontWeight: '700', marginTop: 4 },
  });
}
