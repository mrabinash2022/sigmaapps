import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from 'react-native';
import {
  buildFulfillmentLinesFromOrder,
  computeCatalogFulfillmentTotal,
  FulfillmentLineStatus,
  normalizeFulfillmentInput,
  getUnavailableLines,
} from '@localite/shared';

const UNAVAILABLE_REASONS = [
  'Out of stock',
  'Seasonal unavailability',
  'Quality not acceptable',
  'Supplier delay',
];

function LineRow({ line, onChange }) {
  const isCatalog = line.kind === 'catalog';
  const isUnavailable = line.status === FulfillmentLineStatus.UNAVAILABLE;
  const isPartial = line.status === FulfillmentLineStatus.PARTIAL;

  const toggleUnavailable = () => {
    if (isUnavailable) {
      onChange({
        ...line,
        quantityFulfilled: line.quantityRequested,
        status: FulfillmentLineStatus.FULFILLED,
        unavailableReason: null,
      });
      return;
    }
    onChange({
      ...line,
      quantityFulfilled: 0,
      status: FulfillmentLineStatus.UNAVAILABLE,
    });
  };

  const setFulfilledQty = (qty) => {
    const quantityFulfilled = Math.max(0, Math.min(Number(qty) || 0, line.quantityRequested));
    let status = FulfillmentLineStatus.FULFILLED;
    if (quantityFulfilled === 0) status = FulfillmentLineStatus.UNAVAILABLE;
    else if (quantityFulfilled < line.quantityRequested) status = FulfillmentLineStatus.PARTIAL;
    onChange({ ...line, quantityFulfilled, status });
  };

  return (
    <View style={[styles.lineCard, (isUnavailable || isPartial) && styles.lineCardWarn]}>
      <View style={styles.lineHeader}>
        <Text style={styles.lineName}>{line.name}</Text>
        <TouchableOpacity
          style={[styles.availBtn, isUnavailable && styles.availBtnOff]}
          onPress={toggleUnavailable}
        >
          <Text style={styles.availBtnText}>
            {isUnavailable ? 'Unavailable' : 'Available'}
          </Text>
        </TouchableOpacity>
      </View>

      {isCatalog && !isUnavailable && (
        <View style={styles.qtyRow}>
          <Text style={styles.qtyLabel}>
            Fulfilling {line.quantityFulfilled} of {line.quantityRequested}
          </Text>
          <View style={styles.qtyControls}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => setFulfilledQty(line.quantityFulfilled - 1)}
            >
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qtyValue}>{line.quantityFulfilled}</Text>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => setFulfilledQty(line.quantityFulfilled + 1)}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {(isUnavailable || isPartial) && (
        <View style={styles.reasonBlock}>
          <Text style={styles.reasonLabel}>Reason</Text>
          <View style={styles.reasonChips}>
            {UNAVAILABLE_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason}
                style={[
                  styles.reasonChip,
                  line.unavailableReason === reason && styles.reasonChipActive,
                ]}
                onPress={() => onChange({ ...line, unavailableReason: reason })}
              >
                <Text
                  style={[
                    styles.reasonChipText,
                    line.unavailableReason === reason && styles.reasonChipTextActive,
                  ]}
                >
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

export default function OrderFulfillmentPanel({ order, onChange }) {
  const [lines, setLines] = useState([]);
  const [shopNote, setShopNote] = useState('');
  const [createBackorder, setCreateBackorder] = useState(true);

  useEffect(() => {
    const { lines: initial } = buildFulfillmentLinesFromOrder(order);
    setLines(initial);
    setShopNote('');
    setCreateBackorder(true);
  }, [order?.id]);

  const normalized = useMemo(() => normalizeFulfillmentInput(lines), [lines]);
  const unavailable = useMemo(() => getUnavailableLines(normalized), [normalized]);
  const catalogSubtotal = useMemo(() => computeCatalogFulfillmentTotal(normalized), [normalized]);
  const hasUnavailable = unavailable.length > 0;

  useEffect(() => {
    onChange?.({
      lines: normalized,
      shopNote,
      createBackorder: hasUnavailable && createBackorder,
      suggestedAmount: catalogSubtotal > 0 ? catalogSubtotal : null,
      hasUnavailable,
    });
  }, [normalized, shopNote, createBackorder, catalogSubtotal, hasUnavailable, onChange]);

  const updateLine = (index, updated) => {
    setLines((prev) => prev.map((l, i) => (i === index ? updated : l)));
  };

  if (!lines.length) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Item availability</Text>
      <Text style={styles.hint}>
        Mark items that are not available. The bill will reflect only fulfilled items.
      </Text>

      {lines.map((line, index) => (
        <LineRow
          key={line.key || index}
          line={normalized[index] || line}
          onChange={(updated) => updateLine(index, updated)}
        />
      ))}

      {hasUnavailable && (
        <>
          <Text style={styles.label}>Note to customer</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Explain which items are missing and why"
            value={shopNote}
            onChangeText={setShopNote}
            multiline
          />

          <View style={styles.backorderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.backorderTitle}>Auto-create backorder</Text>
              <Text style={styles.backorderHint}>
                Missing items will be placed as a separate order and delivered when available.
              </Text>
            </View>
            <Switch
              value={createBackorder}
              onValueChange={setCreateBackorder}
              trackColor={{ true: '#1a7f4b' }}
            />
          </View>
        </>
      )}

      {catalogSubtotal > 0 && (
        <Text style={styles.subtotal}>
          Catalog subtotal (fulfilled items): ₹{catalogSubtotal.toFixed(2)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  title: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  hint: { fontSize: 12, color: '#666', marginBottom: 12, lineHeight: 18 },
  lineCard: {
    backgroundColor: '#fafafa',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  lineCardWarn: { borderColor: '#fcd34d', backgroundColor: '#fffbeb' },
  lineHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lineName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#333' },
  availBtn: {
    backgroundColor: '#e8f5ee',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  availBtnOff: { backgroundColor: '#fef2f2' },
  availBtnText: { fontSize: 11, fontWeight: '700', color: '#1a7f4b' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, justifyContent: 'space-between' },
  qtyLabel: { fontSize: 12, color: '#666' },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 16, fontWeight: '700', color: '#333' },
  qtyValue: { fontSize: 14, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  reasonBlock: { marginTop: 10 },
  reasonLabel: { fontSize: 11, fontWeight: '700', color: '#888', marginBottom: 6 },
  reasonChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  reasonChip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  reasonChipActive: { borderColor: '#f59e0b', backgroundColor: '#fff7ed' },
  reasonChipText: { fontSize: 11, color: '#666' },
  reasonChipTextActive: { color: '#b45309', fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', marginTop: 8, marginBottom: 6 },
  noteInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
    minHeight: 72,
    textAlignVertical: 'top',
  },
  backorderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  backorderTitle: { fontSize: 13, fontWeight: '700', color: '#166534' },
  backorderHint: { fontSize: 11, color: '#166534', marginTop: 2, lineHeight: 16 },
  subtotal: { fontSize: 13, fontWeight: '700', color: '#1a7f4b', marginTop: 10 },
});
