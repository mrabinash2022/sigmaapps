import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { getOrderItemsList, getCatalogEstimatedTotal, parseCatalogPayload } from '@localite/shared';

export default function CatalogOrderItems({ order }) {
  const entries = getOrderItemsList(order);
  const payload = parseCatalogPayload(order);
  const estimatedTotal = getCatalogEstimatedTotal(payload);

  if (!entries.length) return null;

  const itemEntries = entries.filter((e) => e.kind !== 'note');
  const noteEntry = entries.find((e) => e.kind === 'note');

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Order items</Text>

      {itemEntries.map((entry) => {
        if (entry.kind === 'catalog') {
          return (
            <View key={entry.key} style={styles.row}>
              {entry.imageUrl ? (
                <Image source={{ uri: entry.imageUrl }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]} />
              )}
              <View style={styles.info}>
                <Text style={styles.name}>{entry.name}</Text>
                {entry.sizeLabel ? <Text style={styles.meta}>{entry.sizeLabel}</Text> : null}
                <Text style={styles.qty}>
                  {entry.quantity} × ₹{Number(entry.unitPrice).toFixed(0)}
                  {'  '}
                  <Text style={styles.lineTotal}>₹{Number(entry.lineTotal).toFixed(0)}</Text>
                </Text>
              </View>
            </View>
          );
        }

        if (entry.kind === 'text') {
          return (
            <View key={entry.key} style={styles.textRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.textLine}>{entry.text}</Text>
            </View>
          );
        }

        if (entry.kind === 'image') {
          return (
            <View key={entry.key} style={styles.imageBlock}>
              <Text style={styles.imageLabel}>{entry.label}</Text>
              <Image source={{ uri: entry.imageUrl }} style={styles.listImage} />
            </View>
          );
        }

        return null;
      })}

      {estimatedTotal != null && (
        <Text style={styles.total}>Catalog estimate: ₹{Number(estimatedTotal).toFixed(2)}</Text>
      )}

      {noteEntry ? (
        <View style={styles.noteBlock}>
          <Text style={styles.noteLabel}>Delivery note</Text>
          <Text style={styles.noteText}>{noteEntry.text}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 4 },
  title: { fontSize: 12, fontWeight: '700', color: '#555', textTransform: 'uppercase', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'center' },
  thumb: { width: 56, height: 56, borderRadius: 10, backgroundColor: '#eee' },
  thumbPlaceholder: { backgroundColor: '#e8f5ee' },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: '#222' },
  meta: { fontSize: 12, color: '#888', marginTop: 2 },
  qty: { fontSize: 13, color: '#555', marginTop: 4 },
  lineTotal: { fontWeight: '800', color: '#1a7f4b' },
  textRow: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'flex-start' },
  bullet: { fontSize: 16, color: '#1a7f4b', lineHeight: 20 },
  textLine: { flex: 1, fontSize: 14, color: '#333', lineHeight: 20 },
  imageBlock: { marginTop: 4, marginBottom: 10 },
  imageLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 8 },
  listImage: { width: '100%', height: 200, borderRadius: 10, backgroundColor: '#eee' },
  total: { fontSize: 15, fontWeight: '800', color: '#1a7f4b', marginTop: 4, marginBottom: 8 },
  noteBlock: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' },
  noteLabel: { fontSize: 12, fontWeight: '700', color: '#888', marginBottom: 4 },
  noteText: { fontSize: 14, color: '#444', lineHeight: 20 },
});
