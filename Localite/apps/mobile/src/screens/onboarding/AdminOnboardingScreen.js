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
import { ShopCategory } from '@localite/shared';

const CATEGORIES = Object.values(ShopCategory);

export default function AdminOnboardingScreen() {
  const { refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [areas, setAreas] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [selectedInvite, setSelectedInvite] = useState(null);
  const [loading, setLoading] = useState(false);

  const [profile, setProfile] = useState({ name: '', address: '', areaId: null });
  const [shop, setShop] = useState({
    name: '', category: CATEGORIES[0], address: '', phone: '', itemTypes: '', description: '', areaId: null,
    latitude: '', longitude: '',
  });

  useEffect(() => {
    Promise.all([api.getAreas(), api.getMyInvitations().catch(() => ({ shops: [] }))]).then(([areasRes, inviteRes]) => {
      const areaList = areasRes.areas || [];
      const invites = inviteRes.shops || [];
      setAreas(areaList);
      setInvitations(invites);
      const areaId = areaList[0]?.id;
      setProfile((p) => ({ ...p, areaId }));
      setShop((s) => ({ ...s, areaId }));
      if (invites.length) {
        setSelectedInvite(invites[0]);
        setShop((s) => ({
          ...s,
          phone: invites[0].phone || s.phone,
          areaId: invites[0].areaId || areaId,
        }));
      }
    });
  }, []);

  const submitProfile = async () => {
    if (!profile.name.trim() || !profile.address.trim()) {
      Alert.alert('Error', 'Name and address required');
      return;
    }
    setLoading(true);
    try {
      await api.onboardAdmin(profile);
      setStep(2);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitShop = async () => {
    const { name, category, address, phone, itemTypes, areaId } = shop;
    if (!name || !address || !phone || !areaId) {
      Alert.alert('Error', 'Fill required shop fields');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name,
        category,
        address,
        phone,
        itemTypes,
        areaId,
        description: shop.description,
        latitude: shop.latitude ? Number(shop.latitude) : null,
        longitude: shop.longitude ? Number(shop.longitude) : null,
      };

      if (selectedInvite) {
        await api.completeShopRegistration(selectedInvite.id, payload);
        Alert.alert('Submitted!', 'Your shop details are pending super admin approval.');
      } else {
        await api.applyShop(payload);
        Alert.alert('Submitted!', 'Your shop application is pending super admin approval.');
      }
      await refreshUser();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
        <Text style={styles.title}>Store Owner Setup</Text>
        <Text style={styles.sub}>Step 1: Your profile</Text>
        <TextInput style={styles.input} placeholder="Your name" value={profile.name} onChangeText={(v) => setProfile({ ...profile, name: v })} />
        <TextInput style={[styles.input, { minHeight: 80 }]} placeholder="Your address" value={profile.address} onChangeText={(v) => setProfile({ ...profile, address: v })} multiline />
        <TouchableOpacity style={styles.btn} onPress={submitProfile} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Next: Shop Details</Text>}
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <Text style={styles.title}>
        {selectedInvite ? 'Complete Shop Registration' : 'Register Your Store'}
      </Text>
      <Text style={styles.sub}>
        {selectedInvite
          ? `Shop ID: ${selectedInvite.shopCode} — fill in your store details`
          : 'Step 2: Shop details (pending approval)'}
      </Text>

      {invitations.length > 1 ? (
        <View style={styles.chips}>
          {invitations.map((invite) => (
            <TouchableOpacity
              key={invite.id}
              style={[styles.chip, selectedInvite?.id === invite.id && styles.chipActive]}
              onPress={() => {
                setSelectedInvite(invite);
                setShop((s) => ({ ...s, phone: invite.phone || s.phone, areaId: invite.areaId || s.areaId }));
              }}
            >
              <Text style={selectedInvite?.id === invite.id ? styles.chipTextActive : styles.chipText}>
                {invite.shopCode}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <TextInput style={styles.input} placeholder="Shop name *" value={shop.name} onChangeText={(v) => setShop({ ...shop, name: v })} />
      <Text style={styles.label}>Store type</Text>
      <View style={styles.chips}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity key={c} style={[styles.chip, shop.category === c && styles.chipActive]} onPress={() => setShop({ ...shop, category: c })}>
            <Text style={shop.category === c ? styles.chipTextActive : styles.chipText}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.label}>Area</Text>
      <View style={styles.chips}>
        {areas.map((area) => (
          <TouchableOpacity key={area.id} style={[styles.chip, shop.areaId === area.id && styles.chipActive]} onPress={() => setShop({ ...shop, areaId: area.id })}>
            <Text style={shop.areaId === area.id ? styles.chipTextActive : styles.chipText}>{area.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput style={styles.input} placeholder="Shop address *" value={shop.address} onChangeText={(v) => setShop({ ...shop, address: v })} />
      <TextInput style={styles.input} placeholder="Shop phone *" value={shop.phone} onChangeText={(v) => setShop({ ...shop, phone: v })} keyboardType="phone-pad" />
      <TextInput style={styles.input} placeholder="Latitude (optional)" value={shop.latitude} onChangeText={(v) => setShop({ ...shop, latitude: v })} keyboardType="decimal-pad" />
      <TextInput style={styles.input} placeholder="Longitude (optional)" value={shop.longitude} onChangeText={(v) => setShop({ ...shop, longitude: v })} keyboardType="decimal-pad" />
      <TextInput style={[styles.input, { minHeight: 60 }]} placeholder="Items you sell" value={shop.itemTypes} onChangeText={(v) => setShop({ ...shop, itemTypes: v })} multiline />
      <TextInput style={styles.input} placeholder="Short description" value={shop.description} onChangeText={(v) => setShop({ ...shop, description: v })} />

      <TouchableOpacity style={styles.btn} onPress={submitShop} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : (
          <Text style={styles.btnText}>
            {selectedInvite ? 'Submit for Approval' : 'Submit Application'}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8faf9' },
  title: { fontSize: 24, fontWeight: '800' },
  sub: { fontSize: 14, color: '#666', marginBottom: 20, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, marginBottom: 12, backgroundColor: '#fff', fontSize: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff' },
  chipActive: { borderColor: '#1a7f4b', backgroundColor: '#e8f5ee' },
  chipText: { color: '#666', fontSize: 13 },
  chipTextActive: { color: '#1a7f4b', fontWeight: '700', fontSize: 13 },
  btn: { backgroundColor: '#1a7f4b', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '700' },
});
