import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { REPORT_PRESETS } from '@localite/shared';
import { api, getAccessToken, loadTokens } from '../../services/api';

const PRESET_KEYS = ['day', 'week', 'month', 'quarter', 'custom'];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(days) {
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  return d.toISOString().slice(0, 10);
}

export default function ReportsScreen() {
  const [preset, setPreset] = useState('week');
  const [format, setFormat] = useState('xlsx');
  const [fromDate, setFromDate] = useState(daysAgoIso(7));
  const [toDate, setToDate] = useState(todayIso());
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const reportParams = () => {
    if (preset === 'custom') {
      return { preset, from: fromDate.trim(), to: toDate.trim() };
    }
    return { preset };
  };

  const loadPreview = useCallback(async () => {
    setLoadingPreview(true);
    try {
      const data = await api.getOrderReport(reportParams());
      setPreview(data);
    } catch (err) {
      Alert.alert('Could not load report', err.message);
    } finally {
      setLoadingPreview(false);
    }
  }, [preset, fromDate, toDate]);

  const downloadReport = async () => {
    setDownloading(true);
    try {
      await loadTokens();
      const token = await getAccessToken();
      const url = api.getOrderReportExportUrl({ ...reportParams(), format });
      const ext = format === 'pdf' ? 'pdf' : 'xlsx';
      const filename = `localite-orders-report.${ext}`;
      const destination = new File(Paths.cache, filename);
      const file = await File.downloadFileAsync(url, destination, {
        headers: { Authorization: `Bearer ${token}` },
        idempotent: true,
      });
      const mimeType = format === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: 'Save order report' });
      } else {
        Alert.alert('Report ready', `Saved to ${file.uri}`);
      }
    } catch (err) {
      Alert.alert('Download failed', err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Order reports</Text>
      <Text style={styles.sub}>
        Download shop orders with items, status, payment, and amounts for your selected period.
      </Text>

      <Text style={styles.sectionTitle}>Period</Text>
      <View style={styles.presetRow}>
        {PRESET_KEYS.map((key) => (
          <TouchableOpacity
            key={key}
            style={[styles.presetChip, preset === key && styles.presetChipActive]}
            onPress={() => setPreset(key)}
          >
            <Text style={[styles.presetText, preset === key && styles.presetTextActive]}>
              {REPORT_PRESETS[key].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {preset === 'custom' && (
        <View style={styles.customRange}>
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>From (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={fromDate}
              onChangeText={setFromDate}
              placeholder="2026-01-01"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>To (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={toDate}
              onChangeText={setToDate}
              placeholder="2026-01-31"
              autoCapitalize="none"
            />
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>Download format</Text>
      <View style={styles.formatRow}>
        {[
          { id: 'xlsx', label: 'Excel (.xlsx)' },
          { id: 'pdf', label: 'PDF (.pdf)' },
        ].map((opt) => (
          <TouchableOpacity
            key={opt.id}
            style={styles.formatOption}
            onPress={() => setFormat(opt.id)}
          >
            <View style={[styles.radio, format === opt.id && styles.radioActive]} />
            <Text style={styles.formatLabel}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.secondaryBtn} onPress={loadPreview} disabled={loadingPreview}>
        {loadingPreview ? (
          <ActivityIndicator color="#1a7f4b" />
        ) : (
          <Text style={styles.secondaryBtnText}>Preview row count</Text>
        )}
      </TouchableOpacity>

      {preview && (
        <View style={styles.previewBox}>
          <Text style={styles.previewText}>
            {preview.count} order{preview.count === 1 ? '' : 's'} from {preview.range.fromDate} to {preview.range.toDate}
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.primaryBtn} onPress={downloadReport} disabled={downloading}>
        {downloading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryBtnText}>Generate & download report</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.note}>
        Total amount shows N/A for rejected or returned orders. Other statuses use the confirmed bill amount when available.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8faf9' },
  content: { padding: 16, paddingBottom: 32 },
  heading: { fontSize: 22, fontWeight: '800', color: '#111' },
  sub: { fontSize: 14, color: '#666', marginTop: 8, lineHeight: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#1a7f4b', marginBottom: 10, marginTop: 8 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  presetChipActive: { backgroundColor: '#e8f5ee', borderColor: '#1a7f4b' },
  presetText: { fontSize: 13, color: '#555', fontWeight: '600' },
  presetTextActive: { color: '#1a7f4b' },
  customRange: { marginBottom: 8 },
  dateField: { marginBottom: 10 },
  dateLabel: { fontSize: 12, color: '#666', marginBottom: 4, fontWeight: '600' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
  },
  formatRow: { gap: 10, marginBottom: 16 },
  formatOption: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#94a3b8',
  },
  radioActive: { borderColor: '#1a7f4b', backgroundColor: '#1a7f4b' },
  formatLabel: { fontSize: 15, color: '#333' },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#1a7f4b',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryBtnText: { color: '#1a7f4b', fontWeight: '700' },
  previewBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  previewText: { fontSize: 14, color: '#333' },
  primaryBtn: {
    backgroundColor: '#1a7f4b',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  note: { fontSize: 12, color: '#888', marginTop: 14, lineHeight: 18 },
});
