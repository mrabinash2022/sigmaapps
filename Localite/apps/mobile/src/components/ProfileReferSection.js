import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';

export default function ProfileReferSection({ userName }) {
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  const sendReferral = async () => {
    if (!phone.trim() && !email.trim()) {
      Alert.alert('Invite someone', 'Enter a mobile number or email address.');
      return;
    }

    setSending(true);
    try {
      const { message } = await api.sendAppReferral({
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
      Alert.alert('Invite sent', message);
      setPhone('');
      setEmail('');
    } catch (err) {
      Alert.alert('Could not send invite', err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Ionicons name="gift-outline" size={20} color="#1a7f4b" />
        <Text style={styles.cardTitle}>Refer the app</Text>
      </View>
      <Text style={styles.body}>
        Share Localite with friends and family. We will send them an invite
        {userName ? ` from ${userName}` : ''} by SMS or email.
      </Text>

      <Text style={styles.inputLabel}>Friend&apos;s mobile</Text>
      <TextInput
        style={styles.input}
        placeholder="10-digit mobile number"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        maxLength={14}
      />

      <Text style={styles.orText}>or</Text>

      <Text style={styles.inputLabel}>Friend&apos;s email</Text>
      <TextInput
        style={styles.input}
        placeholder="friend@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <TouchableOpacity style={styles.btn} onPress={sendReferral} disabled={sending}>
        {sending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="paper-plane" size={18} color="#fff" style={styles.btnIcon} />
            <Text style={styles.btnText}>Send invite</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#eee',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#1a7f4b' },
  body: { fontSize: 14, color: '#555', lineHeight: 21, marginBottom: 14 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#888', textTransform: 'uppercase', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fafafa',
    fontSize: 15,
    marginBottom: 8,
  },
  orText: { textAlign: 'center', color: '#999', fontWeight: '600', marginVertical: 4 },
  btn: {
    backgroundColor: '#1a7f4b',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 8,
  },
  btnIcon: { marginRight: 8 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
