import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../services/api';
import ScreenLayout from '../../components/ScreenLayout';

export default function PlaceOrderScreen({ route, navigation }) {
  const { shop } = route.params;
  const [text, setText] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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
    if (!text.trim() && !imageUri) {
      Alert.alert('Error', 'Write your list or upload a photo');
      return;
    }
    setSubmitting(true);
    try {
      const { order } = await api.submitOrder(shop.id, text.trim(), imageUri);
      Alert.alert('Order placed!', 'Your shopkeeper will review it shortly.');
      navigation.navigate('OrderDetail', { orderId: order.id });
    } catch (err) {
      Alert.alert('Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenLayout>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.shopName}>{shop.name}</Text>
      <Text style={styles.hint}>Write what you need — just like you tell them in person.</Text>

      <TextInput
        style={styles.textArea}
        multiline
        numberOfLines={8}
        placeholder="e.g. 500g besan ladoo, 2 boxes kaju katli, 1kg mixed namkeen..."
        value={text}
        onChangeText={setText}
        textAlignVertical="top"
      />

      <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
        <Text style={styles.uploadText}>{imageUri ? 'Change photo' : 'Upload handwritten list'}</Text>
      </TouchableOpacity>

      {imageUri && <Image source={{ uri: imageUri }} style={styles.preview} />}

      <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={submitting}>
        <Text style={styles.submitText}>{submitting ? 'Placing order...' : 'Place Order'}</Text>
      </TouchableOpacity>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8faf9' },
  shopName: { fontSize: 22, fontWeight: '700', color: '#111' },
  hint: { fontSize: 14, color: '#666', marginVertical: 12 },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    minHeight: 160,
    backgroundColor: '#fff',
    fontSize: 16,
    marginBottom: 16,
  },
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
