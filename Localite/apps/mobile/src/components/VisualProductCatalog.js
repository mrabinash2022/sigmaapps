import React, { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { VisualCatalogItemCard } from './VisualCatalogGrid';

export const ALL_PRODUCTS_TAB = '__all__';

const CARD_WIDTH = (Dimensions.get('window').width - 48) / 2;
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80';

function normalizeItem(item) {
  return {
    ...item,
    price: Number(item.price),
    imageUrl: item.imageUrl || DEFAULT_IMAGE,
  };
}

function GroupTab({ group, active, accent, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.tab, active && { backgroundColor: accent, borderColor: accent }]}
      onPress={onPress}
    >
      <Text style={styles.tabEmoji}>{group.emoji || '📦'}</Text>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{group.label}</Text>
      {group.count != null ? (
        <Text style={[styles.tabCount, active && styles.tabTextActive]}>{group.count}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

/**
 * Generic visual product grid for any shop type.
 * Shows category tabs + 2-column image/price cards.
 */
export default function VisualProductCatalog({
  groups = [],
  activeGroup,
  onSelectGroup,
  cart = {},
  onAddItem,
  onRemoveItem,
  accent = '#1a7f4b',
  loading = false,
  error = null,
  onRetry,
  ListFooterComponent = null,
}) {
  const tabs = useMemo(() => {
    const allItems = groups.flatMap((g) => g.items || []);
    return [
      { key: ALL_PRODUCTS_TAB, label: 'All', emoji: '🛍️', count: allItems.length },
      ...groups.map((g) => ({ ...g, count: g.items?.length || 0 })),
    ];
  }, [groups]);

  const displayItems = useMemo(() => {
    if (activeGroup === ALL_PRODUCTS_TAB) {
      return groups.flatMap((g) => (g.items || []).map(normalizeItem));
    }
    const group = groups.find((g) => g.key === activeGroup);
    return (group?.items || []).map(normalizeItem);
  }, [groups, activeGroup]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={accent} />
        <Text style={styles.loadingText}>Loading products…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        {onRetry ? (
          <TouchableOpacity style={[styles.retryBtn, { borderColor: accent }]} onPress={onRetry}>
            <Text style={[styles.retryText, { color: accent }]}>Retry</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  if (!groups.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No products listed yet</Text>
        <Text style={styles.emptySub}>This shop has not added visual items. Use the text box below to order.</Text>
        {onRetry ? (
          <TouchableOpacity style={[styles.retryBtn, { borderColor: accent }]} onPress={onRetry}>
            <Text style={[styles.retryText, { color: accent }]}>Refresh</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <FlatList
        horizontal
        data={tabs}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContent}
        style={styles.tabs}
        renderItem={({ item }) => (
          <GroupTab
            group={item}
            active={activeGroup === item.key}
            accent={accent}
            onPress={() => onSelectGroup(item.key)}
          />
        )}
      />

      <FlatList
        data={displayItems}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        style={styles.productList}
        ListFooterComponent={ListFooterComponent}
        ListEmptyComponent={
          <Text style={styles.emptySub}>No items in this category.</Text>
        }
        renderItem={({ item }) => (
          <VisualCatalogItemCard
            item={item}
            quantity={cart[item.id] || 0}
            accent={accent}
            onAdd={() => onAddItem(item.id)}
            onRemove={() => onRemoveItem(item.id)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: '#666', fontSize: 14 },
  errorText: { color: '#b91c1c', textAlign: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  emptySub: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  retryBtn: { marginTop: 16, borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  retryText: { fontWeight: '700' },
  tabs: { maxHeight: 52, flexGrow: 0 },
  tabsContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    marginRight: 8,
  },
  tabEmoji: { fontSize: 15 },
  tabText: { fontSize: 13, fontWeight: '600', color: '#555' },
  tabCount: { fontSize: 11, fontWeight: '700', color: '#888', marginLeft: 2 },
  tabTextActive: { color: '#fff' },
  productList: { flex: 1 },
  grid: { paddingHorizontal: 16, paddingBottom: 16 },
  gridRow: { gap: 12, marginBottom: 12 },
});
