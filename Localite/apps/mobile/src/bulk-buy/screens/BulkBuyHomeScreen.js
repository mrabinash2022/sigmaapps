import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { formatBulkBuyProgress } from '@localite/shared';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { UserRole } from '@localite/shared';
import ScreenLayout from '../../components/ScreenLayout';
import { shopHasBulkBuyEnabled } from '../../utils/profile';

function statusLabel(status) {
  const map = {
    collecting: 'Collecting interest',
    ready_for_offers: 'Waiting for store offers',
    offers_available: 'Offers available',
    closed: 'Closed',
    expired: 'Expired',
    cancelled: 'Cancelled',
  };
  return map[status] || status;
}

export default function BulkBuyHomeScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isCustomer = user?.role === UserRole.CUSTOMER;
  const isShopAdmin = user?.role === UserRole.ADMIN;
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;
  const canUseShopBulkBuy = isSuperAdmin || (isShopAdmin && shopHasBulkBuyEnabled(user));
  const showCreateCampaign = isCustomer || canUseShopBulkBuy;

  const [campaigns, setCampaigns] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const areaId = user?.areaId;
      const [listRes, inboxRes] = await Promise.all([
        areaId ? api.getBulkBuyCampaigns(areaId) : Promise.resolve({ campaigns: [] }),
        canUseShopBulkBuy ? api.getBulkBuyInbox() : Promise.resolve({ campaigns: [] }),
      ]);
      setCampaigns(listRes.campaigns || []);
      setInbox(inboxRes.campaigns || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.areaId, canUseShopBulkBuy]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    load();
  }, [load]));

  const renderCampaign = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('BulkBuyCampaignDetail', { campaignId: item.id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.badge}>{item.productCategoryLabel}</Text>
      </View>
      <Text style={styles.meta}>
        {item.createdByType === 'store' && item.createdByShop
          ? `By ${item.createdByShop.name}`
          : item.createdByCustomer
            ? `By ${item.createdByCustomer.name}`
            : 'By customer'}
      </Text>
      <Text style={styles.progress}>{formatBulkBuyProgress(item.subscriberCount, item.minSubscribers)}</Text>
      <Text style={styles.status}>{statusLabel(item.status)}</Text>
      {item.offerCount > 0 && (
        <Text style={styles.offers}>{item.offerCount} store offer{item.offerCount > 1 ? 's' : ''}</Text>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <ScreenLayout>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Group up. Get a better deal.</Text>
        <Text style={styles.heroSub}>
          Join bulk buy campaigns for TVs, fridges, washing machines and more from local electronics stores.
        </Text>
        {showCreateCampaign && (
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => navigation.navigate('BulkBuyCreateCampaign')}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.createBtnText}>Start a campaign</Text>
          </TouchableOpacity>
        )}
      </View>

      {canUseShopBulkBuy && inbox.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Store inbox — ready for offers</Text>
          <FlatList
            data={inbox}
            keyExtractor={(item) => `inbox-${item.id}`}
            renderItem={renderCampaign}
            scrollEnabled={false}
          />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Campaigns in your area</Text>
        {!user?.areaId ? (
          <Text style={styles.empty}>Set your area in profile to see local campaigns.</Text>
        ) : campaigns.length === 0 ? (
          <Text style={styles.empty}>No active campaigns yet. Start one above.</Text>
        ) : (
          <FlatList
            data={campaigns}
            keyExtractor={(item) => item.id}
            renderItem={renderCampaign}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand} />
            }
          />
        )}
      </View>
      </View>
    </ScreenLayout>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
    hero: {
      backgroundColor: colors.card,
      margin: 16,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    heroTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 8 },
    heroSub: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginBottom: 16 },
    createBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.brand,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 10,
      alignSelf: 'flex-start',
    },
    createBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    section: { flex: 1, paddingHorizontal: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
    cardTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text },
    badge: {
      fontSize: 11,
      color: colors.brand,
      backgroundColor: `${colors.brand}22`,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      overflow: 'hidden',
    },
    meta: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
    progress: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 8 },
    status: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
    offers: { fontSize: 13, color: colors.brand, marginTop: 6, fontWeight: '600' },
    empty: { fontSize: 14, color: colors.textMuted, marginBottom: 24 },
  });
}
