import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { getPrimaryShop, resolveMediaUrl } from '../../utils/profile';
import ProfileReferSection from '../../components/ProfileReferSection';
import ProfileAboutSection from '../../components/ProfileAboutSection';
import { DEFAULT_APP_INFO } from '@localite/shared';

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, isAdmin, isCustomer, refreshUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [appInfo, setAppInfo] = useState(DEFAULT_APP_INFO);

  useFocusEffect(useCallback(() => {
    refreshUser().catch(() => {});
    api.getAppInfo()
      .then(({ app }) => setAppInfo(app))
      .catch(() => setAppInfo(DEFAULT_APP_INFO));
  }, [refreshUser]));

  const shop = isAdmin ? getPrimaryShop(user) : null;
  const displayName = isAdmin && shop ? shop.name : user?.name;
  const avatarUrl = resolveMediaUrl(user?.profilePictureUrl);

  const pickAndUpload = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to set a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (result.canceled) return;

    setUploading(true);
    try {
      await api.uploadProfilePicture(result.assets[0].uri);
      await refreshUser();
      Alert.alert('Updated', 'Profile picture saved.');
    } catch (err) {
      Alert.alert('Upload failed', err.message);
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.center}><ActivityIndicator size="large" color="#1a7f4b" /></View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <TouchableOpacity onPress={pickAndUpload} disabled={uploading}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{displayName?.charAt(0)?.toUpperCase() || '?'}</Text>
              </View>
            )}
            <Text style={styles.changePhoto}>{uploading ? 'Uploading...' : 'Change photo'}</Text>
          </TouchableOpacity>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.role}>{isAdmin ? 'Store / Shop' : isCustomer ? 'Customer' : 'Super Admin'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account details</Text>
          <DetailRow label="Name" value={user.name} />
          <DetailRow label="Phone" value={user.phone} />
          <DetailRow label="Email" value={user.email} />
          <DetailRow label="Address" value={user.address} />
          <DetailRow label="Area" value={user.area?.name ? `${user.area.name}, ${user.area.city || ''}` : null} />
          <DetailRow label="Username" value={user.username} />
        </View>

        {shop && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Shop details</Text>
            <DetailRow label="Shop name" value={shop.name} />
            <DetailRow label="Shop code" value={shop.shopCode} />
            <DetailRow label="Shop phone" value={shop.phone} />
            <DetailRow label="Address" value={shop.address} />
            <DetailRow label="Status" value={shop.status} />
          </View>
        )}

        <TouchableOpacity
          style={styles.ordersLink}
          onPress={() => navigation.navigate('ProfileOrders')}
        >
          <Text style={styles.ordersLinkTitle}>
            {isAdmin ? 'Orders served by your shop' : 'Orders placed by you'}
          </Text>
          <Text style={styles.ordersLinkSub}>View full order history with status and payment</Text>
        </TouchableOpacity>

        <ProfileReferSection userName={user.name} />
        <ProfileAboutSection appInfo={appInfo} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8faf9' },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hero: { alignItems: 'center', marginBottom: 20 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#1a7f4b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: { width: 96, height: 96, borderRadius: 48 },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: '800' },
  changePhoto: { color: '#1a7f4b', fontWeight: '700', marginTop: 10, fontSize: 14 },
  name: { fontSize: 22, fontWeight: '800', marginTop: 12, color: '#111' },
  role: { fontSize: 13, color: '#666', marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#eee',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12, color: '#1a7f4b' },
  row: { marginBottom: 10 },
  label: { fontSize: 11, fontWeight: '700', color: '#888', textTransform: 'uppercase', marginBottom: 2 },
  value: { fontSize: 15, color: '#333', lineHeight: 20 },
  ordersLink: {
    backgroundColor: '#e8f5ee',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#c8e6d4',
  },
  ordersLinkTitle: { fontSize: 16, fontWeight: '700', color: '#1a7f4b' },
  ordersLinkSub: { fontSize: 13, color: '#555', marginTop: 6, lineHeight: 18 },
});
