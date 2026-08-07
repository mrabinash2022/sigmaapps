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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { formatWeeklyOffDays } from '@localite/shared';
import { api } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useMyShop } from '../../hooks/useMyShop';

const DAY_OPTIONS = [
  { id: 0, label: 'Sun' },
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
];

export default function ManageStoreInfoScreen() {
  const { shopId, loading: shopLoading } = useMyShop();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    openTime: '',
    closeTime: '',
    weeklyOffDays: [],
    isManuallyClosed: false,
    closedMessage: '',
  });

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const { storeInfo } = await api.getShopStoreInfo(shopId);
      if (storeInfo) {
        setForm({
          openTime: storeInfo.openTime || '',
          closeTime: storeInfo.closeTime || '',
          weeklyOffDays: storeInfo.weeklyOffDays || [],
          isManuallyClosed: Boolean(storeInfo.isManuallyClosed),
          closedMessage: storeInfo.closedMessage || '',
        });
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  const toggleDay = (dayId) => {
    setForm((prev) => {
      const has = prev.weeklyOffDays.includes(dayId);
      return {
        ...prev,
        weeklyOffDays: has
          ? prev.weeklyOffDays.filter((d) => d !== dayId)
          : [...prev.weeklyOffDays, dayId].sort((a, b) => a - b),
      };
    });
  };

  const save = async () => {
    if (!shopId) return;
    setSaving(true);
    try {
      await api.updateShopStoreInfo(shopId, form);
      Alert.alert('Saved', 'Store info updated.');
      await load();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  if (shopLoading || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (!shopId) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>No shop linked.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Store hours & closures</Text>
      <Text style={styles.sub}>Customers see this on the Stores list and your shop page.</Text>

      <Text style={styles.label}>Open time (HH:mm)</Text>
      <TextInput
        style={styles.input}
        placeholder="09:00"
        placeholderTextColor={colors.textMuted}
        value={form.openTime}
        onChangeText={(openTime) => setForm((f) => ({ ...f, openTime }))}
      />

      <Text style={styles.label}>Close time (HH:mm)</Text>
      <TextInput
        style={styles.input}
        placeholder="21:00"
        placeholderTextColor={colors.textMuted}
        value={form.closeTime}
        onChangeText={(closeTime) => setForm((f) => ({ ...f, closeTime }))}
      />

      <Text style={styles.label}>Weekly off</Text>
      <View style={styles.dayRow}>
        {DAY_OPTIONS.map((day) => {
          const selected = form.weeklyOffDays.includes(day.id);
          return (
            <TouchableOpacity
              key={day.id}
              style={[styles.dayChip, selected && styles.dayChipActive]}
              onPress={() => toggleDay(day.id)}
            >
              <Text style={[styles.dayChipText, selected && styles.dayChipTextActive]}>{day.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.hint}>{formatWeeklyOffDays(form.weeklyOffDays)}</Text>

      <View style={styles.switchRow}>
        <View>
          <Text style={styles.switchLabel}>Closed today</Text>
          <Text style={styles.hint}>Shows a closed notice to customers</Text>
        </View>
        <Switch
          value={form.isManuallyClosed}
          onValueChange={(isManuallyClosed) => setForm((f) => ({ ...f, isManuallyClosed }))}
          trackColor={{ false: colors.switchTrackOff, true: colors.brandMuted }}
        />
      </View>

      <Text style={styles.label}>Closed message</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="e.g. Closed for festival"
        placeholderTextColor={colors.textMuted}
        multiline
        value={form.closedMessage}
        onChangeText={(closedMessage) => setForm((f) => ({ ...f, closedMessage }))}
      />

      <TouchableOpacity style={styles.primaryBtn} onPress={save} disabled={saving}>
        <Text style={styles.primaryBtnText}>{saving ? 'Saving...' : 'Save store info'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 32 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: colors.background },
    empty: { color: colors.textSecondary },
    heading: { fontSize: 20, fontWeight: '800', color: colors.text },
    sub: { fontSize: 14, color: colors.textSecondary, marginTop: 6, marginBottom: 16, lineHeight: 20 },
    label: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 6, marginTop: 10 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 10,
      color: colors.text,
      backgroundColor: colors.card,
    },
    textArea: { minHeight: 72, textAlignVertical: 'top' },
    dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    dayChip: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dayChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
    dayChipText: { color: colors.text, fontWeight: '600', fontSize: 12 },
    dayChipTextActive: { color: '#fff' },
    hint: { fontSize: 12, color: colors.textSecondary, marginTop: 6 },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 },
    switchLabel: { fontWeight: '700', color: colors.text },
    primaryBtn: {
      backgroundColor: colors.brand,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 24,
    },
    primaryBtnText: { color: '#fff', fontWeight: '700' },
  });
}
