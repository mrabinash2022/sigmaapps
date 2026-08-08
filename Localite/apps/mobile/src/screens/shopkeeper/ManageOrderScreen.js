import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';
import { OrderStatus, PaymentMethod, PaymentStatus, formatOrderItemsSummary, getCatalogEstimatedTotal, parseCatalogPayload } from '@localite/shared';
import ScreenLayout from '../../components/ScreenLayout';
import { OrderSupportButton } from '../../components/OrderSupportButton';
import CatalogOrderItems from '../../components/CatalogOrderItems';
import OrderFulfillmentPanel from '../../components/OrderFulfillmentPanel';
import FulfillmentSummary from '../../components/FulfillmentSummary';

const TIME_SLOTS = ['Within 1 hour', '2–4 PM', '4–6 PM', '6–8 PM'];

const REJECTION_REASONS = [
  'Store is closed',
  'Technical / system issues',
  'Unable to source items',
  'Staff unavailable',
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

const PAYMENT_STATUS_COLORS = {
  [PaymentStatus.PENDING]: '#f59e0b',
  [PaymentStatus.PAID]: '#22c55e',
  [PaymentStatus.FAILED]: '#ef4444',
  [PaymentStatus.NOT_REQUIRED]: '#3b82f6',
  [PaymentStatus.REFUND_PENDING]: '#dc2626',
  [PaymentStatus.REFUNDED]: '#6b7280',
};

function canShipOrder(order) {
  if (!order.paymentMethod) return false;
  if (order.paymentMethod === PaymentMethod.UPI_INSTANT) {
    return order.paymentStatus === PaymentStatus.PAID;
  }
  return true;
}

export default function ManageOrderScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [amount, setAmount] = useState('');
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[1]);
  const [rejectReason, setRejectReason] = useState(REJECTION_REASONS[0]);
  const [customRejectReason, setCustomRejectReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [fulfillmentData, setFulfillmentData] = useState(null);

  const load = () => {
    setLoading(true);
    api.getOrder(orderId)
      .then(({ order: o }) => {
        setOrder(o);
        const catalog = parseCatalogPayload(o);
        const estimate = getCatalogEstimatedTotal(catalog);
        if (estimate != null && !o.finalBillAmount) setAmount(String(estimate));
        else if (o.finalBillAmount) setAmount(String(o.finalBillAmount));
        if (o.deliveryTimeWindow) setTimeSlot(o.deliveryTimeWindow);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useFocusEffect(useCallback(() => { load(); }, [orderId]));

  const accept = async () => {
    if (!amount || Number(amount) <= 0) {
      Alert.alert('Error', 'Enter a valid amount');
      return;
    }
    if (fulfillmentData?.hasUnavailable && !fulfillmentData?.shopNote?.trim()) {
      const missingReason = fulfillmentData.lines?.some(
        (l) => (l.status === 'unavailable' || l.status === 'partial') && !l.unavailableReason,
      );
      if (missingReason) {
        Alert.alert('Reason required', 'Add a note or select a reason for unavailable items.');
        return;
      }
    }
    try {
      const { order: updated } = await api.acceptOrder(
        orderId,
        Number(amount),
        timeSlot,
        fulfillmentData?.hasUnavailable
          ? { lines: fulfillmentData.lines, shopNote: fulfillmentData.shopNote }
          : undefined,
        fulfillmentData?.createBackorder,
      );
      setOrder(updated);
      const msg = fulfillmentData?.hasUnavailable
        ? 'Customer notified about unavailable items'
        : 'Customer will be notified to choose payment';
      Alert.alert('Accepted', msg);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const activateBackorder = async () => {
    if (!amount || Number(amount) <= 0) {
      Alert.alert('Error', 'Enter a valid amount');
      return;
    }
    try {
      const { order: updated } = await api.markBackorderReady(orderId, Number(amount), timeSlot);
      setOrder(updated);
      Alert.alert('Backorder activated', 'Customer notified to choose payment.');
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleFulfillmentChange = useCallback((data) => {
    setFulfillmentData(data);
    if (data.suggestedAmount != null) {
      setAmount(String(Math.round(data.suggestedAmount * 100) / 100));
    }
  }, []);

  const ship = async () => {
    try {
      const { order: updated } = await api.shipOrder(orderId);
      setOrder(updated);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const reject = () => {
    const reason = rejectReason === 'Other'
      ? customRejectReason.trim()
      : rejectReason;

    if (!reason || reason.length < 3) {
      Alert.alert('Reason required', 'Please select or enter a rejection reason.');
      return;
    }

    Alert.alert(
      'Reject order?',
      'The customer will be notified immediately that you cannot fulfill this order.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              const { order: updated } = await api.rejectOrder(orderId, reason);
              setOrder(updated);
              Alert.alert('Order rejected', 'The customer has been notified.');
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ],
    );
  };

  const deliver = async () => {
    try {
      const { order: updated } = await api.deliverOrder(orderId);
      setOrder(updated);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const processRefund = () => {
    Alert.alert(
      'Process refund?',
      `Refund ₹${Number(order.finalBillAmount || 0).toFixed(2)} to ${order.customer?.name}? The customer will be notified.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Refund',
          onPress: async () => {
            try {
              const { order: updated } = await api.refundOrder(orderId);
              setOrder(updated);
              Alert.alert('Refund processed', 'The customer has been notified.');
            } catch (err) {
              Alert.alert('Refund failed', err.message);
            }
          },
        },
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

  const showPayment = order.orderStatus !== OrderStatus.CREATED
    && order.orderStatus !== OrderStatus.REJECTED;
  const paymentStatusColor = PAYMENT_STATUS_COLORS[order.paymentStatus] || '#999';
  const readyToShip = canShipOrder(order);

  return (
    <ScreenLayout>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
        <View style={styles.customerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.customer}>{order.customer?.name}</Text>
            <Text style={styles.phone}>{order.customer?.phone}</Text>
            <Text style={styles.address}>{order.customer?.address}</Text>
          </View>
          <OrderSupportButton orderId={orderId} />
        </View>
        <Text style={styles.status}>Status: {order.orderStatus}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order</Text>
        <CatalogOrderItems order={order} />
        {!parseCatalogPayload(order) && !formatOrderItemsSummary(order) && (
          <Text style={styles.body}>{order.textPayload || '(Image order — check uploads)'}</Text>
        )}
        <FulfillmentSummary order={order} onOpenBackorder={(id) => navigation.push('ManageOrder', { orderId: id })} />
      </View>

      {showPayment && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment</Text>
          {order.finalBillAmount != null && (
            <Text style={styles.amount}>₹{Number(order.finalBillAmount).toFixed(2)}</Text>
          )}
          <Text style={styles.body}>
            Method: {order.paymentMethod
              ? PAYMENT_METHOD_LABELS[order.paymentMethod]
              : 'Not selected yet'}
          </Text>
          <View style={styles.paymentRow}>
            <Text style={styles.body}>Status:</Text>
            <View style={[styles.paymentBadge, { backgroundColor: paymentStatusColor }]}>
              <Text style={styles.paymentBadgeText}>
                {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus || '—'}
              </Text>
            </View>
          </View>
          {order.orderStatus === OrderStatus.ACCEPTED
            && order.paymentMethod === PaymentMethod.UPI_INSTANT
            && order.paymentStatus === PaymentStatus.PENDING && (
            <Text style={styles.paymentHint}>
              Waiting for customer to complete UPI payment before you can ship.
            </Text>
          )}
          {order.orderStatus === OrderStatus.ACCEPTED
            && !order.paymentMethod && (
            <Text style={styles.paymentHint}>
              Waiting for customer to choose a payment method.
            </Text>
          )}
        </View>
      )}

      {order.orderStatus === OrderStatus.CREATED && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accept & set delivery</Text>
          <OrderFulfillmentPanel order={order} onChange={handleFulfillmentChange} />
          <TextInput
            style={styles.input}
            placeholder="Total amount (₹)"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
          <Text style={styles.label}>Delivery window</Text>
          {TIME_SLOTS.map((slot) => (
            <TouchableOpacity
              key={slot}
              style={[styles.slotBtn, timeSlot === slot && styles.slotActive]}
              onPress={() => setTimeSlot(slot)}
            >
              <Text style={timeSlot === slot ? styles.slotTextActive : styles.slotText}>{slot}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.btn} onPress={accept}>
            <Text style={styles.btnText}>Accept Order</Text>
          </TouchableOpacity>

          <View style={styles.rejectDivider} />
          <Text style={styles.sectionTitle}>Cannot fulfill?</Text>
          <Text style={styles.rejectHint}>
            Reject if the store is closed or facing issues. The customer is notified immediately.
          </Text>
          <Text style={styles.label}>Reason</Text>
          {[...REJECTION_REASONS, 'Other'].map((reason) => (
            <TouchableOpacity
              key={reason}
              style={[styles.slotBtn, rejectReason === reason && styles.rejectSlotActive]}
              onPress={() => setRejectReason(reason)}
            >
              <Text style={rejectReason === reason ? styles.rejectSlotTextActive : styles.slotText}>
                {reason}
              </Text>
            </TouchableOpacity>
          ))}
          {rejectReason === 'Other' && (
            <TextInput
              style={styles.input}
              placeholder="Describe the issue"
              value={customRejectReason}
              onChangeText={setCustomRejectReason}
              multiline
            />
          )}
          <TouchableOpacity style={styles.rejectBtn} onPress={reject}>
            <Text style={styles.btnText}>Reject Order</Text>
          </TouchableOpacity>
        </View>
      )}

      {order.orderStatus === OrderStatus.BACKORDER_WAITING && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Backorder — items now available?</Text>
          <Text style={styles.rejectHint}>
            When stock arrives, set the amount and delivery window. The customer will be notified to pay.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Total amount (₹)"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
          <Text style={styles.label}>Delivery window</Text>
          {TIME_SLOTS.map((slot) => (
            <TouchableOpacity
              key={slot}
              style={[styles.slotBtn, timeSlot === slot && styles.slotActive]}
              onPress={() => setTimeSlot(slot)}
            >
              <Text style={timeSlot === slot ? styles.slotTextActive : styles.slotText}>{slot}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.btn} onPress={activateBackorder}>
            <Text style={styles.btnText}>Activate backorder & notify customer</Text>
          </TouchableOpacity>

          <View style={styles.rejectDivider} />
          <Text style={styles.sectionTitle}>Cannot fulfill backorder?</Text>
          <Text style={styles.rejectHint}>
            Reject if items will not be available. The customer will be notified.
          </Text>
          <TouchableOpacity style={styles.rejectBtn} onPress={reject}>
            <Text style={styles.btnText}>Reject backorder</Text>
          </TouchableOpacity>
        </View>
      )}

      {order.orderStatus === OrderStatus.REJECTED && (
        <View style={[styles.section, styles.rejectedBox]}>
          <Text style={styles.sectionTitle}>Order rejected</Text>
          <Text style={styles.body}>
            {order.rejectionReason || 'This order was rejected and the customer was notified.'}
          </Text>
        </View>
      )}

      {order.orderStatus === OrderStatus.ACCEPTED && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fulfillment</Text>
          {readyToShip ? (
            <TouchableOpacity style={styles.btn} onPress={ship}>
              <Text style={styles.btnText}>Mark as Shipped</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.paymentHint}>
              Ship becomes available once payment is confirmed.
            </Text>
          )}
        </View>
      )}

      {order.orderStatus === OrderStatus.SHIPPED && (
        <TouchableOpacity style={styles.btn} onPress={deliver}>
          <Text style={styles.btnText}>Mark as Delivered</Text>
        </TouchableOpacity>
      )}

      {order.orderStatus === OrderStatus.RETURNED && (
        <View style={[styles.section, styles.returnedBox]}>
          <Text style={styles.sectionTitle}>Order returned</Text>
          <Text style={styles.body}>
            {order.returnReason || 'Customer returned this order.'}
          </Text>
          {order.paymentStatus === PaymentStatus.REFUND_PENDING && (
            <>
              <Text style={styles.paymentHint}>
                Payment was collected — refund ₹{Number(order.finalBillAmount || 0).toFixed(2)} to the customer.
              </Text>
              <TouchableOpacity style={styles.refundBtn} onPress={processRefund}>
                <Text style={styles.btnText}>Process refund to customer</Text>
              </TouchableOpacity>
            </>
          )}
          {order.paymentStatus === PaymentStatus.REFUNDED && (
            <Text style={styles.refundDone}>
              Refund completed{order.razorpayRefundId ? ` (${order.razorpayRefundId})` : ''}.
            </Text>
          )}
        </View>
      )}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  customerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  customer: { fontSize: 20, fontWeight: '700' },
  phone: { fontSize: 14, color: '#666' },
  address: { fontSize: 13, color: '#888', marginBottom: 8 },
  status: { fontSize: 14, color: '#1a7f4b', fontWeight: '600', marginBottom: 16 },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#eee' },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  body: { fontSize: 15, color: '#444', lineHeight: 22 },
  amount: { fontSize: 22, fontWeight: '800', color: '#1a7f4b', marginBottom: 8 },
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  paymentBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  paymentBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  paymentHint: { fontSize: 13, color: '#666', marginTop: 10, lineHeight: 18 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, marginBottom: 12, backgroundColor: '#fafafa' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  slotBtn: { padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 6 },
  slotActive: { borderColor: '#1a7f4b', backgroundColor: '#e8f5ee' },
  slotText: { color: '#666' },
  slotTextActive: { color: '#1a7f4b', fontWeight: '700' },
  btn: { backgroundColor: '#1a7f4b', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '700' },
  rejectDivider: { height: 1, backgroundColor: '#eee', marginVertical: 20 },
  rejectHint: { fontSize: 13, color: '#666', marginBottom: 10, lineHeight: 18 },
  rejectSlotActive: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  rejectSlotTextActive: { color: '#ef4444', fontWeight: '700' },
  rejectBtn: { backgroundColor: '#ef4444', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  rejectedBox: { borderColor: '#fecaca', backgroundColor: '#fef2f2' },
  returnedBox: { borderColor: '#fecaca', backgroundColor: '#fff7ed' },
  refundBtn: { backgroundColor: '#dc2626', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  refundDone: { fontSize: 14, color: '#166534', fontWeight: '600', marginTop: 10 },
});
