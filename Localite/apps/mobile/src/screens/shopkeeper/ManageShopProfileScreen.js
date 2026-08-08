import React, { useCallback, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useMyShop } from '../../hooks/useMyShop';
import { api } from '../../services/api';
import ScreenLayout from '../../components/ScreenLayout';

export default function ManageShopProfileScreen() {
  const { shop, reload } = useMyShop();
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [itemTypes, setItemTypes] = useState('');
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!shop) return;
    setPhone(shop.phone || '');
    setAddress(shop.address || '');
    setDescription(shop.description || '');
    setItemTypes(shop.itemTypes || '');
    setDeliveryRadiusKm(shop.deliveryRadiusKm != null ? String(shop.deliveryRadiusKm) : '');
    setLowStockThreshold(shop.lowStockThreshold != null ? String(shop.lowStockThreshold) : '5');
  }, [shop]));

  const save = async () => {
    if (!shop?.id) return;
    setSaving(true);
    try {
      await api.updateMyShop(shop.id, {
        phone: phone.trim(),
        address: address.trim(),
        description: description.trim(),
        itemTypes: itemTypes.trim(),
        deliveryRadiusKm: deliveryRadiusKm ? Number(deliveryRadiusKm) : null,
        lowStockThreshold: lowStockThreshold ? Number(lowStockThreshold) : 5,
      });
      await reload();
      Alert.alert('Saved', 'Shop profile updated.');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!shop) {
    return (
      <ScreenLayout>
        <View style={styles.center}><ActivityIndicator size="large" color="#1a7f4b" /></View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>{shop.name}</Text>
        <Text style={styles.label}>Phone</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Text style={styles.label}>Address</Text>
        <TextInput style={[styles.input, styles.multiline]} value={address} onChangeText={setAddress} multiline />
        <Text style={styles.label}>What you sell</Text>
        <TextInput style={styles.input} value={itemTypes} onChangeText={setItemTypes} />
        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} multiline />
        <Text style={styles.label}>Delivery radius (km)</Text>
        <TextInput style={styles.input} value={deliveryRadiusKm} onChangeText={setDeliveryRadiusKm} keyboardType="decimal-pad" placeholder="Leave empty for no limit" />
        <Text style={styles.label}>Low-stock alert threshold</Text>
        <TextInput style={styles.input} value={lowStockThreshold} onChangeText={setLowStockThreshold} keyboardType="number-pad" />
        <TouchableOpacity style={styles.btn} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save shop profile</Text>}
        </TouchableOpacity>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  label: { fontWeight: '600', marginBottom: 6, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, backgroundColor: '#fff' },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  btn: { backgroundColor: '#1a7f4b', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  btnText: { color: '#fff', fontWeight: '700' },
});
