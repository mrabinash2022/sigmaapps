import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  hasOrderItemsList,
  canReorderOrder,
  isDeliveredOrder,
  getOrderStatus,
  canCustomerCancelOrder,
} from '@localite/shared';
import ScreenLayout from '../../components/ScreenLayout';
import { OrderSupportButton } from '../../components/OrderSupportButton';
import CatalogOrderItems from '../../components/CatalogOrderItems';
import FulfillmentSummary from '../../components/FulfillmentSummary';
import { useOrderPolling } from '../../hooks/useOrderPolling';

const CANCEL_REASONS = [
  'Ordered by mistake',
  'Found items elsewhere',
  'Taking too long',
  'Changed my mind',
];

const RETURN_REASONS = [
  'Wrong items received',
  'Damaged or spoiled products',
  'Quality not acceptable',
  'Ordered by mistake',
  'Other issue',
];

const STEPS = [OrderStatus.CREATED, OrderStatus.ACCEPTED, OrderStatus.SHIPPED, OrderStatus.DELIVERED];

export default function OrderDetailScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    api.getOrder(orderId, { force: silent })
      .then(({ order: o }) => setOrder(o))
      .catch(console.error)
      .finally(() => { if (!silent) setLoading(false); });
  }, [orderId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useOrderPolling(order, load);

  const selectPayment = async (method) => {
    try {
      const { order: updated } = await api.selectPayment(orderId, method);
      setOrder(updated);
      if (method === PaymentMethod.UPI_INSTANT) {
        try {
          await api.createRazorpayOrder(orderId);
          Alert.alert(
            'Razorpay',
            'Razorpay checkout would open here. In dev mode, using mock payment.',
            [{
              text: 'Pay (Mock)',
              onPress: async () => {
                const { order: paid } = await api.payOrderMock(orderId);
                setOrder(paid);
              },
            }],
          );
        } catch {
          const { order: paid } = await api.payOrderMock(orderId);
          setOrder(paid);
          Alert.alert('Payment done', 'UPI payment completed (dev mock)');
        }
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const markDelivered = async () => {
    try {
      const { order: updated } = await api.deliverOrder(orderId);
      setOrder(updated);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const confirmReturn = (reason) => {
    const paidNote = order?.paymentStatus === PaymentStatus.PAID
      ? ' You have already paid — the shop will process your refund.'
      : '';

    Alert.alert(
      'Confirm return?',
      `Return this order to ${order?.shop?.name}?${paidNote}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Return order',
          style: 'destructive',
          onPress: async () => {
            try {
              const { order: updated } = await api.returnOrder(orderId, reason);
              setOrder(updated);
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

  const requestReturn = () => {
    Alert.alert(
      'Return order',
      'Select a reason',
      [
        ...RETURN_REASONS.map((reason) => ({
          text: reason,
          onPress: () => confirmReturn(reason),
        })),
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const confirmCancel = (reason) => {
    Alert.alert(
      'Cancel order?',
      'The shop will be notified that you no longer need this order.',
      [
        { text: 'Keep order', style: 'cancel' },
        {
          text: 'Cancel order',
          style: 'destructive',
          onPress: async () => {
            try {
              const { order: updated } = await api.cancelOrder(orderId, reason);
              setOrder(updated);
              Alert.alert('Order cancelled', 'Your order has been cancelled.');
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ],
    );
  };

  const requestCancel = () => {
    Alert.alert(
      'Cancel order',
      'Why are you cancelling?',
      [
        ...CANCEL_REASONS.map((reason) => ({
          text: reason,
          onPress: () => confirmCancel(reason),
        })),
        { text: 'Close', style: 'cancel' },
      ],
    );
  };

  if (loading || !order) {
    return (
      <ScreenLayout>
        <View style={styles.center}><ActivityIndicator size="large" color="#1a7f4b" /></View>
      </ScreenLayout>
    );
  }

  const orderStatus = getOrderStatus(order);
  const isRejected = orderStatus === OrderStatus.REJECTED;
  const isCancelled = orderStatus === OrderStatus.CANCELLED;
  const isReturned = orderStatus === OrderStatus.RETURNED;
  const isBackorderWaiting = orderStatus === OrderStatus.BACKORDER_WAITING;
  const currentIdx = (isRejected || isReturned || isBackorderWaiting || isCancelled) ? -1 : STEPS.indexOf(orderStatus);
  const showCancel = canCustomerCancelOrder(order);

  return (
    <ScreenLayout>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.shop}>{order.shop?.name}</Text>
            <Text style={[styles.status, (isRejected || isReturned) && styles.statusRejected]}>
              Status: {orderStatus}
            </Text>
          </View>
          <OrderSupportButton orderId={orderId} />
        </View>

        {isRejected ? (
          <View style={styles.rejectedBanner}>
            <Text style={styles.rejectedTitle}>Order rejected by shop</Text>
            <Text style={styles.rejectedBody}>
              {order.rejectionReason || 'The shop could not accept your order. You may place a new order or contact support.'}
            </Text>
          </View>
        ) : isCancelled ? (
          <View style={styles.rejectedBanner}>
            <Text style={styles.rejectedTitle}>Order cancelled</Text>
            <Text style={styles.rejectedBody}>
              {order.cancellationReason || 'You cancelled this order.'}
            </Text>
          </View>
        ) : isReturned ? (
          <View style={styles.rejectedBanner}>
            <Text style={styles.rejectedTitle}>Order returned</Text>
            <Text style={styles.rejectedBody}>
              {order.returnReason || 'You returned this order.'}
              {order.paymentStatus === PaymentStatus.REFUND_PENDING
                ? ' The shop will process your refund shortly.'
                : order.paymentStatus === PaymentStatus.REFUNDED
                  ? ' Your refund has been processed.'
                  : ''}
            </Text>
          </View>
        ) : isBackorderWaiting ? (
          <View style={styles.backorderBanner}>
            <Text style={styles.backorderTitle}>Backorder — waiting for stock</Text>
            <Text style={styles.backorderBody}>
              The shop is sourcing your missing items. You will be notified when they are ready to deliver.
            </Text>
          </View>
        ) : (
          <View style={styles.timeline}>
            {STEPS.map((step, i) => (
              <View key={step} style={styles.step}>
                <View style={[styles.dot, i <= currentIdx && styles.dotActive]} />
                <Text style={[styles.stepLabel, i <= currentIdx && styles.stepLabelActive]}>{step}</Text>
              </View>
            ))}
          </View>
        )}

        <FulfillmentSummary
          order={order}
          onOpenBackorder={(id) => navigation.push('OrderDetail', { orderId: id })}
        />

        {hasOrderItemsList(order) ? (
          <View style={styles.section}>
            <CatalogOrderItems order={order} />
          </View>
        ) : order.textPayload ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your list</Text>
            <Text style={styles.body}>{order.textPayload}</Text>
          </View>
        ) : null}

        {order.finalBillAmount && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bill amount</Text>
            <Text style={styles.amount}>₹{Number(order.finalBillAmount).toFixed(2)}</Text>
            {order.deliveryTimeWindow && (
              <Text style={styles.body}>Delivery: {order.deliveryTimeWindow}</Text>
            )}
          </View>
        )}

        {(order.paymentMethod || order.paymentStatus) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment details</Text>
            <Text style={styles.body}>
              Method: {order.paymentMethod === PaymentMethod.UPI_INSTANT ? 'UPI / Payment gateway' : order.paymentMethod === PaymentMethod.CASH_ON_DELIVERY ? 'Cash on delivery' : 'Not selected'}
            </Text>
            <Text style={styles.body}>Status: {order.paymentStatus || '—'}</Text>
            {order.razorpayPaymentId && (
              <Text style={styles.body}>Transaction: {order.razorpayPaymentId}</Text>
            )}
          </View>
        )}

        {showCancel && (
          <TouchableOpacity style={[styles.btn, styles.btnDangerOutline]} onPress={requestCancel}>
            <Text style={styles.btnDangerText}>Cancel order</Text>
          </TouchableOpacity>
        )}

        {order.orderStatus === OrderStatus.ACCEPTED && !order.paymentMethod && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose payment</Text>
            <TouchableOpacity style={styles.btn} onPress={() => selectPayment(PaymentMethod.UPI_INSTANT)}>
              <Text style={styles.btnText}>Pay now (UPI / gateway)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => selectPayment(PaymentMethod.CASH_ON_DELIVERY)}>
              <Text style={[styles.btnText, styles.btnOutlineText]}>Cash on delivery (COD)</Text>
            </TouchableOpacity>
          </View>
        )}

        {order.orderStatus === OrderStatus.SHIPPED && (
          <>
            <TouchableOpacity style={styles.btn} onPress={markDelivered}>
              <Text style={styles.btnText}>Received at door</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={requestReturn}>
              <Text style={[styles.btnText, styles.btnOutlineText]}>Return order</Text>
            </TouchableOpacity>
          </>
        )}

        {isDeliveredOrder(order) && (
          <>
            <TouchableOpacity
              style={styles.btn}
              onPress={() => {
                if (!canReorderOrder(order)) {
                  Alert.alert('Cannot reorder', 'This order has no items to reorder.');
                  return;
                }
                navigation.navigate('ReorderConfirm', { orderId });
              }}
            >
              <Text style={styles.btnText}>Reorder same items</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={requestReturn}>
              <Text style={[styles.btnText, styles.btnOutlineText]}>Return order</Text>
            </TouchableOpacity>
          </>
        )}

        {order.events?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Timeline</Text>
            {order.events.map((e) => (
              <Text key={e.id} style={styles.event}>
                {e.toStatus}: {e.note}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  shop: { fontSize: 22, fontWeight: '700' },
  status: { fontSize: 14, color: '#666', marginTop: 4 },
  timeline: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  step: { alignItems: 'center', flex: 1 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#ddd', marginBottom: 4 },
  dotActive: { backgroundColor: '#1a7f4b' },
  stepLabel: { fontSize: 10, color: '#aaa', textAlign: 'center' },
  stepLabelActive: { color: '#1a7f4b', fontWeight: '600' },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#eee' },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8, color: '#333' },
  body: { fontSize: 15, color: '#444', lineHeight: 22 },
  amount: { fontSize: 24, fontWeight: '800', color: '#1a7f4b' },
  btn: { backgroundColor: '#1a7f4b', padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 8 },
  btnText: { color: '#fff', fontWeight: '700' },
  btnOutline: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#1a7f4b' },
  btnOutlineText: { color: '#1a7f4b' },
  btnDangerOutline: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ef4444', marginBottom: 16 },
  btnDangerText: { color: '#ef4444', fontWeight: '700' },
  event: { fontSize: 12, color: '#666', marginBottom: 4 },
  statusRejected: { color: '#ef4444', fontWeight: '600' },
  rejectedBanner: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  rejectedTitle: { fontSize: 16, fontWeight: '700', color: '#b91c1c', marginBottom: 6 },
  rejectedBody: { fontSize: 14, color: '#7f1d1d', lineHeight: 20 },
  backorderBanner: {
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  backorderTitle: { fontSize: 16, fontWeight: '700', color: '#c2410c', marginBottom: 6 },
  backorderBody: { fontSize: 14, color: '#9a3412', lineHeight: 20 },
});
