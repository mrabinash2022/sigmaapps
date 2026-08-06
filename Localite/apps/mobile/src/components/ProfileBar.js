import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getPrimaryShop, resolveMediaUrl } from '../utils/profile';

export default function ProfileBar() {
  const navigation = useNavigation();
  const { user, isAdmin, isSuperAdmin } = useAuth();

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

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8ece9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a7f4b',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: 40, height: 40, borderRadius: 20 },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  info: { flex: 1 },
  subtitle: { fontSize: 10, fontWeight: '700', color: '#888', textTransform: 'uppercase' },
  title: { fontSize: 15, fontWeight: '700', color: '#111' },
  phone: { fontSize: 13, color: '#666', marginTop: 1 },
  profileBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#e8f5ee',
    borderWidth: 1,
    borderColor: '#c8e6d4',
  },
  profileBtnText: { color: '#1a7f4b', fontWeight: '700', fontSize: 12 },
});
