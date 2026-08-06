import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CatalogPublishStatus } from '@localite/shared';
import { api } from '../../services/api';
import ScreenLayout from '../../components/ScreenLayout';
import { useMyShop } from '../../hooks/useMyShop';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80';

function ProductRow({ item, onEdit, onPublish, onUnpublish, onDelete }) {
  const isPublished = item.publishStatus === CatalogPublishStatus.PUBLISHED;

  return (
    <View style={styles.card}>
      <Image source={{ uri: item.imageUrl || DEFAULT_IMAGE }} style={styles.thumb} />
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
          <View style={[styles.badge, isPublished ? styles.badgeLive : styles.badgeDraft]}>
            <Text style={styles.badgeText}>{isPublished ? 'Live' : 'Draft'}</Text>
          </View>
        </View>
        {item.sizeLabel ? <Text style={styles.meta}>{item.sizeLabel}</Text> : null}
        <Text style={styles.price}>₹{Number(item.price).toFixed(0)} · per {item.unit || 'piece'}</Text>
        <Text style={styles.group}>{item.itemGroup?.replace(/_/g, ' ')}</Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(item)}>
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>
          {isPublished ? (
            <TouchableOpacity style={styles.actionBtn} onPress={() => onUnpublish(item)}>
              <Text style={styles.actionTextMuted}>Unpublish</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={() => onPublish(item)}>
              <Text style={styles.actionTextPrimary}>Publish</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionBtn} onPress={() => onDelete(item)}>
            <Text style={styles.actionTextDanger}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function ManageCatalogScreen({ navigation }) {
  const { shop, shopId, loading: shopLoading, invitedShop, isEnabled, reload: reloadShop } = useMyShop();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ publishedCount: 0, draftCount: 0, visualCatalogEnabled: false });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCatalog = useCallback(async () => {
    if (!shopId) return;
    try {
      const data = await api.getManageCatalog(shopId);
      setItems(data.items || []);
      setStats({
        publishedCount: data.publishedCount || 0,
        draftCount: data.draftCount || 0,
        visualCatalogEnabled: data.shop?.visualCatalogEnabled || false,
      });
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }, [shopId]);

  const load = useCallback(async () => {
    setLoading(true);
    await reloadShop();
    await loadCatalog();
    setLoading(false);
  }, [reloadShop, loadCatalog]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const refresh = async () => {
    setRefreshing(true);
    await loadCatalog();
    setRefreshing(false);
  };

  const handlePublish = (item) => {
    Alert.alert('Publish product', `Make "${item.name}" visible to customers?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Publish',
        onPress: async () => {
          try {
            await api.publishCatalogItem(shopId, item.id);
            await loadCatalog();
          } catch (err) {
            Alert.alert('Failed', err.message);
          }
        },
      },
    ]);
  };

  const handleUnpublish = (item) => {
    Alert.alert('Unpublish', `Hide "${item.name}" from customers?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unpublish',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.unpublishCatalogItem(shopId, item.id);
            await loadCatalog();
          } catch (err) {
            Alert.alert('Failed', err.message);
          }
        },
      },
    ]);
  };

  const handleDelete = (item) => {
    Alert.alert('Delete product', `Remove "${item.name}" permanently?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteCatalogItem(shopId, item.id);
            await loadCatalog();
          } catch (err) {
            Alert.alert('Failed', err.message);
          }
        },
      },
    ]);
  };

  if (shopLoading || loading) {
    return (
      <ScreenLayout>
        <View style={styles.center}><ActivityIndicator size="large" color="#1a7f4b" /></View>
      </ScreenLayout>
    );
  }

  if (invitedShop && !shopId) {
    return (
      <ScreenLayout>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Complete shop registration first</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('CompleteInvitation', { shop: invitedShop })}
          >
            <Text style={styles.primaryBtnText}>Register shop</Text>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  if (!shopId) {
    return (
      <ScreenLayout>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No approved shop yet</Text>
          <Text style={styles.emptySub}>Your shop application is pending approval.</Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.heading}>{shop?.name}</Text>
          <Text style={styles.sub}>
            {stats.publishedCount} live · {stats.draftCount} draft
            {stats.visualCatalogEnabled ? ' · visible to customers' : ''}
          </Text>
          <Text style={styles.hint}>
            Add products with photos and prices. Publish when ready — customers can then select them when ordering.
          </Text>
        </View>

        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>No products yet</Text>
              <Text style={styles.emptySub}>Tap + Add product to create your first visual item.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <ProductRow
              item={item}
              onEdit={(p) => navigation.navigate('EditCatalogItem', { shop, item: p })}
              onPublish={handlePublish}
              onUnpublish={handleUnpublish}
              onDelete={handleDelete}
            />
          )}
        />

        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('EditCatalogItem', { shop, item: null })}
        >
          <Text style={styles.fabText}>+ Add product</Text>
        </TouchableOpacity>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8faf9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: { padding: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fff' },
  heading: { fontSize: 22, fontWeight: '800', color: '#111' },
  sub: { fontSize: 13, color: '#1a7f4b', fontWeight: '700', marginTop: 4 },
  hint: { fontSize: 13, color: '#666', marginTop: 8, lineHeight: 18 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
    gap: 12,
  },
  thumb: { width: 72, height: 72, borderRadius: 10, backgroundColor: '#eee' },
  info: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, fontSize: 15, fontWeight: '700', color: '#222' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeLive: { backgroundColor: '#dcfce7' },
  badgeDraft: { backgroundColor: '#fef3c7' },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#333' },
  meta: { fontSize: 12, color: '#888', marginTop: 2 },
  price: { fontSize: 14, fontWeight: '800', color: '#1a7f4b', marginTop: 4 },
  group: { fontSize: 11, color: '#999', marginTop: 2, textTransform: 'capitalize' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: '#f3f4f6' },
  actionBtnPrimary: { backgroundColor: '#1a7f4b' },
  actionText: { fontSize: 12, fontWeight: '700', color: '#333' },
  actionTextPrimary: { fontSize: 12, fontWeight: '700', color: '#fff' },
  actionTextMuted: { fontSize: 12, fontWeight: '700', color: '#666' },
  actionTextDanger: { fontSize: 12, fontWeight: '700', color: '#b91c1c' },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#1a7f4b',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    elevation: 4,
  },
  fabText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  emptySub: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 8 },
  primaryBtn: { marginTop: 16, backgroundColor: '#1a7f4b', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
});
