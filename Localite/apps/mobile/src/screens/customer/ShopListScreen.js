import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { api, PAGE_LIMIT } from '../../services/api';
import { shopHasVisualCatalog } from '@localite/shared';
import ScreenLayout from '../../components/ScreenLayout';

const CATEGORY_COLORS = {
  Sweets: '#f59e0b',
  Medicines: '#3b82f6',
  Vegetables: '#22c55e',
  Grocery: '#8b5cf6',
  Bakery: '#f97316',
  Flowers: '#db2777',
  Nursery: '#15803d',
};

export default function ShopListScreen({ navigation }) {
  const [areas, setAreas] = useState([]);
  const [selectedArea, setSelectedArea] = useState(null);
  const [shops, setShops] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    api.getAreas().then(({ areas: a }) => {
      setAreas(a);
      if (a.length) setSelectedArea(a[0]);
      else setLoading(false);
    }).catch(console.error);
  }, []);

  const loadShops = useCallback(async ({ nextPage = 1, append = false } = {}) => {
    if (!selectedArea) return;
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const res = await api.getShopsByArea(selectedArea.id, { page: nextPage, limit: PAGE_LIMIT });
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
  }, [selectedArea]);

  useEffect(() => {
    if (!selectedArea) return;
    loadShops({ nextPage: 1 });
  }, [selectedArea, loadShops]);

  const loadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      loadShops({ nextPage: page + 1, append: true });
    }
  };

  if (loading && !shops.length) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a7f4b" />
      </View>
    );
  }

  return (
    <ScreenLayout>
      <View style={styles.container}>
        <Text style={styles.heading}>Shops in {selectedArea?.name}</Text>
        <Text style={styles.sub}>{selectedArea?.city}</Text>

        <FlatList
        data={shops}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color="#1a7f4b" /> : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate(
              shopHasVisualCatalog(item) ? 'CatalogOrder' : 'PlaceOrder',
              { shop: item },
            )}
          >
            <View style={[styles.badge, { backgroundColor: CATEGORY_COLORS[item.category] || '#999' }]}>
              <Text style={styles.badgeText}>{item.category}</Text>
            </View>
            <Text style={styles.shopName}>{item.name}</Text>
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
        )}
        ListEmptyComponent={<Text style={styles.empty}>No shops found. Run seed script first.</Text>}
        />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8faf9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 22, fontWeight: '700', color: '#111' },
  sub: { fontSize: 14, color: '#666', marginBottom: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 8 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  shopName: { fontSize: 18, fontWeight: '700', color: '#111' },
  catalogHint: { fontSize: 12, color: '#1a7f4b', fontWeight: '600', marginTop: 4 },
  owner: { fontSize: 13, color: '#555', marginTop: 4 },
  address: { fontSize: 12, color: '#888', marginTop: 4 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40 },
});
