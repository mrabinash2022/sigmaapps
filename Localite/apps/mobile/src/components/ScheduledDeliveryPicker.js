import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SCHEDULE_OPTIONS } from '@localite/shared';

export default function ScheduledDeliveryPicker({ value, onChange, accent = '#1a7f4b' }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>When do you need it?</Text>
      {SCHEDULE_OPTIONS.map((opt) => {
        const selected = (value || null) === (opt.window || null);
        return (
          <TouchableOpacity
            key={opt.key}
            style={[styles.option, selected && { borderColor: accent, backgroundColor: '#f0fdf4' }]}
            onPress={() => onChange(opt.window)}
          >
            <Text style={[styles.optionText, selected && { color: accent, fontWeight: '700' }]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { fontWeight: '700', marginBottom: 8, color: '#333' },
  option: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  optionText: { color: '#444' },
});
