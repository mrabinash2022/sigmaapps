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
import {
  canReorderOrder,
  getCatalogEstimatedTotal,
  parseCatalogPayload,
} from '@localite/shared';
import { api } from '../../services/api';
import ScreenLayout from '../../components/ScreenLayout';
import CatalogOrderItems from '../../components/CatalogOrderItems';

export default function ReorderConfirmScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);

  const load = () => {
    setLoading(true);
    api.getOrder(orderId)
      .then(({ order: o }) => setOrder(o))
      .catch((err) => Alert.alert('Error', err.message, [{ text: 'OK', onPress: () => navigation.goBack() }]))
      .finally(() => setLoading(false));
    api.getAddresses()
      .then(({ addresses: rows }) => {
        setAddresses(rows);
        setSelectedAddress(rows.find((a) => a.isDefault) || rows[0] || null);
      })
      .catch(() => {});
  };

  useFocusEffect(useCallback(() => { load(); }, [orderId]));

  const confirmReorder = async () => {
    setSubmitting(true);
    try {
      const { order: newOrder } = await api.reorderOrder(orderId, {
        addressId: selectedAddress?.id,
      });
      Alert.alert('Order placed!', 'Your reorder has been sent to the shop.');
      navigation.replace('OrderDetail', { orderId: newOrder.id });
    } catch (err) {
      Alert.alert('Could not reorder', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !order) {
    return (
      <ScreenLayout>
        <View style={styles.center}><ActivityIndicator size="large" color="#1a7f4b" /></View>
      </ScreenLayout>
    );
  }

  if (!canReorderOrder(order)) {
    return (
      <ScreenLayout>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Cannot reorder this order</Text>
          <Text style={styles.errorSub}>Only completed (delivered) orders with items can be reordered.</Text>
          <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
            <Text style={styles.btnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  const estimate = getCatalogEstimatedTotal(parseCatalogPayload(order));

  return (
    <ScreenLayout>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Confirm reorder</Text>
        <Text style={styles.shop}>{order.shop?.name}</Text>
        <Text style={styles.hint}>
          The same items from your previous order will be sent to the shop. Catalog prices will use current rates.
        </Text>
        {selectedAddress ? (
          <Text style={styles.address}>Deliver to: {selectedAddress.label} — {selectedAddress.address}</Text>
        ) : null}

        <View style={styles.card}>
          <CatalogOrderItems order={order} />
          {estimate != null ? (
            <Text style={styles.estimate}>Estimated catalog total: ₹{Number(estimate).toFixed(0)}</Text>
          ) : null}
        </View>

        <Text style={styles.disclaimer}>
          The shop will confirm the final amount after accepting your order, just like a new order.
        </Text>

        <TouchableOpacity style={styles.btn} onPress={confirmReorder} disabled={submitting}>
          <Text style={styles.btnText}>{submitting ? 'Placing order…' : 'Confirm & place reorder'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} disabled={submitting}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: '800', color: '#111' },
  shop: { fontSize: 16, fontWeight: '700', color: '#1a7f4b', marginTop: 4 },
  hint: { fontSize: 14, color: '#666', marginTop: 10, marginBottom: 16, lineHeight: 20 },
  address: { fontSize: 13, color: '#1a7f4b', marginBottom: 12, fontWeight: '600' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 16,
  },
  estimate: { fontSize: 15, fontWeight: '800', color: '#1a7f4b', marginTop: 8 },
  disclaimer: { fontSize: 13, color: '#888', lineHeight: 18, marginBottom: 20 },
  btn: {
    backgroundColor: '#1a7f4b',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  cancelBtn: { marginTop: 12, alignItems: 'center', padding: 12 },
  cancelText: { color: '#666', fontWeight: '600' },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  errorSub: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 8, marginBottom: 16 },
});
