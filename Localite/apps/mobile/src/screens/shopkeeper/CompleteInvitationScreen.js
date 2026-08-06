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
import { ShopCategory } from '@localite/shared';
import { api } from '../../services/api';

const CATEGORIES = Object.values(ShopCategory);

export default function CompleteInvitationScreen({ route, navigation }) {
  const invite = route.params?.shop;
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [shop, setShop] = useState({
    name: '',
    category: CATEGORIES[0],
    address: '',
    phone: invite?.phone || '',
    itemTypes: '',
    description: '',
    areaId: invite?.areaId || null,
    latitude: '',
    longitude: '',
  });

  useEffect(() => {
    api.getAreas().then(({ areas: areaList }) => {
      setAreas(areaList);
      setShop((s) => ({ ...s, areaId: s.areaId || areaList[0]?.id || null }));
    });
  }, []);

  const submit = async () => {
    const { name, category, address, phone, itemTypes, areaId } = shop;
    if (!name || !address || !phone || !areaId) {
      Alert.alert('Error', 'Fill required shop fields');
      return;
    }
    setLoading(true);
    try {
      await api.completeShopRegistration(invite.id, {
        name,
        category,
        address,
        phone,
        itemTypes,
        areaId,
        description: shop.description,
        latitude: shop.latitude ? Number(shop.latitude) : null,
        longitude: shop.longitude ? Number(shop.longitude) : null,
      });
      Alert.alert('Submitted!', 'Your shop details are pending super admin approval.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <Text style={styles.title}>Complete Shop Registration</Text>
      <Text style={styles.sub}>Shop ID: {invite?.shopCode}</Text>

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

      <TouchableOpacity style={styles.btn} onPress={submit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Submit for Approval</Text>}
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
