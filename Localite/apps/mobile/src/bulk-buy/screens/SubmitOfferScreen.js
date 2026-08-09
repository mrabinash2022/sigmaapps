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

function nextSaturday() {
  const cursor = new Date();
  while (cursor.getDay() !== 6) {
    cursor.setDate(cursor.getDate() + 1);
  }
  return cursor.toISOString().slice(0, 10);
}

export default function SubmitOfferScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { campaignId, campaignTitle } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [discountPercent, setDiscountPercent] = useState('10');
  const [tokenAmount, setTokenAmount] = useState('99');
  const [proposedDealDay, setProposedDealDay] = useState(nextSaturday());
  const [termsText, setTermsText] = useState('');
  const [warrantyMonths, setWarrantyMonths] = useState('12');
  const [freebies, setFreebies] = useState('');
  const [freeInstallation, setFreeInstallation] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!proposedDealDay.trim()) {
      Alert.alert('Required', 'Please set a proposed visit day (YYYY-MM-DD).');
      return;
    }
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
        tokenAmount: Number(tokenAmount) || 0,
        proposedDealDay: proposedDealDay.trim(),
        termsText: termsText.trim() || `Bulk deal for ${campaignTitle}`,
        extras: {
          extendedWarrantyMonths: Number(warrantyMonths) || 0,
          freebies: freebies.trim() || null,
          installation: freeInstallation,
        },
      });

      Alert.alert('Offer sent', 'Customers can accept your deal and pay the booking token.', [
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

      <Text style={styles.label}>Booking token amount (₹)</Text>
      <TextInput
        style={styles.input}
        value={tokenAmount}
        onChangeText={setTokenAmount}
        keyboardType="number-pad"
        placeholder="e.g. 99 or 999"
        placeholderTextColor={colors.textMuted}
      />
      <Text style={styles.hint}>Customers pay this to confirm their spot. Use 0 for no token.</Text>

      <Text style={styles.label}>Proposed visit day (YYYY-MM-DD)</Text>
      <TextInput
        style={styles.input}
        value={proposedDealDay}
        onChangeText={setProposedDealDay}
        placeholder="2026-08-16"
        placeholderTextColor={colors.textMuted}
      />
      <Text style={styles.hint}>Must match a poll date voted by customers to confirm the final visit day.</Text>

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
        placeholder="e.g. Valid when buyers visit on the confirmed deal day."
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
    hint: { fontSize: 12, color: colors.textMuted, marginTop: 4, marginBottom: 4 },
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
