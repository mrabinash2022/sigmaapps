import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../services/api';
import { getPrimaryShop, resolveMediaUrl } from '../../utils/profile';
import ProfileReferSection from '../../components/ProfileReferSection';
import ProfileAboutSection from '../../components/ProfileAboutSection';
import { DEFAULT_APP_INFO } from '@localite/shared';

function DetailRow({ label, value, styles }) {
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
  const { user, isAdmin, isCustomer, isSuperAdmin, refreshUser } = useAuth();
  const { isDark, setDarkMode, accentColor, accentOptions, setAccentColor, colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
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
        <Text style={styles.cardTitle}>Appearance</Text>
        <View style={styles.appearanceRow}>
          <View style={styles.appearanceIcon}>
            <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color={colors.brand} />
          </View>
          <View style={styles.appearanceText}>
            <Text style={styles.appearanceLabel}>Dark mode</Text>
            <Text style={styles.appearanceSub}>Easier on the eyes in low light</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={setDarkMode}
            trackColor={{ false: colors.switchTrackOff, true: colors.brandMuted }}
            thumbColor={isDark ? colors.brand : '#f4f4f5'}
          />
        </View>

        <Text style={styles.colorSectionLabel}>Accent color</Text>
        <Text style={styles.appearanceSub}>Tap to preview headers, buttons, and highlights</Text>
        <View style={styles.swatchRow}>
          {accentOptions.map((option) => {
            const selected = accentColor === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.swatch,
                  { backgroundColor: option.swatch },
                  selected && styles.swatchSelected,
                ]}
                onPress={() => setAccentColor(option.id)}
                accessibilityLabel={option.label}
                accessibilityState={{ selected }}
              >
                {selected ? <Ionicons name="checkmark" size={18} color="#fff" /> : null}
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.selectedAccentLabel}>
          {accentOptions.find((option) => option.id === accentColor)?.label || 'Green'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account details</Text>
        <DetailRow label="Name" value={user.name} styles={styles} />
        <DetailRow label="Phone" value={user.phone} styles={styles} />
        <DetailRow label="Email" value={user.email} styles={styles} />
        <DetailRow label="Address" value={user.address} styles={styles} />
        <DetailRow
          label="Area"
          value={user.area?.name ? `${user.area.name}, ${user.area.city || ''}` : null}
          styles={styles}
        />
        <DetailRow label="Username" value={user.username} styles={styles} />
      </View>

      {shop && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Shop details</Text>
          <DetailRow label="Shop name" value={shop.name} styles={styles} />
          <DetailRow label="Shop code" value={shop.shopCode} styles={styles} />
          <DetailRow label="Shop phone" value={shop.phone} styles={styles} />
          <DetailRow label="Address" value={shop.address} styles={styles} />
          <DetailRow label="Status" value={shop.status} styles={styles} />
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

      <TouchableOpacity
        style={[styles.ordersLink, styles.reportsLink]}
        onPress={() => navigation.navigate('Reports')}
      >
        <Text style={styles.ordersLinkTitle}>Reports</Text>
        <Text style={styles.ordersLinkSub}>
          Download order reports by day, week, month, or custom range as Excel or PDF
        </Text>
      </TouchableOpacity>

      {isAdmin && (
        <>
          <TouchableOpacity
            style={styles.ordersLink}
            onPress={() => navigation.navigate('ManageOffers')}
          >
            <Text style={styles.ordersLinkTitle}>Offers & discounts</Text>
            <Text style={styles.ordersLinkSub}>
              Create and manage offers shown on your shop page and customer home
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.ordersLink}
            onPress={() => navigation.navigate('ManageStoreInfo')}
          >
            <Text style={styles.ordersLinkTitle}>Store info</Text>
            <Text style={styles.ordersLinkSub}>
              Set open hours, weekly off, and temporary closure notices
            </Text>
          </TouchableOpacity>
        </>
      )}

      {isSuperAdmin && (
        <>
          <TouchableOpacity
            style={styles.ordersLink}
            onPress={() => navigation.navigate('ManageOffers', { platform: true })}
          >
            <Text style={styles.ordersLinkTitle}>Platform offers</Text>
            <Text style={styles.ordersLinkSub}>
              Manage banners and discounts shown across the app
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.ordersLink}
            onPress={() => navigation.navigate('ManageAnnouncements')}
          >
            <Text style={styles.ordersLinkTitle}>Announcements</Text>
            <Text style={styles.ordersLinkSub}>
              Send news and updates to shopkeepers or customers with push notifications
            </Text>
          </TouchableOpacity>
        </>
      )}

      <ProfileReferSection userName={user.name} />
      <ProfileAboutSection appInfo={appInfo} />
    </ScrollView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 32 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    hero: { alignItems: 'center', marginBottom: 20 },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: colors.brandDark,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarImage: { width: 96, height: 96, borderRadius: 48 },
    avatarText: { color: '#fff', fontSize: 36, fontWeight: '800' },
    changePhoto: { color: colors.brand, fontWeight: '700', marginTop: 10, fontSize: 14 },
    name: { fontSize: 22, fontWeight: '800', marginTop: 12, color: colors.text },
    role: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12, color: colors.brand },
    appearanceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    appearanceIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.accentSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    appearanceText: { flex: 1 },
    appearanceLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
    appearanceSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    colorSectionLabel: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 18, marginBottom: 4 },
    swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
    swatch: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    swatchSelected: {
      borderColor: colors.text,
      transform: [{ scale: 1.08 }],
    },
    selectedAccentLabel: { fontSize: 13, color: colors.brand, fontWeight: '700', marginTop: 10 },
    row: { marginBottom: 10 },
    label: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 2 },
    value: { fontSize: 15, color: colors.text, lineHeight: 20 },
    ordersLink: {
      backgroundColor: colors.linkCardBg,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.linkCardBorder,
      marginBottom: 12,
    },
    reportsLink: {
      backgroundColor: colors.card,
      borderColor: colors.border,
    },
    ordersLinkTitle: { fontSize: 16, fontWeight: '700', color: colors.brand },
    ordersLinkSub: { fontSize: 13, color: colors.textSecondary, marginTop: 6, lineHeight: 18 },
  });
}
