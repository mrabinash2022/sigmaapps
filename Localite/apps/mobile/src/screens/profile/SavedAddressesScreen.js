import React, { useCallback, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';
import ScreenLayout from '../../components/ScreenLayout';

export default function SavedAddressesScreen() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState('Home');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.getAddresses()
      .then(({ addresses: rows }) => setAddresses(rows))
      .catch((err) => Alert.alert('Error', err.message))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const addAddress = async () => {
    if (!address.trim()) return Alert.alert('Address required');
    setSaving(true);
    try {
      await api.createAddress({ label: label.trim(), address: address.trim(), isDefault: addresses.length === 0 });
      setAddress('');
      load();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const removeAddress = (id) => {
    Alert.alert('Delete address?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => api.deleteAddress(id).then(load).catch((err) => Alert.alert('Error', err.message)),
      },
    ]);
  };

  if (loading) {
    return (
      <ScreenLayout>
        <View style={styles.center}><ActivityIndicator size="large" color="#1a7f4b" /></View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <ScrollView contentContainerStyle={styles.container}>
        {addresses.map((row) => (
          <View key={row.id} style={styles.card}>
            <Text style={styles.cardTitle}>{row.label}{row.isDefault ? ' • default' : ''}</Text>
            <Text style={styles.cardBody}>{row.address}</Text>
            <TouchableOpacity onPress={() => removeAddress(row.id)}>
              <Text style={styles.delete}>Delete</Text>
            </TouchableOpacity>
          </View>
        ))}
        <Text style={styles.section}>Add address</Text>
        <TextInput style={styles.input} placeholder="Label (Home, Work…)" value={label} onChangeText={setLabel} />
        <TextInput style={[styles.input, styles.multiline]} placeholder="Full address" value={address} onChangeText={setAddress} multiline />
        <TouchableOpacity style={styles.btn} onPress={addAddress} disabled={saving}>
          <Text style={styles.btnText}>{saving ? 'Saving…' : 'Add address'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  cardTitle: { fontWeight: '700', marginBottom: 4 },
  cardBody: { color: '#444', lineHeight: 20 },
  delete: { color: '#ef4444', marginTop: 8, fontWeight: '600' },
  section: { fontWeight: '700', marginTop: 16, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, marginBottom: 8, backgroundColor: '#fff' },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  btn: { backgroundColor: '#1a7f4b', padding: 14, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
});
