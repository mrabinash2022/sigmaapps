import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';
import ScreenLayout from '../../components/ScreenLayout';
import { resolveMediaUrl } from '../../utils/profile';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80';

export default function WishlistScreen() {
  const navigation = useNavigation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.getWishlist()
      .then(({ items: rows }) => setItems(rows))
      .catch((err) => Alert.alert('Error', err.message))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const remove = async (catalogItemId) => {
    try {
      await api.removeWishlistItem(catalogItemId);
      load();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  if (loading) {
    return (
      <ScreenLayout>
        <View style={styles.center}><ActivityIndicator size="large" color="#1a7f4b" /></View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No saved items yet. Tap ♥ on catalog products.</Text>}
        renderItem={({ item }) => {
          const product = item.catalogItem;
          const shop = item.shop;
          return (
            <View style={styles.card}>
              <Image source={{ uri: resolveMediaUrl(product?.imageUrl) || DEFAULT_IMAGE }} style={styles.thumb} />
              <View style={styles.info}>
                <Text style={styles.name}>{product?.name}</Text>
                <Text style={styles.shop}>{shop?.name}</Text>
                <Text style={styles.price}>₹{Number(product?.price || 0).toFixed(0)}</Text>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.btn}
                    onPress={() => navigation.navigate('CatalogOrder', { shop })}
                  >
                    <Text style={styles.btnText}>Order</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => remove(product.id)}>
                    <Text style={styles.remove}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  empty: { textAlign: 'center', color: '#888', marginTop: 40 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  thumb: { width: 72, height: 72, borderRadius: 8, marginRight: 12 },
  info: { flex: 1 },
  name: { fontWeight: '700', fontSize: 15 },
  shop: { color: '#666', marginTop: 2 },
  price: { color: '#1a7f4b', fontWeight: '700', marginTop: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  btn: { backgroundColor: '#1a7f4b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: '700' },
  remove: { color: '#ef4444', fontWeight: '600' },
});
