import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

export default function BulkBuyHeaderButton() {
  const navigation = useNavigation();
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={() => navigation.navigate('BulkBuyHome')}
      hitSlop={8}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
    >
      <Text style={[styles.text, { color: colors.headerText }]}>Bulk Buy</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { marginRight: 12, paddingVertical: 4, paddingHorizontal: 2 },
  pressed: { opacity: 0.7 },
  text: { fontSize: 14, fontWeight: '700' },
});
