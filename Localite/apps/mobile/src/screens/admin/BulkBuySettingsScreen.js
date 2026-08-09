import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { createAdminStyles } from '../../theme/adminScreenStyles';

export default function BulkBuySettingsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createAdminStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    collectionPeriodDays: '7',
    defaultMinSubscribers: '10',
    autoCloseGraceDaysAfterDealDay: '3',
  });

  const load = useCallback(async () => {
    try {
      const res = await api.getBulkBuySettings();
      const s = res.settings;
      setForm({
        collectionPeriodDays: String(s.collectionPeriodDays),
        defaultMinSubscribers: String(s.defaultMinSubscribers),
        autoCloseGraceDaysAfterDealDay: String(s.autoCloseGraceDaysAfterDealDay),
      });
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    load();
  }, [load]));

  const save = async () => {
    setSaving(true);
    try {
      await api.updateBulkBuySettings({
        collectionPeriodDays: Number(form.collectionPeriodDays),
        defaultMinSubscribers: Number(form.defaultMinSubscribers),
        autoCloseGraceDaysAfterDealDay: Number(form.autoCloseGraceDaysAfterDealDay),
      });
      Alert.alert('Saved', 'Bulk buy platform settings updated.');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
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
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.heading}>Bulk Buy settings</Text>
      <Text style={styles.sub}>
        Platform defaults for collection deadlines, minimum group size, and auto-close after visit day.
      </Text>

      <Text style={styles.label}>Collection period (days)</Text>
      <Text style={styles.sub}>Campaigns expire if minimum interest is not reached within this window.</Text>
      <TextInput
        style={styles.input}
        value={form.collectionPeriodDays}
        onChangeText={(v) => setForm({ ...form, collectionPeriodDays: v })}
        keyboardType="number-pad"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>Default minimum subscribers</Text>
      <TextInput
        style={styles.input}
        value={form.defaultMinSubscribers}
        onChangeText={(v) => setForm({ ...form, defaultMinSubscribers: v })}
        keyboardType="number-pad"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>Auto-close grace (days after deal day)</Text>
      <TextInput
        style={styles.input}
        value={form.autoCloseGraceDaysAfterDealDay}
        onChangeText={(v) => setForm({ ...form, autoCloseGraceDaysAfterDealDay: v })}
        keyboardType="number-pad"
        placeholderTextColor={colors.textMuted}
      />

      <TouchableOpacity style={styles.approveBtn} onPress={save} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save settings</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}
