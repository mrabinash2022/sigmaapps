import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Pressable,
  Image,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, PAGE_LIMIT } from '../../services/api';
import { formatOfferDiscount, formatWeeklyOffDays, shopHasVisualCatalog, ShopCategory } from '@localite/shared';
import { useTheme } from '../../context/ThemeContext';
import ScreenLayout from '../../components/ScreenLayout';
import { resolveMediaUrl } from '../../utils/profile';

const CATEGORY_COLORS = {
  Sweets: '#f59e0b',
  Medicines: '#3b82f6',
  Vegetables: '#22c55e',
  Grocery: '#8b5cf6',
  Bakery: '#f97316',
  Flowers: '#db2777',
  Nursery: '#15803d',
};

const CATEGORY_OPTIONS = ['All', ...Object.values(ShopCategory)];

export default function ShopListScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [areas, setAreas] = useState([]);
  const [selectedArea, setSelectedArea] = useState(null);
  const [shops, setShops] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [infoShop, setInfoShop] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    api.getAreas().then(({ areas: a }) => {
      setAreas(a);
      if (a.length) setSelectedArea(a[0]);
      else setLoading(false);
    }).catch(console.error);

    api.getFavoriteShopIds()
      .then(({ shopIds }) => setFavoriteIds(new Set(shopIds || [])))
      .catch(() => {});
  }, []);

  const loadShops = useCallback(async ({ nextPage = 1, append = false } = {}) => {
    if (!selectedArea) return;
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const category = selectedCategory === 'All' ? undefined : selectedCategory;
      const res = await api.getShopsByArea(selectedArea.id, {
        page: nextPage,
        limit: PAGE_LIMIT,
        category,
        q: debouncedQuery || undefined,
        force: true,
      });
      const items = res.items || [];
      setShops(append ? (prev) => [...prev, ...items] : items);
      setPage(nextPage);
      setHasMore(res.hasMore ?? false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedArea, selectedCategory, debouncedQuery]);

  useEffect(() => {
    if (!selectedArea) return;
    loadShops({ nextPage: 1 });
  }, [selectedArea, selectedCategory, debouncedQuery, loadShops]);

  const loadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      loadShops({ nextPage: page + 1, append: true });
    }
  };

  const toggleFavorite = async (shopId) => {
    const isFavorite = favoriteIds.has(shopId);
    try {
      if (isFavorite) {
        await api.removeFavoriteShop(shopId);
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(shopId);
          return next;
        });
      } else {
        await api.addFavoriteShop(shopId);
        setFavoriteIds((prev) => new Set(prev).add(shopId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && !shops.length) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <ScreenLayout>
      <View style={styles.container}>
        <Text style={styles.heading}>Shops in {selectedArea?.name}</Text>
        <Text style={styles.sub}>{selectedArea?.city}</Text>

        <TextInput
          style={styles.searchInput}
          placeholder="Search shops by name..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {CATEGORY_OPTIONS.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.filterChipText, selectedCategory === cat && styles.filterChipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <FlatList
          testID="shop-list"
          data={shops}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.brand} /> : null
          }
          renderItem={({ item }) => {
            const topOffer = item.activeOffers?.[0];
            const storeInfo = item.storeInfo;
            const isFavorite = favoriteIds.has(item.id);
            const bannerUrl = resolveMediaUrl(topOffer?.bannerImageUrl);
            const isClosed = storeInfo?.status && !storeInfo.status.isOpen;

            return (
              <TouchableOpacity
                testID="shop-card"
                style={[styles.card, isClosed && styles.cardClosed]}
                onPress={() => {
                  if (isClosed) {
                    return;
                  }
                  navigation.navigate(
                    shopHasVisualCatalog(item) ? 'CatalogOrder' : 'PlaceOrder',
                    { shop: item },
                  );
                }}
                disabled={isClosed}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.badge, { backgroundColor: CATEGORY_COLORS[item.category] || '#999' }]}>
                    <Text style={styles.badgeText}>{item.category}</Text>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      onPress={() => toggleFavorite(item.id)}
                      hitSlop={8}
                      style={styles.iconBtn}
                    >
                      <Ionicons
                        name={isFavorite ? 'star' : 'star-outline'}
                        size={20}
                        color={colors.brand}
                      />
                    </TouchableOpacity>
                    {storeInfo ? (
                      <TouchableOpacity
                        onPress={() => setInfoShop(item)}
                        hitSlop={8}
                        style={styles.iconBtn}
                      >
                        <Ionicons name="information-circle-outline" size={22} color={colors.textSecondary} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>

                {topOffer ? (
                  bannerUrl ? (
                    <View style={styles.offerImageWrap}>
                      <Image source={{ uri: bannerUrl }} style={styles.offerImage} resizeMode="cover" />
                      <View style={styles.offerImageOverlay}>
                        <Text style={styles.offerImageText} numberOfLines={1}>
                          {topOffer.title} · {formatOfferDiscount(topOffer)}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.offerBanner}>
                      <Text style={styles.offerText} numberOfLines={1}>
                        {topOffer.title} · {formatOfferDiscount(topOffer)}
                      </Text>
                    </View>
                  )
                ) : null}

                <Text style={styles.shopName}>{item.name}</Text>
            {item.rating?.avgRating ? (
              <Text style={styles.rating}>★ {item.rating.avgRating} ({item.rating.ratingCount})</Text>
            ) : null}
                {storeInfo?.status && !storeInfo.status.isOpen ? (
                  <Text style={styles.closedHint}>{storeInfo.status.label}</Text>
                ) : null}
                {shopHasVisualCatalog(item) ? (
                  <Text style={styles.catalogHint}>
                    {item.catalogItemCount
                      ? `${item.catalogItemCount} products with prices`
                      : 'Visual catalog · tap to browse'}
                  </Text>
                ) : null}
                <Text style={styles.owner}>{item.ownerName}</Text>
                <Text style={styles.address}>{item.address}</Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>No shops found. Run seed script first.</Text>}
        />
      </View>

      <Modal visible={Boolean(infoShop)} transparent animationType="fade" onRequestClose={() => setInfoShop(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setInfoShop(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{infoShop?.name}</Text>
            {infoShop?.storeInfo ? (
              <>
                <Text style={styles.modalLine}>
                  Status: {infoShop.storeInfo.status?.label || 'Open'}
                </Text>
                {infoShop.storeInfo.openTime && infoShop.storeInfo.closeTime ? (
                  <Text style={styles.modalLine}>
                    Hours: {infoShop.storeInfo.openTime} – {infoShop.storeInfo.closeTime}
                  </Text>
                ) : null}
                <Text style={styles.modalLine}>
                  Weekly off: {formatWeeklyOffDays(infoShop.storeInfo.weeklyOffDays)}
                </Text>
                {infoShop.storeInfo.closedMessage ? (
                  <Text style={styles.modalNote}>{infoShop.storeInfo.closedMessage}</Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.modalLine}>No store hours posted yet.</Text>
            )}
            <TouchableOpacity style={styles.modalClose} onPress={() => setInfoShop(null)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenLayout>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    heading: { fontSize: 22, fontWeight: '700', color: colors.text },
    sub: { fontSize: 14, color: colors.textSecondary, marginBottom: 8 },
    searchInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.card,
      marginBottom: 10,
    },
    filterRow: { marginBottom: 12, maxHeight: 40 },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 8,
      backgroundColor: colors.card,
    },
    filterChipActive: { borderColor: colors.brand, backgroundColor: colors.linkCardBg },
    filterChipText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
    filterChipTextActive: { color: colors.brand },
    cardClosed: { opacity: 0.65 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardActions: { flexDirection: 'row', gap: 4 },
    iconBtn: { padding: 4 },
    badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    offerBanner: {
      backgroundColor: colors.linkCardBg,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginTop: 10,
      borderWidth: 1,
      borderColor: colors.linkCardBorder,
    },
    offerImageWrap: {
      marginTop: 10,
      borderRadius: 8,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.linkCardBorder,
    },
    offerImage: { width: '100%', height: 88 },
    offerImageOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.55)',
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    offerImageText: { color: '#fff', fontWeight: '700', fontSize: 12 },
    offerText: { color: colors.brand, fontWeight: '700', fontSize: 12 },
    shopName: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 8 },
    rating: { fontSize: 12, color: colors.brand, fontWeight: '600', marginTop: 2 },
    closedHint: { fontSize: 12, color: '#f59e0b', fontWeight: '600', marginTop: 4 },
    catalogHint: { fontSize: 12, color: colors.brand, fontWeight: '600', marginTop: 4 },
    owner: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
    address: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
    empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      padding: 24,
    },
    modalCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 12 },
    modalLine: { fontSize: 14, color: colors.textSecondary, marginBottom: 8, lineHeight: 20 },
    modalNote: { fontSize: 14, color: colors.text, marginTop: 4, fontStyle: 'italic' },
    modalClose: {
      marginTop: 14,
      alignSelf: 'flex-end',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.brand,
    },
    modalCloseText: { color: '#fff', fontWeight: '700' },
  });
}
