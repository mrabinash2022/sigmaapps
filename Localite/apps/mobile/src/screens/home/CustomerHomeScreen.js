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
import { Ionicons } from '@expo/vector-icons';
import { formatOfferDiscount } from '@localite/shared';
import { api } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import ScreenLayout from '../../components/ScreenLayout';
import OfferBannerCard from '../../components/OfferBannerCard';

export default function CustomerHomeScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (force = false) => {
    try {
      const payload = await api.getCustomerHome({ force });
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

  const onRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  const toggleFavorite = async (shopId, isFavorite) => {
    try {
      if (isFavorite) await api.removeFavoriteShop(shopId);
      else await api.addFavoriteShop(shopId);
      load(true);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  const favoriteIds = new Set((data?.favoriteStores || []).map((s) => s.id));

  return (
    <ScreenLayout>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      >
        <Text style={styles.heading}>Welcome to Localite</Text>
        <Text style={styles.sub}>{data?.supportInfo?.message}</Text>

        {(data?.announcements || []).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>News & updates</Text>
            {data.announcements.map((item) => (
              <View key={item.id} style={styles.newsCard}>
                <Text style={styles.newsTitle}>{item.title}</Text>
                <Text style={styles.newsBody}>{item.body}</Text>
              </View>
            ))}
          </View>
        )}

        {(data?.platformOffers || []).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Platform offers</Text>
            {data.platformOffers.map((offer) => (
              <OfferBannerCard key={offer.id} offer={offer} colors={colors} />
            ))}
          </View>
        )}

        {(data?.topOffers || []).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top store offers</Text>
            {data.topOffers.map((offer) => (
              <OfferBannerCard key={offer.id} offer={offer} colors={colors} />
            ))}
          </View>
        )}

        {(data?.closedStores || []).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Store updates</Text>
            {data.closedStores.map((item) => (
              <View key={item.shopId} style={styles.closedCard}>
                <Ionicons name="time-outline" size={18} color={colors.warning || '#f59e0b'} />
                <View style={styles.closedText}>
                  <Text style={styles.closedName}>{item.shopName}</Text>
                  <Text style={styles.closedLabel}>{item.status?.label}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Favorite stores</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Shops')}>
              <Text style={styles.link}>Browse stores</Text>
            </TouchableOpacity>
          </View>
          {(data?.favoriteStores || []).length === 0 ? (
            <Text style={styles.empty}>Star stores from the Stores tab to see them here.</Text>
          ) : (
            data.favoriteStores.map((shop) => (
              <TouchableOpacity
                key={shop.id}
                style={styles.favCard}
                onPress={() => navigation.navigate(
                  shop.visualCatalogEnabled ? 'CatalogOrder' : 'PlaceOrder',
                  { shop },
                )}
              >
                <View style={styles.favHeader}>
                  <Text style={styles.favName}>{shop.name}</Text>
                  <TouchableOpacity onPress={() => toggleFavorite(shop.id, favoriteIds.has(shop.id))}>
                    <Ionicons name="star" size={20} color={colors.brand} />
                  </TouchableOpacity>
                </View>
                {shop.topOffer ? (
                  <Text style={styles.favOffer}>{formatOfferDiscount(shop.topOffer)}</Text>
                ) : null}
                {shop.storeInfo?.status && !shop.storeInfo.status.isOpen ? (
                  <Text style={styles.favClosed}>{shop.storeInfo.status.label}</Text>
                ) : null}
              </TouchableOpacity>
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
    section: { marginTop: 22 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.brand, marginBottom: 10 },
    link: { color: colors.brand, fontWeight: '700', fontSize: 13 },
    newsCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    newsTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    newsBody: { fontSize: 14, color: colors.textSecondary, marginTop: 6, lineHeight: 20 },
    offerBanner: {
      backgroundColor: colors.linkCardBg,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.linkCardBorder,
    },
    offerTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    offerShop: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
    offerDiscount: { fontSize: 15, fontWeight: '700', color: colors.brand, marginTop: 6 },
    offerDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
    closedCard: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-start',
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    closedText: { flex: 1 },
    closedName: { fontWeight: '700', color: colors.text },
    closedLabel: { color: colors.textSecondary, marginTop: 2, fontSize: 13 },
    empty: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
    favCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    favHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    favName: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
    favOffer: { color: colors.brand, fontWeight: '700', marginTop: 6 },
    favClosed: { color: colors.warning || '#f59e0b', marginTop: 4, fontSize: 13 },
  });
}
