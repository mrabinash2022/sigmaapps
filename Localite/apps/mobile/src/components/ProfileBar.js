import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getPrimaryShop, resolveMediaUrl } from '../utils/profile';

const LOGO = require('../../assets/localite-logo.png');

export default function ProfileBar() {
  const navigation = useNavigation();
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const goHome = () => {
    try {
      const parent = navigation.getParent();
      if (parent?.navigate) {
        parent.navigate('HomeTab');
        return;
      }
      navigation.navigate('HomeTab');
    } catch {
      navigation.navigate('Home', { screen: 'HomeTab' });
    }
  };

  const { title, phone, subtitle } = useMemo(() => {
    if (!user) return { title: '', phone: '', subtitle: '' };

    if (isAdmin) {
      const shop = getPrimaryShop(user);
      return {
        title: shop?.name || user.name,
        phone: shop?.phone || user.phone,
        subtitle: shop ? 'Shop' : 'Store owner',
      };
    }

    if (isSuperAdmin) {
      return {
        title: user.name,
        phone: user.phone,
        subtitle: 'Super Admin',
      };
    }

    return {
      title: user.name,
      phone: user.phone,
      subtitle: 'Customer',
    };
  }, [user, isAdmin, isSuperAdmin]);

  if (!user) return null;

  const avatarUrl = resolveMediaUrl(user.profilePictureUrl);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={goHome} style={styles.logoBtn} accessibilityLabel="Go to home">
        <Image source={LOGO} style={styles.logo} />
      </TouchableOpacity>
      <View style={styles.avatar}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarText}>{title?.charAt(0)?.toUpperCase() || '?'}</Text>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.phone}>{phone}</Text>
      </View>
      <TouchableOpacity
        style={styles.profileBtn}
        onPress={() => navigation.navigate('Profile')}
        hitSlop={8}
      >
        <Text style={styles.profileBtnText}>Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.profileBar,
      borderBottomWidth: 1,
      borderBottomColor: colors.profileBarBorder,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 10,
    },
    logoBtn: { padding: 2 },
    logo: { width: 36, height: 36, borderRadius: 8 },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.brandDark,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: { width: 40, height: 40, borderRadius: 20 },
    avatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
    info: { flex: 1 },
    subtitle: { fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
    title: { fontSize: 15, fontWeight: '700', color: colors.text },
    phone: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
    profileBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.accentSurface,
      borderWidth: 1,
      borderColor: colors.brandBorder,
    },
    profileBtnText: { color: colors.brand, fontWeight: '700', fontSize: 12 },
  });
}
