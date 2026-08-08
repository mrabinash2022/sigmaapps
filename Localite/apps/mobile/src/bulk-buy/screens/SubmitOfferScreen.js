import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function SubmitOfferScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { campaignId, campaignTitle } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [discountPercent, setDiscountPercent] = useState('10');
  const [termsText, setTermsText] = useState('');
  const [warrantyMonths, setWarrantyMonths] = useState('12');
  const [freebies, setFreebies] = useState('');
  const [freeInstallation, setFreeInstallation] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const apps = await api.getMyShopApplication();
      const shop = apps.shops?.[0];
      if (!shop) {
        Alert.alert('No shop', 'Bulk buy partner shop required.');
        return;
      }

      await api.submitBulkBuyOffer(campaignId, {
        shopId: shop.id,
        discountType: 'percent',
        discountValue: Number(discountPercent) || 0,
        termsText: termsText.trim() || `Bulk deal for ${campaignTitle}`,
        extras: {
          extendedWarrantyMonths: Number(warrantyMonths) || 0,
          freebies: freebies.trim() || null,
          installation: freeInstallation,
        },
      });

      Alert.alert('Offer sent', 'All interested customers will be notified.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not submit offer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Offer for: {campaignTitle}</Text>

      <Text style={styles.label}>Discount (% off MRP)</Text>
      <TextInput
        style={styles.input}
        value={discountPercent}
        onChangeText={setDiscountPercent}
        keyboardType="decimal-pad"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>Extended warranty (months)</Text>
      <TextInput
        style={styles.input}
        value={warrantyMonths}
        onChangeText={setWarrantyMonths}
        keyboardType="number-pad"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>Freebies / gifts (optional)</Text>
      <TextInput
        style={styles.input}
        value={freebies}
        onChangeText={setFreebies}
        placeholder="e.g. mixer grinder, gift voucher"
        placeholderTextColor={colors.textMuted}
      />

      <View style={styles.row}>
        <Text style={styles.label}>Free installation</Text>
        <Switch value={freeInstallation} onValueChange={setFreeInstallation} />
      </View>

      <Text style={styles.label}>Terms & fine print</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={termsText}
        onChangeText={setTermsText}
        multiline
        placeholder="e.g. Valid when all interested buyers purchase within 30 days at our Pimpri branch."
        placeholderTextColor={colors.textMuted}
      />

      <TouchableOpacity style={styles.submit} onPress={handleSubmit} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Publish offer to subscribers</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40 },
    heading: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 },
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
    multiline: { minHeight: 100, textAlignVertical: 'top' },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
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
