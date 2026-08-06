import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export default function CustomerOnboardingScreen() {
  const { refreshUser } = useAuth();
  const [areas, setAreas] = useState([]);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [areaId, setAreaId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getAreas().then(({ areas: a }) => {
      setAreas(a);
      if (a.length) setAreaId(a[0].id);
    });
  }, []);

  const submit = async () => {
    if (!name.trim() || !address.trim() || !areaId) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    setLoading(true);
    try {
      await api.onboardCustomer({ name: name.trim(), address: address.trim(), areaId });
      await refreshUser();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <Text style={styles.title}>Welcome to Localite</Text>
      <Text style={styles.sub}>Tell us a bit about yourself to get started</Text>

      <TextInput style={styles.input} placeholder="Your name" value={name} onChangeText={setName} />
      <TextInput
        style={[styles.input, { minHeight: 80 }]}
        placeholder="Delivery address"
        value={address}
        onChangeText={setAddress}
        multiline
      />

      <Text style={styles.label}>Your area</Text>
      {areas.map((a) => (
        <TouchableOpacity
          key={a.id}
          style={[styles.areaBtn, areaId === a.id && styles.areaActive]}
          onPress={() => setAreaId(a.id)}
        >
          <Text style={areaId === a.id ? styles.areaTextActive : styles.areaText}>
            {a.name}, {a.city}
          </Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.btn} onPress={submit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Get Started</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8faf9' },
  title: { fontSize: 26, fontWeight: '800', color: '#111' },
  sub: { fontSize: 14, color: '#666', marginBottom: 24, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, marginBottom: 12, backgroundColor: '#fff', fontSize: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  areaBtn: { padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', marginBottom: 8, backgroundColor: '#fff' },
  areaActive: { borderColor: '#1a7f4b', backgroundColor: '#e8f5ee' },
  areaText: { color: '#666' },
  areaTextActive: { color: '#1a7f4b', fontWeight: '700' },
  btn: { backgroundColor: '#1a7f4b', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 16 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
