import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  parseFulfillmentPayload,
  hasUnavailableItems,
  OrderStatus,
} from '@localite/shared';

function FulfillmentLine({ line }) {
  const fulfilled = line.quantityFulfilled > 0;
  const missing = line.quantityRequested - (line.quantityFulfilled || 0);

  return (
    <View style={[styles.line, !fulfilled && styles.lineMissing]}>
      <Text style={styles.lineName}>{line.name}</Text>
      {line.kind === 'catalog' && missing > 0 && (
        <Text style={styles.lineMeta}>
          {line.quantityFulfilled} of {line.quantityRequested} available
          {line.unavailableReason ? ` — ${line.unavailableReason}` : ''}
        </Text>
      )}
      {line.kind !== 'catalog' && line.status === 'unavailable' && (
        <Text style={styles.lineMeta}>
          Unavailable{line.unavailableReason ? ` — ${line.unavailableReason}` : ''}
        </Text>
      )}
    </View>
  );
}

export default function FulfillmentSummary({ order, onOpenBackorder }) {
  const payload = parseFulfillmentPayload(order);
  const backorders = order?.backorderOrders || [];
  const parentOrder = order?.parentOrder;
  const isBackorder = order?.orderStatus === OrderStatus.BACKORDER_WAITING
    || Boolean(order?.parentOrderId);

  if (!hasUnavailableItems(order) && !isBackorder && !backorders.length) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fulfillment details</Text>

      {payload?.shopNote ? (
        <Text style={styles.shopNote}>Shop note: {payload.shopNote}</Text>
      ) : null}

      {payload?.unavailableSummary?.length > 0 && (
        <View style={styles.unavailableBox}>
          <Text style={styles.unavailableTitle}>Unavailable items</Text>
          {payload.unavailableSummary.map((item) => (
            <Text key={item} style={styles.unavailableItem}>• {item}</Text>
          ))}
        </View>
      )}

      {payload?.lines?.map((line) => (
        <FulfillmentLine key={line.key} line={line} />
      ))}

      {backorders.map((bo) => (
        <TouchableOpacity
          key={bo.id}
          style={styles.backorderCard}
          onPress={() => onOpenBackorder?.(bo.id)}
        >
          <Text style={styles.backorderTitle}>Backorder — {bo.orderStatus}</Text>
          <Text style={styles.backorderHint}>
            Missing items will be delivered separately when available.
          </Text>
        </TouchableOpacity>
      ))}

      {isBackorder && parentOrder && (
        <Text style={styles.parentLink}>
          Backorder for order #{String(parentOrder.id).slice(0, 8)}…
        </Text>
      )}

      {order?.orderStatus === OrderStatus.BACKORDER_WAITING && (
        <Text style={styles.waitingNote}>
          Waiting for shop to confirm items are in stock. You will be notified to pay when ready.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
  },
  title: { fontSize: 14, fontWeight: '700', marginBottom: 8, color: '#92400e' },
  shopNote: { fontSize: 13, color: '#78350f', marginBottom: 8, lineHeight: 18 },
  unavailableBox: { marginBottom: 8 },
  unavailableTitle: { fontSize: 12, fontWeight: '700', color: '#b45309', marginBottom: 4 },
  unavailableItem: { fontSize: 13, color: '#78350f', lineHeight: 20 },
  line: { paddingVertical: 4 },
  lineMissing: { opacity: 0.85 },
  lineName: { fontSize: 13, fontWeight: '600', color: '#444' },
  lineMeta: { fontSize: 12, color: '#b45309' },
  backorderCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  backorderTitle: { fontSize: 13, fontWeight: '700', color: '#166534' },
  backorderHint: { fontSize: 12, color: '#166534', marginTop: 4 },
  parentLink: { fontSize: 12, color: '#666', marginTop: 8 },
  waitingNote: { fontSize: 12, color: '#78350f', marginTop: 8, lineHeight: 18 },
});
