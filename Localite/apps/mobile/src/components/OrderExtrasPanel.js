import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import OrderListTextInput from './OrderListTextInput';

export default function OrderExtrasPanel({
  extraText,
  onExtraTextChange,
  imageUri,
  onImageChange,
  note,
  onNoteChange,
  accent = '#1a7f4b',
}) {
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) {
      onImageChange(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Need something else?</Text>
      <Text style={styles.hint}>
        Add items not shown above — type your list, speak into the mic, or upload a photo of a handwritten list.
      </Text>

      <OrderListTextInput
        value={extraText}
        onChangeText={onExtraTextChange}
        placeholder="e.g. 2 white lotus, 1 kg rose petals, small brass kalash..."
        accent={accent}
      />

      <TouchableOpacity style={[styles.uploadBtn, { borderColor: accent }]} onPress={pickImage}>
        <Text style={[styles.uploadText, { color: accent }]}>
          {imageUri ? 'Change photo' : 'Upload handwritten list'}
        </Text>
      </TouchableOpacity>

      {imageUri ? <Image source={{ uri: imageUri }} style={styles.preview} /> : null}

      <TextInput
        style={styles.noteInput}
        placeholder="Delivery note (optional)"
        value={note}
        onChangeText={onNoteChange}
        multiline
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#eee' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#222' },
  hint: { fontSize: 13, color: '#666', marginTop: 4, marginBottom: 12, lineHeight: 18 },
  uploadBtn: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  uploadText: { fontWeight: '600' },
  preview: { width: '100%', height: 180, borderRadius: 10, marginBottom: 12 },
  noteInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
    minHeight: 56,
    textAlignVertical: 'top',
  },
});
