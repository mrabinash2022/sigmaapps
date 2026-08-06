import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';

const CARD_WIDTH = (Dimensions.get('window').width - 48) / 2;

export function VisualCatalogItemCard({ item, quantity, onAdd, onRemove, accent }) {
  return (
    <View style={styles.card}>
      <Image source={{ uri: item.imageUrl }} style={styles.image} />
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
        {item.sizeLabel ? (
          <View style={[styles.sizeBadge, { borderColor: accent }]}>
            <Text style={[styles.sizeText, { color: accent }]}>{item.sizeLabel}</Text>
          </View>
        ) : null}
        <Text style={styles.price}>₹{Number(item.price).toFixed(0)}</Text>
        <Text style={styles.unit}>per {item.unit || 'piece'}</Text>
        <View style={styles.qtyRow}>
          <TouchableOpacity style={styles.qtyBtn} onPress={onRemove} disabled={!quantity}>
            <Text style={styles.qtyBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.qtyValue}>{quantity || 0}</Text>
          <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: accent }]} onPress={onAdd}>
            <Text style={[styles.qtyBtnText, styles.qtyBtnTextLight]}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export function VisualCatalogGroupTabs({ groups, activeGroup, onSelect, accent }) {
  if (!groups.length) return null;
  return (
    <View style={styles.tabsWrap}>
      {groups.map((group) => (
        <TouchableOpacity
          key={group.key}
          style={[
            styles.tab,
            activeGroup === group.key && { backgroundColor: accent, borderColor: accent },
          ]}
          onPress={() => onSelect(group.key)}
        >
          <Text style={styles.tabEmoji}>{group.emoji}</Text>
          <Text style={[styles.tabText, activeGroup === group.key && styles.tabTextActive]}>
            {group.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 4,
  },
  image: { width: '100%', height: CARD_WIDTH * 0.75, backgroundColor: '#eee' },
  cardBody: { padding: 10 },
  cardName: { fontSize: 14, fontWeight: '700', color: '#222', minHeight: 36 },
  sizeBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  sizeText: { fontSize: 10, fontWeight: '700' },
  price: { fontSize: 18, fontWeight: '800', color: '#111', marginTop: 6 },
  unit: { fontSize: 11, color: '#888' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 18, fontWeight: '700', color: '#333' },
  qtyBtnTextLight: { color: '#fff' },
  qtyValue: { fontSize: 16, fontWeight: '800', minWidth: 24, textAlign: 'center' },
  tabsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
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
  },
  tabEmoji: { fontSize: 16 },
  tabText: { fontSize: 13, fontWeight: '600', color: '#555' },
  tabTextActive: { color: '#fff' },
});
