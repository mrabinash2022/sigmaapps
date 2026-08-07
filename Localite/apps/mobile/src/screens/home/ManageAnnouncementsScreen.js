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
import { AnnouncementAudience } from '@localite/shared';
import { api } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const AUDIENCE_OPTIONS = [
  { id: AnnouncementAudience.SHOPKEEPERS, label: 'Shopkeepers' },
  { id: AnnouncementAudience.CUSTOMERS, label: 'Customers' },
  { id: AnnouncementAudience.ALL, label: 'Everyone' },
];

function emptyForm() {
  return {
    title: '',
    body: '',
    audience: AnnouncementAudience.SHOPKEEPERS,
    isActive: true,
    sendNotification: true,
  };
}

export default function ManageAnnouncementsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAnnouncements();
      setItems(data.announcements || []);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({
      title: item.title || '',
      body: item.body || '',
      audience: item.audience || AnnouncementAudience.SHOPKEEPERS,
      isActive: item.isActive !== false,
      sendNotification: false,
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const save = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      Alert.alert('Validation', 'Title and message are required');
      return;
    }
    setSaving(true);
    try {
      const body = {
        title: form.title.trim(),
        body: form.body.trim(),
        audience: form.audience,
        isActive: form.isActive,
        sendNotification: form.sendNotification,
      };
      let result;
      if (editingId) {
        result = await api.updateAnnouncement(editingId, body);
      } else {
        result = await api.createAnnouncement(body);
      }
      resetForm();
      await load();
      const sent = result.notification?.sent;
      const msg = sent != null
        ? `Announcement saved. Push sent to ${sent} device(s).`
        : 'Announcement saved.';
      Alert.alert('Saved', msg);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = (item) => {
    Alert.alert('Delete announcement', `Remove "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteAnnouncement(item.id);
            await load();
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Announcements</Text>
      <Text style={styles.sub}>Broadcast news to shopkeepers or customers. Push notifications are sent when enabled.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{editingId ? 'Edit announcement' : 'New announcement'}</Text>
        <TextInput
          style={styles.input}
          placeholder="Title"
          placeholderTextColor={colors.textMuted}
          value={form.title}
          onChangeText={(title) => setForm((f) => ({ ...f, title }))}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Message"
          placeholderTextColor={colors.textMuted}
          multiline
          value={form.body}
          onChangeText={(body) => setForm((f) => ({ ...f, body }))}
        />
        <Text style={styles.label}>Audience</Text>
        <View style={styles.chipRow}>
          {AUDIENCE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[styles.chip, form.audience === option.id && styles.chipActive]}
              onPress={() => setForm((f) => ({ ...f, audience: option.id }))}
            >
              <Text style={[styles.chipText, form.audience === option.id && styles.chipTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Active</Text>
          <Switch
            value={form.isActive}
            onValueChange={(isActive) => setForm((f) => ({ ...f, isActive }))}
            trackColor={{ false: colors.switchTrackOff, true: colors.brandMuted }}
          />
        </View>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>Send push notification</Text>
            <Text style={styles.hint}>Notifies registered devices for the selected audience</Text>
          </View>
          <Switch
            value={form.sendNotification}
            onValueChange={(sendNotification) => setForm((f) => ({ ...f, sendNotification }))}
            trackColor={{ false: colors.switchTrackOff, true: colors.brandMuted }}
          />
        </View>
        <View style={styles.formActions}>
          {editingId ? (
            <TouchableOpacity style={styles.secondaryBtn} onPress={resetForm}>
              <Text style={styles.secondaryBtnText}>Cancel</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.primaryBtn} onPress={save} disabled={saving}>
            <Text style={styles.primaryBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {items.map((item) => (
        <View key={item.id} style={styles.listCard}>
          <Text style={styles.listTitle}>{item.title}</Text>
          <Text style={styles.listMeta}>
            {item.audience} · {item.isActive ? 'Active' : 'Inactive'}
          </Text>
          <Text style={styles.listBody} numberOfLines={3}>{item.body}</Text>
          <View style={styles.listActions}>
            <TouchableOpacity onPress={() => startEdit(item)}>
              <Text style={styles.link}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => remove(item)}>
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
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    heading: { fontSize: 20, fontWeight: '800', color: colors.text },
    sub: { fontSize: 14, color: colors.textSecondary, marginTop: 6, marginBottom: 14, lineHeight: 20 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    cardTitle: { fontWeight: '700', color: colors.brand, marginBottom: 10 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 10,
      marginBottom: 10,
      color: colors.text,
      backgroundColor: colors.background,
    },
    textArea: { minHeight: 100, textAlignVertical: 'top' },
    label: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
    chipText: { fontSize: 12, color: colors.text },
    chipTextActive: { color: '#fff', fontWeight: '700' },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 12 },
    switchLabel: { color: colors.text, fontWeight: '600' },
    hint: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
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
    },
    listTitle: { fontWeight: '700', color: colors.text },
    listMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
    listBody: { fontSize: 14, color: colors.textSecondary, marginTop: 8, lineHeight: 20 },
    listActions: { flexDirection: 'row', gap: 16, marginTop: 10 },
    link: { color: colors.brand, fontWeight: '700' },
    danger: { color: '#dc2626', fontWeight: '700' },
  });
}
