import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import ScreenLayout from '../../components/ScreenLayout';

export default function EditProfileScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [address, setAddress] = useState(user?.address || '');
  const [smsEnabled, setSmsEnabled] = useState(Boolean(user?.smsNotificationsEnabled));
  const [whatsappEnabled, setWhatsappEnabled] = useState(Boolean(user?.whatsappNotificationsEnabled));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(user?.name || '');
    setAddress(user?.address || '');
    setSmsEnabled(Boolean(user?.smsNotificationsEnabled));
    setWhatsappEnabled(Boolean(user?.whatsappNotificationsEnabled));
  }, [user]);

  const save = async () => {
    setSaving(true);
    try {
      await api.updateProfile({
        name: name.trim(),
        address: address.trim(),
        smsNotificationsEnabled: smsEnabled,
        whatsappNotificationsEnabled: whatsappEnabled,
      });
      await refreshUser();
      Alert.alert('Saved', 'Profile updated.');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.label}>Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} />
        <Text style={styles.label}>Address</Text>
        <TextInput style={[styles.input, styles.multiline]} value={address} onChangeText={setAddress} multiline />
        <Text style={styles.hint}>For multiple addresses, use Saved Addresses.</Text>
        <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('SavedAddresses')}>
          <Text style={styles.linkText}>Manage saved addresses</Text>
        </TouchableOpacity>
        <Text style={styles.section}>Order updates via SMS/WhatsApp (optional)</Text>
        <TouchableOpacity style={styles.toggleRow} onPress={() => setSmsEnabled((v) => !v)}>
          <Text>SMS notifications</Text>
          <Text>{smsEnabled ? 'On' : 'Off'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toggleRow} onPress={() => setWhatsappEnabled((v) => !v)}>
          <Text>WhatsApp notifications</Text>
          <Text>{whatsappEnabled ? 'On' : 'Off'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save changes</Text>}
        </TouchableOpacity>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  label: { fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, backgroundColor: '#fff' },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  hint: { color: '#666', marginTop: 8, fontSize: 13 },
  linkBtn: { marginTop: 8, marginBottom: 16 },
  linkText: { color: '#1a7f4b', fontWeight: '600' },
  section: { fontWeight: '700', marginTop: 8, marginBottom: 8 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee' },
  btn: { backgroundColor: '#1a7f4b', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 24 },
  btnText: { color: '#fff', fontWeight: '700' },
});
