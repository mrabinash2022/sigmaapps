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
import { OrderStatus, PaymentMethod, PaymentStatus } from '@localite/shared';
import ScreenLayout from '../../components/ScreenLayout';
import { OrderSupportButton } from '../../components/OrderSupportButton';

const TIME_SLOTS = ['Within 1 hour', '2–4 PM', '4–6 PM', '6–8 PM'];

const PAYMENT_METHOD_LABELS = {
  [PaymentMethod.UPI_INSTANT]: 'UPI / Payment gateway',
  [PaymentMethod.CASH_ON_DELIVERY]: 'Cash on delivery',
};

const PAYMENT_STATUS_LABELS = {
  [PaymentStatus.PENDING]: 'Payment pending',
  [PaymentStatus.PAID]: 'Paid',
  [PaymentStatus.FAILED]: 'Payment failed',
  [PaymentStatus.NOT_REQUIRED]: 'Pay on delivery',
};

const PAYMENT_STATUS_COLORS = {
  [PaymentStatus.PENDING]: '#f59e0b',
  [PaymentStatus.PAID]: '#22c55e',
  [PaymentStatus.FAILED]: '#ef4444',
  [PaymentStatus.NOT_REQUIRED]: '#3b82f6',
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
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.getOrder(orderId)
      .then(({ order: o }) => {
        setOrder(o);
        if (o.finalBillAmount) setAmount(String(o.finalBillAmount));
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
    try {
      const { order: updated } = await api.acceptOrder(orderId, Number(amount), timeSlot);
      setOrder(updated);
      Alert.alert('Accepted', 'Customer will be notified to choose payment');
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const ship = async () => {
    try {
      const { order: updated } = await api.shipOrder(orderId);
      setOrder(updated);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const deliver = async () => {
    try {
      const { order: updated } = await api.deliverOrder(orderId);
      setOrder(updated);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  if (loading || !order) {
    return (
      <ScreenLayout>
        <View style={styles.center}><ActivityIndicator size="large" color="#1a7f4b" /></View>
      </ScreenLayout>
    );
  }

  const showPayment = order.orderStatus !== OrderStatus.CREATED;
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
        <Text style={styles.body}>{order.textPayload || '(Image order — check uploads)'}</Text>
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
});
