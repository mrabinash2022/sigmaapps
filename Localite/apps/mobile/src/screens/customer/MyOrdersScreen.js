import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  formatOrderItemsSummary,
  getCatalogEstimatedTotal,
  parseCatalogPayload,
  canReorderOrder,
  isDeliveredOrder,
} from '@localite/shared';
import { useTheme } from '../../context/ThemeContext';
import ScreenLayout from '../../components/ScreenLayout';
import { OrderSupportButton } from '../../components/OrderSupportButton';

const STATUS_COLORS = {
  [OrderStatus.CREATED]: '#f59e0b',
  [OrderStatus.ACCEPTED]: '#3b82f6',
  [OrderStatus.SHIPPED]: '#8b5cf6',
  [OrderStatus.DELIVERED]: '#22c55e',
  [OrderStatus.REJECTED]: '#ef4444',
  [OrderStatus.RETURNED]: '#dc2626',
};

const RETURN_REASONS = [
  'Wrong items received',
  'Damaged or spoiled products',
  'Quality not acceptable',
  'Ordered by mistake',
  'Other issue',
];

const PAYMENT_METHOD_LABELS = {
  [PaymentMethod.UPI_INSTANT]: 'UPI / Payment gateway',
  [PaymentMethod.CASH_ON_DELIVERY]: 'Cash on delivery',
};

const PAYMENT_STATUS_LABELS = {
  [PaymentStatus.PENDING]: 'Payment pending',
  [PaymentStatus.PAID]: 'Paid',
  [PaymentStatus.FAILED]: 'Payment failed',
  [PaymentStatus.NOT_REQUIRED]: 'Pay on delivery',
  [PaymentStatus.REFUND_PENDING]: 'Refund pending',
  [PaymentStatus.REFUNDED]: 'Refunded',
};

function formatAmount(amount) {
  if (amount == null || amount === '') return null;
  const n = Number(amount);
  return Number.isFinite(n) ? `₹${n.toFixed(2)}` : null;
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString();
}

export default function MyOrdersScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState(null);

  const load = (force = false) => {
    setLoading(true);
    api.getMyOrders({ force })
      .then(({ orders: o }) => setOrders(o || []))
      .catch((err) => Alert.alert('Error', err.message || 'Could not load orders'))
      .finally(() => setLoading(false));
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const updateOrderInList = (updated) => {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)));
  };

  const selectPayment = async (order, method) => {
    setPayingId(order.id);
    try {
      const { order: updated } = await api.selectPayment(order.id, method);
      updateOrderInList(updated);

      if (method === PaymentMethod.UPI_INSTANT) {
        try {
          await api.createRazorpayOrder(order.id);
          Alert.alert(
            'Complete payment',
            'Razorpay checkout would open here. In dev mode, use mock payment.',
            [{
              text: 'Pay now (mock)',
              onPress: async () => {
                try {
                  const { order: paid } = await api.payOrderMock(order.id);
                  updateOrderInList(paid);
                  Alert.alert('Payment done', 'Your UPI payment was successful.');
                } catch (err) {
                  Alert.alert('Payment failed', err.message);
                }
              },
            }],
          );
        } catch {
          const { order: paid } = await api.payOrderMock(order.id);
          updateOrderInList(paid);
          Alert.alert('Payment done', 'UPI payment completed (dev mock).');
        }
      } else {
        Alert.alert('COD selected', 'You will pay in cash when the order is delivered.');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setPayingId(null);
    }
  };

  const completeUpiPayment = async (order) => {
    setPayingId(order.id);
    try {
      try {
        await api.createRazorpayOrder(order.id);
      } catch {
        // Razorpay may be disabled in dev — mock pay below
      }
      const { order: paid } = await api.payOrderMock(order.id);
      updateOrderInList(paid);
      Alert.alert('Payment done', 'Your UPI payment was successful.');
    } catch (err) {
      Alert.alert('Payment failed', err.message);
    } finally {
      setPayingId(null);
    }
  };

  const markDelivered = async (order) => {
    try {
      const { order: updated } = await api.deliverOrder(order.id);
      updateOrderInList(updated);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const requestReturn = (order) => {
    Alert.alert(
      'Return order',
      'Select a reason',
      [
        ...RETURN_REASONS.map((reason) => ({
          text: reason,
          onPress: () => confirmReturn(order, reason),
        })),
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const handleReorder = (order) => {
    if (!canReorderOrder(order)) {
      Alert.alert('Cannot reorder', 'This order has no items to reorder.');
      return;
    }
    navigation.navigate('ReorderConfirm', { orderId: order.id });
  };

  const confirmReturn = (order, reason) => {
    const paidNote = order.paymentStatus === PaymentStatus.PAID
      ? ' You have already paid — the shop will process your refund.'
      : '';

    Alert.alert(
      'Confirm return?',
      `Return this order to ${order.shop?.name}?${paidNote}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Return order',
          style: 'destructive',
          onPress: async () => {
            try {
              const { order: updated } = await api.returnOrder(order.id, reason);
              updateOrderInList(updated);
              Alert.alert(
                'Return submitted',
                updated.paymentStatus === PaymentStatus.REFUND_PENDING
                  ? 'The shop has been notified and will process your refund.'
                  : 'The shop has been notified of your return.',
              );
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ],
    );
  };

  const renderItems = (order) => {
    const summary = formatOrderItemsSummary(order);
    if (summary) return summary;
    if (order.textPayload?.trim()) return order.textPayload.trim();
    if (order.imagePayloadUrl) return 'Handwritten list (photo)';
    return 'No item details';
  };

  const renderPaymentSection = (order) => {
    if (order.orderStatus === OrderStatus.REJECTED || order.orderStatus === OrderStatus.RETURNED) {
      return null;
    }

    const isPaying = payingId === order.id;

    if (order.orderStatus === OrderStatus.ACCEPTED && !order.paymentMethod) {
      return (
        <View style={styles.paymentBox}>
          <Text style={styles.paymentTitle}>Choose payment method</Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => selectPayment(order, PaymentMethod.UPI_INSTANT)}
            disabled={isPaying}
          >
            {isPaying ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Pay now (UPI / gateway)</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnOutline]}
            onPress={() => selectPayment(order, PaymentMethod.CASH_ON_DELIVERY)}
            disabled={isPaying}
          >
            <Text style={[styles.btnText, styles.btnOutlineText]}>Cash on delivery (COD)</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (
      order.paymentMethod === PaymentMethod.UPI_INSTANT
      && order.paymentStatus === PaymentStatus.PENDING
      && order.orderStatus !== OrderStatus.DELIVERED
    ) {
      return (
        <View style={styles.paymentBox}>
          <Text style={styles.paymentHint}>UPI payment not completed yet.</Text>
          <TouchableOpacity style={styles.btn} onPress={() => completeUpiPayment(order)} disabled={isPaying}>
            {isPaying ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Complete UPI payment</Text>}
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  const renderOrderCard = ({ item: order }) => {
    const amountLabel = formatAmount(order.finalBillAmount);
    const statusColor = STATUS_COLORS[order.orderStatus] || '#999';

    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.shopBlock}>
            <Text style={styles.shop}>{order.shop?.name || 'Store'}</Text>
            {order.shop?.category ? (
              <Text style={styles.category}>{order.shop.category}</Text>
            ) : null}
          </View>
          <View style={[styles.status, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{order.orderStatus}</Text>
          </View>
          <OrderSupportButton orderId={order.id} compact />
        </View>

        <Text style={styles.date}>{formatDate(order.createdAt)}</Text>

        <View style={styles.section}>
          <Text style={styles.label}>Items</Text>
          <Text style={styles.body}>{renderItems(order)}</Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaBlock}>
            <Text style={styles.label}>Amount</Text>
            <Text style={styles.amount}>{amountLabel || (getCatalogEstimatedTotal(parseCatalogPayload(order)) != null ? `Est. ${formatAmount(getCatalogEstimatedTotal(parseCatalogPayload(order)))}` : 'Awaiting shop quote')}</Text>
          </View>
          {order.deliveryTimeWindow ? (
            <View style={styles.metaBlock}>
              <Text style={styles.label}>Delivery</Text>
              <Text style={styles.body}>{order.deliveryTimeWindow}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Payment</Text>
          {order.orderStatus === OrderStatus.REJECTED ? (
            <Text style={styles.rejectedText}>
              This order was rejected by the shop.
              {order.rejectionReason ? ` Reason: ${order.rejectionReason}` : ''}
            </Text>
          ) : order.orderStatus === OrderStatus.RETURNED ? (
            <Text style={styles.rejectedText}>
              Returned{order.returnReason ? `: ${order.returnReason}` : ''}.
              {order.paymentStatus === PaymentStatus.REFUND_PENDING
                ? ' Refund is being processed by the shop.'
                : order.paymentStatus === PaymentStatus.REFUNDED
                  ? ' Refund completed.'
                  : ''}
            </Text>
          ) : (
            <>
              <Text style={styles.body}>
                Method: {order.paymentMethod ? PAYMENT_METHOD_LABELS[order.paymentMethod] : 'Not selected'}
              </Text>
              <Text style={styles.body}>
                Status: {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus || '—'}
              </Text>
            </>
          )}
        </View>

        {renderPaymentSection(order)}

        {order.orderStatus === OrderStatus.SHIPPED && (
          <>
            <TouchableOpacity style={styles.btn} onPress={() => markDelivered(order)}>
              <Text style={styles.btnText}>Mark as received</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => requestReturn(order)}>
              <Text style={[styles.btnText, styles.btnOutlineText]}>Return order</Text>
            </TouchableOpacity>
          </>
        )}

        {isDeliveredOrder(order) && (
          <>
            <TouchableOpacity style={styles.btn} onPress={() => handleReorder(order)}>
              <Text style={styles.btnText}>Reorder</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => requestReturn(order)}>
              <Text style={[styles.btnText, styles.btnOutlineText]}>Return order</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={styles.linkBtn}
          onPress={() => navigation.navigate('OrderDetail', { orderId: order.id })}
        >
          <Text style={styles.linkText}>View full timeline & message shop</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading && !orders.length) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <ScreenLayout>
      <FlatList
        testID="my-orders-screen"
        style={styles.list}
      data={orders}
      keyExtractor={(item) => item.id}
      refreshControl={(
        <RefreshControl
          refreshing={loading}
          onRefresh={() => load(true)}
          tintColor={colors.brand}
          colors={[colors.brand]}
        />
      )}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.heading}>Your orders</Text>
          <Text style={styles.sub}>
            Track items, amounts, status, and pay via UPI or choose cash on delivery after the shop accepts your order.
          </Text>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>No orders yet. Browse stores and place your first order.</Text>
      }
      renderItem={renderOrderCard}
      />
    </ScreenLayout>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    list: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    header: { marginBottom: 8 },
    heading: { fontSize: 20, fontWeight: '700', marginBottom: 6, color: colors.text },
    sub: { fontSize: 14, color: colors.textSecondary, marginBottom: 12, lineHeight: 20 },
    empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40, lineHeight: 22 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
    shopBlock: { flex: 1 },
    shop: { fontSize: 17, fontWeight: '700', color: colors.text },
    category: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    status: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    date: { fontSize: 12, color: colors.textMuted, marginTop: 6, marginBottom: 10 },
    section: { marginTop: 10 },
    label: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 4, textTransform: 'uppercase' },
    body: { fontSize: 14, color: colors.text, lineHeight: 20 },
    metaRow: { flexDirection: 'row', gap: 16, marginTop: 10 },
    metaBlock: { flex: 1 },
    amount: { fontSize: 20, fontWeight: '800', color: colors.brand },
    paymentBox: {
      marginTop: 14,
      padding: 12,
      backgroundColor: colors.accentSurface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.brandBorder,
    },
    paymentTitle: { fontSize: 14, fontWeight: '700', color: colors.brand, marginBottom: 10 },
    paymentHint: { fontSize: 13, color: colors.textSecondary, marginBottom: 8 },
    btn: {
      backgroundColor: colors.brandDark,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 8,
    },
    btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    btnOutline: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.brand },
    btnOutlineText: { color: colors.brand },
    linkBtn: { marginTop: 12, alignItems: 'center', padding: 8 },
    linkText: { color: colors.brand, fontWeight: '600', fontSize: 13 },
    rejectedText: { fontSize: 14, color: '#f87171', lineHeight: 20 },
  });
}
