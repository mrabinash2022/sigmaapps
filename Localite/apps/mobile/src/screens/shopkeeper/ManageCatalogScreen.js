import React, { useCallback, useMemo, useState } from 'react';
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
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CatalogPublishStatus } from '@localite/shared';
import { api } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import ScreenLayout from '../../components/ScreenLayout';
import { useMyShop } from '../../hooks/useMyShop';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80';

function ProductRow({ item, onEdit, onPublish, onUnpublish, onDelete, styles }) {
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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { shop, shopId, loading: shopLoading, invitedShop, reload: reloadShop } = useMyShop();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ publishedCount: 0, draftCount: 0, visualCatalogEnabled: false });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);

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

  const importCsv = async () => {
    if (!csvText.trim()) return Alert.alert('Paste CSV', 'Add CSV content with header: name,itemGroup,price');
    setImporting(true);
    try {
      const result = await api.importCatalogCsv(shopId, csvText, false);
      setCsvModalOpen(false);
      setCsvText('');
      await loadCatalog();
      Alert.alert('Imported', `${result.imported} product(s) added as drafts.`);
    } catch (err) {
      Alert.alert('Import failed', err.message);
    } finally {
      setImporting(false);
    }
  };

  if (shopLoading || loading) {
    return (
      <ScreenLayout>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
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
          <TouchableOpacity style={styles.importBtn} onPress={() => setCsvModalOpen(true)}>
            <Text style={styles.importBtnText}>Import CSV</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          refreshControl={(
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.brand}
              colors={[colors.brand]}
            />
          )}
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
              styles={styles}
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

        <Modal visible={csvModalOpen} animationType="slide" onRequestClose={() => setCsvModalOpen(false)}>
          <View style={styles.csvModal}>
            <Text style={styles.csvTitle}>Import products from CSV</Text>
            <Text style={styles.csvHint}>Header: name,itemGroup,price,sizeLabel,unit,description,trackStock,stockQuantity</Text>
            <ScrollView style={{ flex: 1 }}>
              <TextInput
                style={styles.csvInput}
                multiline
                value={csvText}
                onChangeText={setCsvText}
                placeholder={'name,itemGroup,price\nBasmati Rice,staples,120,1kg,kg,,true,50'}
                textAlignVertical="top"
              />
            </ScrollView>
            <TouchableOpacity style={styles.importSubmit} onPress={importCsv} disabled={importing}>
              <Text style={styles.fabText}>{importing ? 'Importing…' : 'Import as drafts'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.importCancel} onPress={() => setCsvModalOpen(false)}>
              <Text style={styles.importCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </View>
    </ScreenLayout>
  );
}

function createStyles(colors) {
  const isDark = colors.mode === 'dark';
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    header: {
      padding: 16,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    heading: { fontSize: 22, fontWeight: '800', color: colors.text },
    sub: { fontSize: 13, color: colors.brand, fontWeight: '700', marginTop: 4 },
    hint: { fontSize: 13, color: colors.textSecondary, marginTop: 8, lineHeight: 18 },
    card: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    thumb: { width: 72, height: 72, borderRadius: 10, backgroundColor: colors.border },
    info: { flex: 1 },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    name: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    badgeLive: { backgroundColor: isDark ? '#14532d' : '#dcfce7' },
    badgeDraft: { backgroundColor: isDark ? '#422006' : '#fef3c7' },
    badgeText: { fontSize: 10, fontWeight: '800', color: isDark ? colors.text : '#333' },
    meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    price: { fontSize: 14, fontWeight: '800', color: colors.brand, marginTop: 4 },
    group: { fontSize: 11, color: colors.textMuted, marginTop: 2, textTransform: 'capitalize' },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    actionBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: colors.accentSurface },
    actionBtnPrimary: { backgroundColor: colors.brandDark },
    actionText: { fontSize: 12, fontWeight: '700', color: colors.text },
    actionTextPrimary: { fontSize: 12, fontWeight: '700', color: '#fff' },
    actionTextMuted: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
    actionTextDanger: { fontSize: 12, fontWeight: '700', color: '#f87171' },
    fab: {
      position: 'absolute',
      right: 16,
      bottom: 16,
      backgroundColor: colors.brandDark,
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderRadius: 28,
      elevation: 4,
    },
    fabText: { color: '#fff', fontWeight: '800', fontSize: 15 },
    importBtn: {
      marginTop: 10,
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: colors.brand,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    importBtnText: { color: colors.brand, fontWeight: '700' },
    csvModal: { flex: 1, backgroundColor: colors.background, padding: 16 },
    csvTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 },
    csvHint: { fontSize: 12, color: colors.textMuted, marginBottom: 12 },
    csvInput: {
      minHeight: 220,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 12,
      backgroundColor: colors.card,
      color: colors.text,
    },
    importSubmit: {
      backgroundColor: colors.brand,
      padding: 14,
      borderRadius: 10,
      alignItems: 'center',
      marginTop: 12,
    },
    importCancel: { padding: 14, alignItems: 'center' },
    importCancelText: { color: colors.textSecondary, fontWeight: '600' },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    emptySub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8 },
    primaryBtn: { marginTop: 16, backgroundColor: colors.brandDark, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
    primaryBtnText: { color: '#fff', fontWeight: '700' },
  });
}
