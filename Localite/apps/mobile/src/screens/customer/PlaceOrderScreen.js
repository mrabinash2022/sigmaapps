import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../services/api';
import ScreenLayout from '../../components/ScreenLayout';
import OrderListTextInput from '../../components/OrderListTextInput';
import ScheduledDeliveryPicker from '../../components/ScheduledDeliveryPicker';
import { enqueueOfflineDraft } from '../../utils/offlineOrderDraft';
import { useOfflineDraftSync } from '../../hooks/useOfflineDraftSync';

export default function PlaceOrderScreen({ route, navigation }) {
  const { shop } = route.params;
  const [text, setText] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [scheduledWindow, setScheduledWindow] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { pendingCount } = useOfflineDraftSync();
  const isClosed = shop.storeInfo?.status && !shop.storeInfo.status.isOpen;

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const submit = async () => {
    if (isClosed) {
      Alert.alert('Shop closed', shop.storeInfo?.status?.label || 'This shop is not accepting orders right now.');
      return;
    }
    if (!text.trim() && !imageUri) {
      Alert.alert('Error', 'Write your list or upload a photo');
      return;
    }
    setSubmitting(true);
    try {
      const { order } = await api.submitOrder(shop.id, text.trim(), imageUri, { scheduledWindow });
      Alert.alert('Order placed!', 'Your shopkeeper will review it shortly.');
      navigation.navigate('OrderDetail', { orderId: order.id });
    } catch (err) {
      const isNetwork = /network|fetch|reach/i.test(err.message || '');
      if (isNetwork) {
        await enqueueOfflineDraft({
          shopId: shop.id,
          textPayload: text.trim(),
          imageUri,
          scheduledWindow,
        });
        Alert.alert(
          'Saved offline',
          'No connection — your order was saved and will be sent when you are back online.',
        );
        navigation.goBack();
      } else {
        Alert.alert('Failed', err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenLayout>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.shopName}>{shop.name}</Text>
        {isClosed ? (
          <Text style={styles.closedBanner}>{shop.storeInfo.status.label}</Text>
        ) : null}
        {pendingCount > 0 ? (
          <Text style={styles.offlineNote}>{pendingCount} order(s) waiting to send when online</Text>
        ) : null}
        <Text style={styles.hint}>Write what you need — type, speak into the mic, or upload a photo.</Text>

        <ScheduledDeliveryPicker value={scheduledWindow} onChange={setScheduledWindow} />

        <OrderListTextInput
          testID="order-text-input"
          value={text}
          onChangeText={setText}
          placeholder="e.g. 500g besan ladoo, 2 boxes kaju katli, 1kg mixed namkeen..."
          minHeight={160}
        />

        <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
          <Text style={styles.uploadText}>{imageUri ? 'Change photo' : 'Upload handwritten list'}</Text>
        </TouchableOpacity>

        {imageUri && <Image source={{ uri: imageUri }} style={styles.preview} />}

        <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={submitting || isClosed} testID="place-order-submit">
          <Text style={styles.submitText}>{submitting ? 'Placing order...' : 'Place Order'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8faf9' },
  shopName: { fontSize: 22, fontWeight: '700', color: '#111' },
  closedBanner: { fontSize: 14, color: '#b91c1c', fontWeight: '700', marginTop: 6 },
  offlineNote: { fontSize: 13, color: '#b45309', marginTop: 8, fontWeight: '600' },
  hint: { fontSize: 14, color: '#666', marginVertical: 12 },
  uploadBtn: {
    borderWidth: 1,
    borderColor: '#1a7f4b',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadText: { color: '#1a7f4b', fontWeight: '600' },
  preview: { width: '100%', height: 200, borderRadius: 10, marginBottom: 16 },
  submitBtn: {
    backgroundColor: '#1a7f4b',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
