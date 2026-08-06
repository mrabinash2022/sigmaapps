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
import { useFocusEffect } from '@react-navigation/native';
import { ShopOperationalStatus, PaymentStatus } from '@localite/shared';
import { api } from '../../services/api';
import ScreenLayout from '../../components/ScreenLayout';
import { OrderSupportButton } from '../../components/OrderSupportButton';

const ORDER_STATUS_COLORS = {
  Created: '#f59e0b',
  Accepted: '#3b82f6',
  Shipped: '#8b5cf6',
  Delivered: '#22c55e',
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

function formatAmount(amount) {
  if (amount == null || amount === '') return '—';
  const n = Number(amount);
  return Number.isFinite(n) ? `₹${n.toFixed(2)}` : '—';
}

export default function ShopInboxScreen({ navigation }) {
  const [shopId, setShopId] = useState(null);
  const [shopName, setShopName] = useState('');
  const [shopStatus, setShopStatus] = useState(null);
  const [operationalStatus, setOperationalStatus] = useState(null);
  const [invitedShop, setInvitedShop] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [{ shops }, inviteRes] = await Promise.all([
        api.getMyShopApplication(),
        api.getMyInvitations().catch(() => ({ shops: [] })),
      ]);

      const invite = inviteRes.shops?.[0];
      if (invite) setInvitedShop(invite);

      const approved = shops?.find(
        (s) => s.status === 'approved' && s.operationalStatus === ShopOperationalStatus.ENABLED,
      );
      const pendingApproved = shops?.find((s) => s.status === 'approved');

      const activeShop = approved || pendingApproved;
      if (activeShop) {
        setShopId(activeShop.id);
        setShopName(activeShop.name);
        setShopStatus(activeShop.status);
        setOperationalStatus(activeShop.operationalStatus);
        if (approved) {
          const { orders: o } = await api.getShopOrders(activeShop.id);
          setOrders(o);
        } else {
          setOrders([]);
        }
      } else {
        setShopId(null);
        setShopName('');
        setShopStatus(null);
        setOperationalStatus(null);
        setOrders([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a7f4b" /></View>;
  }

  if (invitedShop && !shopId) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Shop invitation</Text>
        <Text style={styles.hint}>
          You have been invited to register shop {invitedShop.shopCode}. Complete your store details to continue.
        </Text>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('CompleteInvitation', { shop: invitedShop })}
        >
          <Text style={styles.actionText}>Complete registration</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!shopId) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>No approved shop yet.</Text>
        <Text style={styles.hint}>Your application is pending super admin approval.</Text>
      </View>
    );
  }

  if (shopStatus === 'approved' && operationalStatus !== ShopOperationalStatus.ENABLED) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>{shopName}</Text>
        <Text style={styles.hint}>
          Your shop is {operationalStatus?.replace('_', ' ') || 'not enabled'}. You cannot accept orders until a super admin enables your shop.
        </Text>
      </View>
    );
  }

  return (
    <ScreenLayout>
      <View style={styles.container}>
        <Text style={styles.heading}>{shopName}</Text>
        <Text style={styles.sub}>Order Inbox</Text>

        <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={<Text style={styles.empty}>No orders yet</Text>}
        renderItem={({ item }) => {
          const paymentStatusColor = PAYMENT_STATUS_COLORS[item.paymentStatus] || '#999';
          const orderStatusColor = ORDER_STATUS_COLORS[item.orderStatus] || '#999';

          return (
            <View style={styles.card}>
              <TouchableOpacity onPress={() => navigation.navigate('ManageOrder', { orderId: item.id })}>
                <View style={styles.cardTop}>
                  <Text style={styles.customer}>{item.customer?.name} · {item.customer?.phone}</Text>
                  <OrderSupportButton orderId={item.id} compact />
                </View>
                <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Order</Text>
                  <View style={[styles.badge, { backgroundColor: orderStatusColor }]}>
                    <Text style={styles.badgeText}>{item.orderStatus}</Text>
                  </View>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Amount</Text>
                  <Text style={styles.amount}>{formatAmount(item.finalBillAmount)}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Payment</Text>
                  <View style={[styles.badge, { backgroundColor: paymentStatusColor }]}>
                    <Text style={styles.badgeText}>
                      {PAYMENT_STATUS_LABELS[item.paymentStatus] || item.paymentStatus || '—'}
                    </Text>
                  </View>
                </View>
              </View>
                <Text style={styles.preview} numberOfLines={2}>
                  {item.textPayload || '(Image order)'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8faf9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  heading: { fontSize: 22, fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  sub: { fontSize: 14, color: '#666', marginBottom: 16 },
  empty: { textAlign: 'center', color: '#999', fontSize: 16 },
  hint: { textAlign: 'center', color: '#666', marginTop: 8, fontSize: 14, lineHeight: 20 },
  actionBtn: { marginTop: 20, backgroundColor: '#1a7f4b', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 10 },
  actionText: { color: '#fff', fontWeight: '700' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  customer: { fontSize: 15, fontWeight: '700', flex: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  metaItem: { flex: 1 },
  metaLabel: { fontSize: 10, fontWeight: '700', color: '#888', textTransform: 'uppercase', marginBottom: 4 },
  badge: { paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  amount: { fontSize: 14, fontWeight: '800', color: '#1a7f4b' },
  preview: { fontSize: 13, color: '#666', marginTop: 8 },
});
