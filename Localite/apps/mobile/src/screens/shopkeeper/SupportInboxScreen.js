import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { TicketStatus } from '@localite/shared';
import { api } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import ScreenLayout from '../../components/ScreenLayout';
import { OrderSupportModal } from '../../components/OrderSupportButton';

const STATUS_COLORS = {
  [TicketStatus.OPEN]: '#f59e0b',
  [TicketStatus.ACKNOWLEDGED]: '#3b82f6',
  [TicketStatus.RESOLVED]: '#22c55e',
};

export default function SupportInboxScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOrderId, setModalOrderId] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const { shops } = await api.getMyShopApplication();
      const shop = shops?.[0];
      if (!shop) {
        setTickets([]);
        return;
      }
      const { tickets: list } = await api.getShopActiveTickets(shop.id);
      setTickets(list || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading && !tickets.length) {
    return (
      <ScreenLayout>
        <View style={styles.center}><ActivityIndicator size="large" color={colors.brand} /></View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <View style={styles.container}>
        <Text style={styles.heading}>Support inbox</Text>
        <Text style={styles.sub}>Open tickets from customers about their orders</Text>

        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>No open support tickets</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => setModalOrderId(item.orderId)}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{item.customer?.name || 'Customer'}</Text>
                <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.ticketStatus] || '#999' }]}>
                  <Text style={styles.badgeText}>{item.ticketStatus}</Text>
                </View>
              </View>
              <Text style={styles.meta}>Order #{String(item.orderId).slice(0, 8)}…</Text>
              <Text style={styles.preview} numberOfLines={2}>
                {item.messages?.[item.messages.length - 1]?.body || item.customerMessage || item.issueType}
              </Text>
            </TouchableOpacity>
          )}
        />

        <OrderSupportModal
          orderId={modalOrderId}
          visible={Boolean(modalOrderId)}
          onClose={() => { setModalOrderId(null); load({ silent: true }); }}
        />
      </View>
    </ScreenLayout>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, padding: 16 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    heading: { fontSize: 20, fontWeight: '800', color: colors.text },
    sub: { fontSize: 13, color: colors.textSecondary, marginBottom: 16 },
    empty: { textAlign: 'center', color: colors.textSecondary, marginTop: 40 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    meta: { fontSize: 12, color: colors.textSecondary, marginTop: 6 },
    preview: { fontSize: 13, color: colors.text, marginTop: 6, lineHeight: 18 },
  });
}
