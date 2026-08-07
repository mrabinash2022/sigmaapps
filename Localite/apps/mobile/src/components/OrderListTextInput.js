import React, { useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useSpeechToText, appendTranscript } from '../hooks/useSpeechToText';

export default function OrderListTextInput({
  value,
  onChangeText,
  placeholder,
  accent = '#1a7f4b',
  minHeight = 120,
  showVoiceHint = true,
}) {
  const handleAppend = useCallback((spoken) => {
    onChangeText(appendTranscript(value, spoken));
  }, [onChangeText, value]);

  const { listening, available, toggleListening } = useSpeechToText({
    onAppend: handleAppend,
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.textArea, { minHeight, borderColor: listening ? accent : '#ddd' }]}
          multiline
          numberOfLines={5}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          textAlignVertical="top"
        />
        <TouchableOpacity
          style={[
            styles.micBtn,
            { borderColor: accent, backgroundColor: listening ? accent : '#fff' },
          ]}
          onPress={toggleListening}
          accessibilityLabel={listening ? 'Stop voice input' : 'Speak your order list'}
        >
          <Text style={[styles.micIcon, listening && styles.micIconActive]}>
            {listening ? '■' : '🎤'}
          </Text>
        </TouchableOpacity>
      </View>

      {listening ? (
        <Text style={[styles.status, { color: accent }]}>
          Listening… speak your items, then tap the mic again to stop.
        </Text>
      ) : showVoiceHint ? (
        <Text style={styles.hint}>
          {available
            ? 'Tap the mic and say your list — e.g. "2 kg bananas, 1 liter milk, bread".'
            : 'Voice input works in a development build. Type your list or upload a photo in Expo Go.'}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  textArea: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#fff',
    fontSize: 15,
  },
  micBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  micIcon: { fontSize: 20 },
  micIconActive: { color: '#fff', fontSize: 16, fontWeight: '800' },
  status: { fontSize: 12, fontWeight: '600', marginTop: 8, lineHeight: 18 },
  hint: { fontSize: 12, color: '#888', marginTop: 8, lineHeight: 18 },
});
