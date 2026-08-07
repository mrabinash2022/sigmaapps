import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

function openPhone(phone) {
  const dial = phone.replace(/[^\d+]/g, '');
  Linking.openURL(`tel:${dial}`).catch(() => {
    Alert.alert('Cannot open dialer', phone);
  });
}

function openEmail(email) {
  Linking.openURL(`mailto:${email}`).catch(() => {
    Alert.alert('Cannot open email app', email);
  });
}

export default function ProfileAboutSection({ appInfo }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!appInfo) return null;

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Ionicons name="information-circle-outline" size={20} color={colors.brand} />
        <Text style={styles.cardTitle}>About us</Text>
      </View>

      <Text style={styles.appName}>{appInfo.name}</Text>
      {appInfo.tagline ? <Text style={styles.tagline}>{appInfo.tagline}</Text> : null}
      <Text style={styles.about}>{appInfo.about}</Text>

      <View style={styles.contactBlock}>
        <Text style={styles.contactHeading}>Contact us</Text>
        <Text style={styles.contactHint}>We are happy to help with orders, shops, or app support.</Text>

        <TouchableOpacity style={styles.contactRow} onPress={() => openPhone(appInfo.contactPhone)}>
          <View style={styles.contactIcon}>
            <Ionicons name="call" size={18} color={colors.brand} />
          </View>
          <View style={styles.contactText}>
            <Text style={styles.contactLabel}>Phone</Text>
            <Text style={styles.contactValue}>{appInfo.contactPhone}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.contactRow} onPress={() => openEmail(appInfo.contactEmail)}>
          <View style={styles.contactIcon}>
            <Ionicons name="mail" size={18} color={colors.brand} />
          </View>
          <View style={styles.contactText}>
            <Text style={styles.contactLabel}>Email</Text>
            <Text style={styles.contactValue}>{appInfo.contactEmail}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    cardTitle: { fontSize: 16, fontWeight: '800', color: colors.brand },
    appName: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 4 },
    tagline: { fontSize: 14, fontWeight: '600', color: colors.brand, marginBottom: 10 },
    about: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
    contactBlock: {
      marginTop: 18,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    contactHeading: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 4 },
    contactHint: { fontSize: 13, color: colors.textMuted, lineHeight: 19, marginBottom: 12 },
    contactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
    },
    contactIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.accentSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    contactText: { flex: 1 },
    contactLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
    contactValue: { fontSize: 15, fontWeight: '700', color: colors.brand, marginTop: 2 },
  });
}
