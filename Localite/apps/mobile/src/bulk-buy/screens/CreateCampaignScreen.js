import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { BulkBuyProductCategory, BULK_BUY_PRODUCT_LABELS } from '@localite/shared';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { UserRole } from '@localite/shared';

const CATEGORIES = Object.values(BulkBuyProductCategory);

export default function CreateCampaignScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const campaignId = route.params?.campaignId;
  const isEdit = Boolean(campaignId);
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isShop = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;

  const [title, setTitle] = useState('');
  const [productCategory, setProductCategory] = useState(BulkBuyProductCategory.REFRIGERATOR);
  const [brandPreference, setBrandPreference] = useState('');
  const [description, setDescription] = useState('');
  const [minSubscribers, setMinSubscribers] = useState('10');
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  const loadCampaign = useCallback(async () => {
    if (!isEdit) return;
    setLoading(true);
    try {
      const res = await api.getBulkBuyCampaign(campaignId);
      const campaign = res.campaign;
      if (!campaign?.canEdit) {
        Alert.alert('Cannot edit', 'This campaign can no longer be edited.');
        navigation.goBack();
        return;
      }
      setTitle(campaign.title || '');
      setProductCategory(campaign.productCategory || BulkBuyProductCategory.REFRIGERATOR);
      setBrandPreference(campaign.brandPreference || '');
      setDescription(campaign.description || '');
      setMinSubscribers(String(campaign.minSubscribers || 10));
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not load campaign');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [campaignId, isEdit, navigation]);

  useFocusEffect(useCallback(() => {
    if (isEdit) loadCampaign();
  }, [isEdit, loadCampaign]));

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a campaign title.');
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        title: title.trim(),
        productCategory,
        brandPreference: brandPreference.trim() || undefined,
        description: description.trim() || undefined,
        minSubscribers: Number(minSubscribers) || 10,
      };

      if (isEdit) {
        const res = await api.updateBulkBuyCampaign(campaignId, body);
        navigation.replace('BulkBuyCampaignDetail', { campaignId: res.campaign.id });
        return;
      }

      body.areaId = user?.areaId;
      if (isShop) {
        const apps = await api.getMyShopApplication();
        const shop = apps.shops?.[0];
        if (!shop) {
          Alert.alert('No shop', 'You need an approved shop to create a store campaign.');
          return;
        }
        body.shopId = shop.id;
      }
      const res = await api.createBulkBuyCampaign(body);
      navigation.replace('BulkBuyCampaignDetail', { campaignId: res.campaign.id });
    } catch (err) {
      Alert.alert('Error', err.message || `Could not ${isEdit ? 'update' : 'create'} campaign`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Campaign title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Bulk buy refrigerator — Roseland"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>Product type</Text>
      <View style={styles.chips}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, productCategory === cat && styles.chipActive]}
            onPress={() => setProductCategory(cat)}
          >
            <Text style={[styles.chipText, productCategory === cat && styles.chipTextActive]}>
              {BULK_BUY_PRODUCT_LABELS[cat]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Brand preference (optional)</Text>
      <TextInput
        style={styles.input}
        value={brandPreference}
        onChangeText={setBrandPreference}
        placeholder="e.g. LG, Samsung, Volvo"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>Details (optional)</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        multiline
        placeholder="Size, features, budget range..."
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>Minimum interested buyers</Text>
      <TextInput
        style={styles.input}
        value={minSubscribers}
        onChangeText={setMinSubscribers}
        keyboardType="number-pad"
        placeholder="10"
        placeholderTextColor={colors.textMuted}
      />

      <TouchableOpacity style={styles.submit} onPress={handleSubmit} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>{isEdit ? 'Save changes' : 'Create campaign'}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
    label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8, marginTop: 12 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 12,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.card,
    },
    multiline: { minHeight: 90, textAlignVertical: 'top' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
    chipText: { fontSize: 13, color: colors.text },
    chipTextActive: { color: '#fff', fontWeight: '600' },
    submit: {
      marginTop: 24,
      backgroundColor: colors.brand,
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: 'center',
    },
    submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  });
}
