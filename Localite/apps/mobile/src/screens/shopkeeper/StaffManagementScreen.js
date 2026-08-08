import React, { useCallback, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useMyShop } from '../../hooks/useMyShop';
import { api } from '../../services/api';
import ScreenLayout from '../../components/ScreenLayout';

export default function StaffManagementScreen() {
  const { shop } = useMyShop();
  const [staff, setStaff] = useState([]);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);

  const load = useCallback(() => {
    if (!shop?.id) return;
    setLoading(true);
    api.getShopStaff(shop.id)
      .then(({ staff: rows }) => setStaff(rows))
      .catch((err) => Alert.alert('Error', err.message))
      .finally(() => setLoading(false));
  }, [shop?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const invite = async () => {
    if (!phone.trim()) return Alert.alert('Phone required');
    setInviting(true);
    try {
      await api.inviteShopStaff(shop.id, { phone: phone.trim(), name: name.trim() });
      setPhone('');
      setName('');
      load();
      Alert.alert('Invited', 'Staff member can log in with their phone number.');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setInviting(false);
    }
  };

  const remove = (userId) => {
    Alert.alert('Remove staff?', 'They will lose access to this shop inbox.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => api.removeShopStaff(shop.id, userId).then(load).catch((err) => Alert.alert('Error', err.message)),
      },
    ]);
  };

  if (!shop || loading) {
    return (
      <ScreenLayout>
        <View style={styles.center}><ActivityIndicator size="large" color="#1a7f4b" /></View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <ScrollView contentContainerStyle={styles.container}>
        {staff.map((row) => (
          <View key={row.id} style={styles.card}>
            <Text style={styles.name}>{row.user?.name} ({row.role})</Text>
            <Text style={styles.phone}>{row.user?.phone}</Text>
            {row.role === 'staff' && (
              <TouchableOpacity onPress={() => remove(row.user.id)}>
                <Text style={styles.remove}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        <Text style={styles.section}>Invite staff by phone</Text>
        <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <TouchableOpacity style={styles.btn} onPress={invite} disabled={inviting}>
          <Text style={styles.btnText}>{inviting ? 'Inviting…' : 'Send invite'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  name: { fontWeight: '700' },
  phone: { color: '#555', marginTop: 4 },
  remove: { color: '#ef4444', marginTop: 8, fontWeight: '600' },
  section: { fontWeight: '700', marginTop: 16, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, marginBottom: 8, backgroundColor: '#fff' },
  btn: { backgroundColor: '#1a7f4b', padding: 14, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
});
