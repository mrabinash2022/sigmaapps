import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Switch,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { DiscountType } from '@localite/shared';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useMyShop } from '../../hooks/useMyShop';
import { resolveMediaUrl } from '../../utils/profile';

const DISCOUNT_TYPES = [
  { id: DiscountType.TEXT, label: 'Text only' },
  { id: DiscountType.PERCENT, label: 'Percent %' },
  { id: DiscountType.FLAT, label: 'Flat ₹' },
];

function emptyForm() {
  return {
    title: '',
    description: '',
    discountType: DiscountType.TEXT,
    discountValue: '',
    isActive: true,
    showOnShopPage: true,
    sortOrder: '0',
  };
}

export default function ManageOffersScreen({ route }) {
  const platformMode = route.params?.platform === true;
  const { isSuperAdmin } = useAuth();
  const { shopId, loading: shopLoading } = useMyShop();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [bannerUri, setBannerUri] = useState(null);
  const [existingBannerUrl, setExistingBannerUrl] = useState(null);
  const [saving, setSaving] = useState(false);

  const canUse = platformMode ? isSuperAdmin : Boolean(shopId);
  const previewUri = bannerUri || resolveMediaUrl(existingBannerUrl);

  const load = useCallback(async () => {
    if (!canUse) return;
    setLoading(true);
    try {
      const data = platformMode
        ? await api.getPlatformOffers()
        : await api.getShopOffers(shopId);
      setOffers(data.offers || []);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }, [canUse, platformMode, shopId]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  const pickBanner = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to add a banner image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [16, 9],
    });
    if (result.canceled) return;
    setBannerUri(result.assets[0].uri);
  };

  const startEdit = (offer) => {
    setEditingId(offer.id);
    setForm({
      title: offer.title || '',
      description: offer.description || '',
      discountType: offer.discountType || DiscountType.TEXT,
      discountValue: offer.discountValue != null ? String(offer.discountValue) : '',
      isActive: offer.isActive !== false,
      showOnShopPage: offer.showOnShopPage !== false,
      sortOrder: String(offer.sortOrder ?? 0),
    });
    setBannerUri(null);
    setExistingBannerUrl(offer.bannerImageUrl || null);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm());
    setBannerUri(null);
    setExistingBannerUrl(null);
  };

  const save = async () => {
    if (!form.title.trim()) {
      Alert.alert('Validation', 'Title is required');
      return;
    }
    setSaving(true);
    try {
      const body = {
        ...form,
        discountValue: form.discountValue === '' ? null : Number(form.discountValue),
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (editingId) {
        if (platformMode) await api.updatePlatformOffer(editingId, body, bannerUri);
        else await api.updateShopOffer(shopId, editingId, body, bannerUri);
      } else if (platformMode) {
        await api.createPlatformOffer(body, bannerUri);
      } else {
        await api.createShopOffer(shopId, body, bannerUri);
      }
      resetForm();
      await load();
      Alert.alert('Saved', 'Offer saved successfully.');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = (offer) => {
    Alert.alert('Delete offer', `Remove "${offer.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            if (platformMode) await api.deletePlatformOffer(offer.id);
            else await api.deleteShopOffer(shopId, offer.id);
            await load();
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  if (shopLoading || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (!canUse) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>No shop linked to manage offers.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>{platformMode ? 'Platform offers' : 'Shop offers'}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{editingId ? 'Edit offer' : 'New offer'}</Text>

        <TouchableOpacity style={styles.bannerPicker} onPress={pickBanner}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.bannerPreview} />
          ) : (
            <Text style={styles.bannerPlaceholder}>Tap to add banner image (optional)</Text>
          )}
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Title"
          placeholderTextColor={colors.textMuted}
          value={form.title}
          onChangeText={(title) => setForm((f) => ({ ...f, title }))}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Description"
          placeholderTextColor={colors.textMuted}
          multiline
          value={form.description}
          onChangeText={(description) => setForm((f) => ({ ...f, description }))}
        />
        <View style={styles.typeRow}>
          {DISCOUNT_TYPES.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.typeChip, form.discountType === t.id && styles.typeChipActive]}
              onPress={() => setForm((f) => ({ ...f, discountType: t.id }))}
            >
              <Text style={[styles.typeChipText, form.discountType === t.id && styles.typeChipTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {form.discountType !== DiscountType.TEXT && (
          <TextInput
            style={styles.input}
            placeholder="Discount value"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={form.discountValue}
            onChangeText={(discountValue) => setForm((f) => ({ ...f, discountValue }))}
          />
        )}
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Active</Text>
          <Switch
            value={form.isActive}
            onValueChange={(isActive) => setForm((f) => ({ ...f, isActive }))}
            trackColor={{ false: colors.switchTrackOff, true: colors.brandMuted }}
          />
        </View>
        {!platformMode && (
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Show on shop page</Text>
            <Switch
              value={form.showOnShopPage}
              onValueChange={(showOnShopPage) => setForm((f) => ({ ...f, showOnShopPage }))}
              trackColor={{ false: colors.switchTrackOff, true: colors.brandMuted }}
            />
          </View>
        )}
        <View style={styles.formActions}>
          {editingId ? (
            <TouchableOpacity style={styles.secondaryBtn} onPress={resetForm}>
              <Text style={styles.secondaryBtnText}>Cancel</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.primaryBtn} onPress={save} disabled={saving}>
            <Text style={styles.primaryBtnText}>{saving ? 'Saving...' : 'Save offer'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {offers.map((offer) => (
        <View key={offer.id} style={styles.listCard}>
          {offer.bannerImageUrl ? (
            <Image
              source={{ uri: resolveMediaUrl(offer.bannerImageUrl) }}
              style={styles.listBanner}
            />
          ) : null}
          <Text style={styles.listTitle}>{offer.title}</Text>
          <Text style={styles.listMeta}>
            {offer.discountType} · {offer.isActive ? 'Active' : 'Inactive'}
          </Text>
          <View style={styles.listActions}>
            <TouchableOpacity onPress={() => startEdit(offer)}>
              <Text style={styles.link}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => remove(offer)}>
              <Text style={styles.danger}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 32 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: colors.background },
    empty: { color: colors.textSecondary, textAlign: 'center' },
    heading: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 14 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    cardTitle: { fontWeight: '700', color: colors.brand, marginBottom: 10 },
    bannerPicker: {
      height: 140,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
      marginBottom: 12,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    bannerPreview: { width: '100%', height: '100%' },
    bannerPlaceholder: { color: colors.textMuted, fontWeight: '600', paddingHorizontal: 12, textAlign: 'center' },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 10,
      marginBottom: 10,
      color: colors.text,
      backgroundColor: colors.background,
    },
    textArea: { minHeight: 72, textAlignVertical: 'top' },
    typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    typeChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    typeChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
    typeChipText: { fontSize: 12, color: colors.text },
    typeChipTextActive: { color: '#fff', fontWeight: '700' },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    switchLabel: { color: colors.text },
    formActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
    primaryBtn: {
      flex: 1,
      backgroundColor: colors.brand,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
    },
    primaryBtnText: { color: '#fff', fontWeight: '700' },
    secondaryBtn: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryBtnText: { color: colors.text },
    listCard: {
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    listBanner: { width: '100%', height: 90, borderRadius: 8, marginBottom: 8 },
    listTitle: { fontWeight: '700', color: colors.text },
    listMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
    listActions: { flexDirection: 'row', gap: 16, marginTop: 10 },
    link: { color: colors.brand, fontWeight: '700' },
    danger: { color: '#dc2626', fontWeight: '700' },
  });
}
