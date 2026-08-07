import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ShopOperationalStatus, PaymentStatus, formatOrderItemsSummary } from '@localite/shared';
import { api } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import ScreenLayout from '../../components/ScreenLayout';
import { OrderSupportButton } from '../../components/OrderSupportButton';
import {
  buildOrderQueueSections,
  formatOrderTime,
  getQueueSummary,
} from '../../utils/orderQueue';

const ORDER_STATUS_COLORS = {
  Created: '#f59e0b',
  Backorder_Waiting: '#d97706',
  Accepted: '#3b82f6',
  Shipped: '#8b5cf6',
  Delivered: '#22c55e',
  Rejected: '#ef4444',
  Returned: '#dc2626',
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

function formatAmount(amount) {
  if (amount == null || amount === '') return '—';
  const n = Number(amount);
  return Number.isFinite(n) ? `₹${n.toFixed(2)}` : '—';
}

function QueueSummaryBar({ summary, styles }) {
  if (summary.active === 0) {
    return (
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>No active orders in queue</Text>
      </View>
    );
  }

  const parts = [];
  if (summary.waiting > 0) parts.push(`${summary.waiting} new`);
  if (summary.backorder > 0) parts.push(`${summary.backorder} backorder`);
  if (summary.preparing > 0) parts.push(`${summary.preparing} preparing`);
  if (summary.returns > 0) parts.push(`${summary.returns} refund due`);

  return (
    <View style={styles.summaryBar}>
      <Text style={styles.summaryTitle}>Order queue</Text>
      <Text style={styles.summaryText}>{parts.join(' · ')}</Text>
      <Text style={styles.summaryHint}>Oldest orders appear first — work top to bottom</Text>
    </View>
  );
}

function OrderQueueCard({ item, position, showPosition, onPress, styles }) {
  const paymentStatusColor = PAYMENT_STATUS_COLORS[item.paymentStatus] || '#999';
  const orderStatusColor = ORDER_STATUS_COLORS[item.orderStatus] || '#999';

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={onPress}>
        <View style={styles.cardTop}>
          <View style={styles.cardTitleRow}>
            {showPosition && (
              <View style={styles.queueBadge}>
                <Text style={styles.queueBadgeText}>#{position}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.customer}>{item.customer?.name}</Text>
              <Text style={styles.phone}>{item.customer?.phone}</Text>
            </View>
          </View>
          <OrderSupportButton orderId={item.id} compact />
        </View>

        <Text style={styles.placedAt}>Placed {formatOrderTime(item.createdAt)}</Text>

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
          {formatOrderItemsSummary(item) || item.textPayload || '(Image order)'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ShopInboxScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [shopId, setShopId] = useState(null);
  const [shopName, setShopName] = useState('');
  const [shopStatus, setShopStatus] = useState(null);
  const [operationalStatus, setOperationalStatus] = useState(null);
  const [invitedShop, setInvitedShop] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

  const load = async (force = false) => {
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
          const { orders: o } = await api.getShopOrders(activeShop.id, { force });
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

  const sections = useMemo(
    () => buildOrderQueueSections(orders, { includeCompleted: showCompleted }),
    [orders, showCompleted],
  );

  const summary = useMemo(() => getQueueSummary(orders), [orders]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
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
      <View style={styles.container} testID="shop-inbox">
        <Text style={styles.heading}>{shopName}</Text>
        <Text style={styles.sub}>Order queue</Text>

        <QueueSummaryBar summary={summary} styles={styles} />

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, !showCompleted && styles.filterChipActive]}
            onPress={() => setShowCompleted(false)}
          >
            <Text style={[styles.filterText, !showCompleted && styles.filterTextActive]}>Active</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, showCompleted && styles.filterChipActive]}
            onPress={() => setShowCompleted(true)}
          >
            <Text style={[styles.filterText, showCompleted && styles.filterTextActive]}>Show completed</Text>
          </TouchableOpacity>
        </View>

        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          refreshControl={(
            <RefreshControl
              refreshing={loading}
              onRefresh={() => load(true)}
              tintColor={colors.brand}
              colors={[colors.brand]}
            />
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
          stickySectionHeadersEnabled
          ListEmptyComponent={
            <Text style={styles.empty}>
              {showCompleted ? 'No orders yet' : 'Queue is clear — no active orders'}
            </Text>
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
              <Text style={styles.sectionCount}>{section.data.length} order{section.data.length === 1 ? '' : 's'}</Text>
            </View>
          )}
          renderItem={({ item, index, section }) => (
            <OrderQueueCard
              item={item}
              position={index + 1}
              showPosition={section.showPosition}
              onPress={() => navigation.navigate('ManageOrder', { orderId: item.id })}
              styles={styles}
            />
          )}
        />
      </View>
    </ScreenLayout>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: colors.background },
    heading: { fontSize: 22, fontWeight: '700', color: colors.text },
    title: { fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center', color: colors.text },
    sub: { fontSize: 14, color: colors.textSecondary, marginBottom: 12 },
    empty: { textAlign: 'center', color: colors.textMuted, fontSize: 16, marginTop: 24 },
    hint: { textAlign: 'center', color: colors.textSecondary, marginTop: 8, fontSize: 14, lineHeight: 20 },
    actionBtn: { marginTop: 20, backgroundColor: colors.brandDark, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 10 },
    actionText: { color: '#fff', fontWeight: '700' },
    summaryBar: {
      backgroundColor: colors.accentSurface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.brandBorder,
    },
    summaryTitle: { fontSize: 13, fontWeight: '800', color: colors.brand, textTransform: 'uppercase', marginBottom: 4 },
    summaryText: { fontSize: 15, fontWeight: '700', color: colors.text },
    summaryHint: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
    filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      backgroundColor: colors.card,
    },
    filterChipActive: { backgroundColor: colors.brandDark, borderColor: colors.brandDark },
    filterText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    filterTextActive: { color: '#fff' },
    sectionHeader: {
      backgroundColor: colors.background,
      paddingTop: 12,
      paddingBottom: 8,
    },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
    sectionSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    sectionCount: { fontSize: 11, fontWeight: '700', color: colors.brand, marginTop: 4 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
    cardTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    queueBadge: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.brandDark,
      alignItems: 'center',
      justifyContent: 'center',
    },
    queueBadgeText: { color: '#fff', fontWeight: '800', fontSize: 13 },
    customer: { fontSize: 15, fontWeight: '700', color: colors.text },
    phone: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    placedAt: { fontSize: 12, color: colors.textMuted, marginTop: 8 },
    metaRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
    metaItem: { flex: 1 },
    metaLabel: { fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 },
    badge: { paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    amount: { fontSize: 14, fontWeight: '800', color: colors.brand },
    preview: { fontSize: 13, color: colors.textSecondary, marginTop: 8 },
  });
}
