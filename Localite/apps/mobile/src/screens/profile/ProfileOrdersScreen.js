import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { PaymentStatus } from '@localite/shared';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getPrimaryShop } from '../../utils/profile';

const PAYMENT_STATUS_LABELS = {
  [PaymentStatus.PENDING]: 'Payment pending',
  [PaymentStatus.PAID]: 'Paid',
  [PaymentStatus.FAILED]: 'Payment failed',
  [PaymentStatus.NOT_REQUIRED]: 'Pay on delivery',
};

function formatAmount(amount) {
  if (amount == null || amount === '') return '—';
  const n = Number(amount);
  return Number.isFinite(n) ? `₹${n.toFixed(2)}` : '—';
}

export default function ProfileOrdersScreen() {
  const navigation = useNavigation();
  const { isAdmin, isCustomer } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('Your orders');

  const load = async () => {
    setLoading(true);
    try {
      if (isCustomer) {
        setTitle('Orders placed by you');
        const { orders: o } = await api.getMyOrders();
        setOrders(o || []);
      } else if (isAdmin) {
        setTitle('Orders served by your shop');
        const { shops } = await api.getMyShopApplication();
        const shop = getPrimaryShop({ shops });
        if (!shop) {
          setOrders([]);
          return;
        }
        const { orders: o } = await api.getShopOrders(shop.id);
        setOrders(o || []);
      } else {
        setTitle('Orders');
        setOrders([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, [isAdmin, isCustomer]));

  const openOrder = (order) => {
    if (isCustomer) {
      navigation.navigate('OrderDetail', { orderId: order.id });
    } else if (isAdmin) {
      navigation.navigate('ManageOrder', { orderId: order.id });
    }
  };

  if (loading && !orders.length) {
    return (
      <View style={styles.center}><ActivityIndicator size="large" color="#1a7f4b" /></View>
    );
  }

  return (
    <FlatList
      style={styles.list}
        data={orders}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        ListHeaderComponent={<Text style={styles.heading}>{title}</Text>}
        ListEmptyComponent={<Text style={styles.empty}>No orders found.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => openOrder(item)}>
            <View style={styles.cardRow}>
              <Text style={styles.primary}>
                {isCustomer ? item.shop?.name : `${item.customer?.name} · ${item.customer?.phone}`}
              </Text>
              <Text style={styles.status}>{item.orderStatus}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.meta}>Amount: {formatAmount(item.finalBillAmount)}</Text>
              <Text style={styles.meta}>
                Payment: {PAYMENT_STATUS_LABELS[item.paymentStatus] || item.paymentStatus || '—'}
              </Text>
            </View>
            <Text style={styles.preview} numberOfLines={2}>
              {item.textPayload || '(Image order)'}
            </Text>
          </TouchableOpacity>
        )}
      />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: '#f8faf9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  primary: { fontSize: 15, fontWeight: '700', flex: 1 },
  status: { fontSize: 12, fontWeight: '700', color: '#1a7f4b' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 8 },
  meta: { fontSize: 12, color: '#555', flex: 1 },
  preview: { fontSize: 13, color: '#666', marginTop: 8 },
});
