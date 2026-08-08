import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getCatalogGroups } from '@localite/shared';
import { api } from '../../services/api';
import ScreenLayout from '../../components/ScreenLayout';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80';

export default function EditCatalogItemScreen({ route, navigation }) {
  const { shop, item } = route.params;
  const isEdit = Boolean(item?.id);
  const groups = useMemo(() => getCatalogGroups(shop.category), [shop.category]);

  const [name, setName] = useState(item?.name || '');
  const [description, setDescription] = useState(item?.description || '');
  const [price, setPrice] = useState(item?.price ? String(Number(item.price)) : '');
  const [sizeLabel, setSizeLabel] = useState(item?.sizeLabel || '');
  const [unit, setUnit] = useState(item?.unit || 'piece');
  const [itemGroup, setItemGroup] = useState(item?.itemGroup || groups[0]?.key || 'general');
  const [imageUri, setImageUri] = useState(item?.imageUrl || null);
  const [newImageUri, setNewImageUri] = useState(null);
  const [trackStock, setTrackStock] = useState(Boolean(item?.trackStock));
  const [stockQuantity, setStockQuantity] = useState(
    item?.stockQuantity != null ? String(item.stockQuantity) : '',
  );
  const [saving, setSaving] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!result.canceled) {
      setNewImageUri(result.assets[0].uri);
      setImageUri(result.assets[0].uri);
    }
  };

  const buildFields = (publish) => ({
    name: name.trim(),
    description: description.trim(),
    price,
    sizeLabel: sizeLabel.trim(),
    unit: unit.trim() || 'piece',
    itemGroup,
    trackStock,
    stockQuantity: trackStock ? stockQuantity : '',
    publish,
  });

  const save = async (publish) => {
    if (!name.trim()) {
      Alert.alert('Required', 'Product name is required');
      return;
    }
    if (!price || Number(price) < 0) {
      Alert.alert('Required', 'Enter a valid price');
      return;
    }

    setSaving(true);
    try {
      const fields = buildFields(publish);
      if (isEdit) {
        await api.updateCatalogItem(shop.id, item.id, fields, newImageUri);
        if (publish && item.publishStatus !== 'published') {
          await api.publishCatalogItem(shop.id, item.id);
        }
      } else {
        await api.createCatalogItem(shop.id, fields, newImageUri);
      }
      Alert.alert(
        publish ? 'Published!' : 'Saved as draft',
        publish
          ? 'Customers can now see and order this product.'
          : 'Product saved. Publish it when you are ready.',
      );
      navigation.goBack();
    } catch (err) {
      Alert.alert('Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{isEdit ? 'Edit product' : 'Add product'}</Text>
        <Text style={styles.hint}>Upload a photo, set price, then save as draft or publish to your store page.</Text>

        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          <Image source={{ uri: imageUri || DEFAULT_IMAGE }} style={styles.preview} />
          <Text style={styles.imagePickerText}>{imageUri ? 'Change photo' : 'Upload product photo'}</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Product name *</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Red Rose Bouquet" />

        <Text style={styles.label}>Price (₹) *</Text>
        <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="250" />

        <Text style={styles.label}>Size / quantity label</Text>
        <TextInput style={styles.input} value={sizeLabel} onChangeText={setSizeLabel} placeholder="e.g. 12 stems, 1 kg" />

        <Text style={styles.label}>Unit</Text>
        <TextInput style={styles.input} value={unit} onChangeText={setUnit} placeholder="piece, bunch, kg" />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="Short description for customers"
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.chips}>
          {groups.map((group) => (
            <TouchableOpacity
              key={group.key}
              style={[styles.chip, itemGroup === group.key && styles.chipActive]}
              onPress={() => setItemGroup(group.key)}
            >
              <Text style={[styles.chipText, itemGroup === group.key && styles.chipTextActive]}>
                {group.emoji} {group.label}
              </Text>
            </TouchableOpacity>
          ))}
          {!groups.length ? (
            <TouchableOpacity
              style={[styles.chip, itemGroup === 'general' && styles.chipActive]}
              onPress={() => setItemGroup('general')}
            >
              <Text style={styles.chipText}>📦 General</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.stockRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Track stock quantity</Text>
            <Text style={styles.stockHint}>When enabled, out-of-stock items are hidden from customers</Text>
          </View>
          <Switch value={trackStock} onValueChange={setTrackStock} trackColor={{ true: '#1a7f4b' }} />
        </View>
        {trackStock ? (
          <>
            <Text style={styles.label}>Stock quantity</Text>
            <TextInput
              style={styles.input}
              value={stockQuantity}
              onChangeText={setStockQuantity}
              keyboardType="number-pad"
              placeholder="e.g. 10"
            />
          </>
        ) : null}

        <TouchableOpacity
          style={[styles.btn, styles.btnDraft]}
          onPress={() => save(false)}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#1a7f4b" /> : <Text style={styles.btnDraftText}>Save as draft</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnPublish]}
          onPress={() => save(true)}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPublishText}>Save & publish</Text>}
        </TouchableOpacity>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '800', color: '#111' },
  hint: { fontSize: 14, color: '#666', marginTop: 6, marginBottom: 16, lineHeight: 20 },
  imagePicker: { alignItems: 'center', marginBottom: 16 },
  preview: { width: '100%', height: 180, borderRadius: 12, backgroundColor: '#eee' },
  imagePickerText: { marginTop: 8, color: '#1a7f4b', fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
    fontSize: 15,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#1a7f4b', borderColor: '#1a7f4b' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#555' },
  chipTextActive: { color: '#fff' },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, marginBottom: 4 },
  stockHint: { fontSize: 12, color: '#888', marginTop: 2 },
  btn: { padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  btnDraft: { borderWidth: 1, borderColor: '#1a7f4b', backgroundColor: '#fff' },
  btnDraftText: { color: '#1a7f4b', fontWeight: '800', fontSize: 15 },
  btnPublish: { backgroundColor: '#1a7f4b' },
  btnPublishText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
