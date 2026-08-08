import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import {
  getOrderDisplayItems,
  getOrderDisplayTotals,
  parseCatalogPayload,
} from '@localite/shared';

function UnavailableMark() {
  return (
    <View style={styles.unavailableMark}>
      <Text style={styles.unavailableX}>✕</Text>
    </View>
  );
}

export default function CatalogOrderItems({ order }) {
  const items = getOrderDisplayItems(order);
  const totals = getOrderDisplayTotals(order);
  const note = parseCatalogPayload(order)?.note;

  if (!items.length && !note) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Order items</Text>

      {items.map((entry) => {
        if (entry.kind === 'catalog') {
          const struck = entry.isUnavailable || entry.isPartial;

          return (
            <View
              key={entry.key}
              style={[styles.row, entry.isUnavailable && styles.rowUnavailable]}
            >
              {entry.isUnavailable ? <UnavailableMark /> : null}
              {entry.imageUrl ? (
                <Image
                  source={{ uri: entry.imageUrl }}
                  style={[styles.thumb, entry.isUnavailable && styles.thumbDimmed]}
                />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder, entry.isUnavailable && styles.thumbDimmed]} />
              )}
              <View style={styles.info}>
                <Text style={[styles.name, entry.isUnavailable && styles.strike]}>
                  {entry.name}
                </Text>
                {entry.sizeLabel ? (
                  <Text style={[styles.meta, entry.isUnavailable && styles.strike]}>
                    {entry.sizeLabel}
                  </Text>
                ) : null}

                {entry.isUnavailable ? (
                  <Text style={styles.notAvailable}>
                    Not available
                    {entry.unavailableReason ? ` — ${entry.unavailableReason}` : ''}
                  </Text>
                ) : entry.isPartial ? (
                  <Text style={styles.qty}>
                    <Text style={styles.strike}>
                      {entry.quantityRequested} × ₹{Number(entry.unitPrice).toFixed(0)}
                    </Text>
                    {'  '}
                    <Text style={styles.partialQty}>
                      {entry.quantityFulfilled} fulfilled
                    </Text>
                    {'  '}
                    <Text style={styles.lineTotal}>₹{Number(entry.lineTotal).toFixed(0)}</Text>
                  </Text>
                ) : (
                  <Text style={styles.qty}>
                    {entry.quantityRequested} × ₹{Number(entry.unitPrice).toFixed(0)}
                    {'  '}
                    <Text style={styles.lineTotal}>₹{Number(entry.lineTotal).toFixed(0)}</Text>
                  </Text>
                )}

                {struck && !entry.isUnavailable && entry.originalLineTotal != null && (
                  <Text style={styles.originalLine}>
                    Was ₹{Number(entry.originalLineTotal).toFixed(0)}
                  </Text>
                )}
              </View>
            </View>
          );
        }

        if (entry.kind === 'text') {
          return (
            <View
              key={entry.key}
              style={[styles.textRow, entry.isUnavailable && styles.rowUnavailable]}
            >
              {entry.isUnavailable ? <UnavailableMark /> : (
                <Text style={styles.bullet}>•</Text>
              )}
              <View style={styles.info}>
                <Text style={[styles.textLine, entry.isUnavailable && styles.strike]}>
                  {entry.text}
                </Text>
                {entry.isUnavailable ? (
                  <Text style={styles.notAvailable}>
                    Not available
                    {entry.unavailableReason ? ` — ${entry.unavailableReason}` : ''}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        }

        if (entry.kind === 'image') {
          return (
            <View
              key={entry.key}
              style={[styles.imageBlock, entry.isUnavailable && styles.rowUnavailable]}
            >
              {entry.isUnavailable ? <UnavailableMark /> : null}
              <Text style={[styles.imageLabel, entry.isUnavailable && styles.strike]}>
                {entry.label}
              </Text>
              {entry.isUnavailable ? (
                <Text style={styles.notAvailable}>
                  Not available
                  {entry.unavailableReason ? ` — ${entry.unavailableReason}` : ''}
                </Text>
              ) : (
                <Image source={{ uri: entry.imageUrl }} style={styles.listImage} />
              )}
            </View>
          );
        }

        return null;
      })}

      {totals.originalEstimate != null && (
        <View style={styles.totalsBlock}>
          {totals.hasAdjustments ? (
            <>
              <Text style={styles.originalTotal}>
                Original estimate: ₹{Number(totals.originalEstimate).toFixed(2)}
              </Text>
              {totals.fulfilledSubtotal != null && (
                <Text style={styles.adjustedTotal}>
                  Adjusted total: ₹{Number(totals.fulfilledSubtotal).toFixed(2)}
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.total}>
              Catalog estimate: ₹{Number(totals.originalEstimate).toFixed(2)}
            </Text>
          )}
          {totals.finalBillAmount != null && (
            <Text style={styles.billAmount}>
              Bill amount: ₹{Number(totals.finalBillAmount).toFixed(2)}
            </Text>
          )}
        </View>
      )}

      {note ? (
        <View style={styles.noteBlock}>
          <Text style={styles.noteLabel}>Delivery note</Text>
          <Text style={styles.noteText}>{note}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 4 },
  title: { fontSize: 12, fontWeight: '700', color: '#555', textTransform: 'uppercase', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'center' },
  rowUnavailable: {
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  unavailableMark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unavailableX: { color: '#fff', fontSize: 14, fontWeight: '800', lineHeight: 16 },
  thumb: { width: 56, height: 56, borderRadius: 10, backgroundColor: '#eee' },
  thumbPlaceholder: { backgroundColor: '#e8f5ee' },
  thumbDimmed: { opacity: 0.45 },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: '#222' },
  meta: { fontSize: 12, color: '#888', marginTop: 2 },
  qty: { fontSize: 13, color: '#555', marginTop: 4 },
  partialQty: { fontSize: 13, color: '#b45309', fontWeight: '600' },
  lineTotal: { fontWeight: '800', color: '#1a7f4b' },
  strike: { textDecorationLine: 'line-through', color: '#b91c1c' },
  notAvailable: { fontSize: 12, fontWeight: '700', color: '#dc2626', marginTop: 4 },
  originalLine: { fontSize: 11, color: '#b91c1c', marginTop: 2, textDecorationLine: 'line-through' },
  textRow: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'flex-start' },
  bullet: { fontSize: 16, color: '#1a7f4b', lineHeight: 20 },
  textLine: { flex: 1, fontSize: 14, color: '#333', lineHeight: 20 },
  imageBlock: { marginTop: 4, marginBottom: 10 },
  imageLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 8 },
  listImage: { width: '100%', height: 200, borderRadius: 10, backgroundColor: '#eee' },
  totalsBlock: { marginTop: 4, marginBottom: 8 },
  total: { fontSize: 15, fontWeight: '800', color: '#1a7f4b' },
  originalTotal: {
    fontSize: 13,
    color: '#b91c1c',
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  adjustedTotal: { fontSize: 15, fontWeight: '800', color: '#1a7f4b' },
  billAmount: { fontSize: 14, fontWeight: '700', color: '#166534', marginTop: 4 },
  noteBlock: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' },
  noteLabel: { fontSize: 12, fontWeight: '700', color: '#888', marginBottom: 4 },
  noteText: { fontSize: 14, color: '#444', lineHeight: 20 },
});
