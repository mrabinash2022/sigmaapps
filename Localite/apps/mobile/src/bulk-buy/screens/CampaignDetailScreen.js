import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { formatBulkBuyDiscount, formatBulkBuyProgress } from '@localite/shared';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { UserRole } from '@localite/shared';
import { shopHasBulkBuyEnabled } from '../../utils/profile';

export default function CampaignDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { campaignId } = route.params;
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isCustomer = user?.role === UserRole.CUSTOMER;
  const isShopAdmin = user?.role === UserRole.ADMIN;
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;
  const canUseShopBulkBuy = isSuperAdmin || (isShopAdmin && shopHasBulkBuyEnabled(user));

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.getBulkBuyCampaign(campaignId);
      setCampaign(res.campaign);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    load();
  }, [load]));

  const toggleSubscribe = async () => {
    setActing(true);
    try {
      if (campaign.isSubscribed) {
        const res = await api.unsubscribeBulkBuyCampaign(campaignId);
        setCampaign(res.campaign);
      } else {
        const res = await api.subscribeBulkBuyCampaign(campaignId);
        setCampaign(res.campaign);
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not update subscription');
    } finally {
      setActing(false);
    }
  };

  if (loading || !campaign) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  const canSubscribe = isCustomer && campaign.status === 'collecting';
  const canOffer = canUseShopBulkBuy && ['ready_for_offers', 'offers_available'].includes(campaign.status);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{campaign.title}</Text>
      <Text style={styles.category}>{campaign.productCategoryLabel}</Text>
      {campaign.brandPreference ? (
        <Text style={styles.meta}>Preferred brand: {campaign.brandPreference}</Text>
      ) : null}
      {campaign.description ? <Text style={styles.desc}>{campaign.description}</Text> : null}

      <View style={styles.statBox}>
        <Text style={styles.stat}>{formatBulkBuyProgress(campaign.subscriberCount, campaign.minSubscribers)}</Text>
        <Text style={styles.statSub}>people interested in this campaign</Text>
      </View>

      {campaign.canEdit && (
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate('BulkBuyEditCampaign', { campaignId })}
        >
          <Text style={styles.editBtnText}>Edit campaign details</Text>
        </TouchableOpacity>
      )}

      {canSubscribe && (
        <TouchableOpacity
          style={[styles.primaryBtn, campaign.isSubscribed && styles.secondaryBtn]}
          onPress={toggleSubscribe}
          disabled={acting}
        >
          <Text style={[styles.primaryBtnText, campaign.isSubscribed && styles.secondaryBtnText]}>
            {acting ? '...' : campaign.isSubscribed ? "I'm interested ✓ (tap to withdraw)" : "I'm interested — count me in"}
          </Text>
        </TouchableOpacity>
      )}

      {canOffer && (
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('BulkBuySubmitOffer', { campaignId, campaignTitle: campaign.title })}
        >
          <Text style={styles.primaryBtnText}>Submit store offer</Text>
        </TouchableOpacity>
      )}

      {(campaign.offers || []).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Store offers</Text>
          {campaign.offers.map((offer) => (
            <View key={offer.id} style={styles.offerCard}>
              <Text style={styles.offerShop}>{offer.shop?.name || 'Store'}</Text>
              <Text style={styles.offerDiscount}>{formatBulkBuyDiscount(offer)}</Text>
              {offer.extras?.extendedWarrantyMonths ? (
                <Text style={styles.offerExtra}>
                  + {offer.extras.extendedWarrantyMonths} months extended warranty
                </Text>
              ) : null}
              {offer.extras?.freebies ? (
                <Text style={styles.offerExtra}>Goodies: {offer.extras.freebies}</Text>
              ) : null}
              {offer.extras?.installation ? (
                <Text style={styles.offerExtra}>Free installation included</Text>
              ) : null}
              {offer.termsText ? <Text style={styles.offerTerms}>{offer.termsText}</Text> : null}
              {offer.shop?.phone ? (
                <Text style={styles.offerPhone}>Contact: {offer.shop.phone}</Text>
              ) : null}
            </View>
          ))}
          <Text style={styles.offerNote}>
            {campaign.subscriberCount} customers are interested. Visit the store with this offer to complete your purchase.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 22, fontWeight: '800', color: colors.text },
    category: { fontSize: 14, color: colors.brand, marginTop: 6, fontWeight: '600' },
    meta: { fontSize: 14, color: colors.textMuted, marginTop: 8 },
    desc: { fontSize: 15, color: colors.text, marginTop: 12, lineHeight: 22 },
    statBox: {
      marginTop: 20,
      padding: 16,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    stat: { fontSize: 28, fontWeight: '800', color: colors.text },
    statSub: { fontSize: 14, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
    editBtn: {
      marginTop: 16,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.brand,
      backgroundColor: colors.card,
    },
    editBtnText: { color: colors.brand, fontWeight: '700', fontSize: 15 },
    primaryBtn: {
      marginTop: 20,
      backgroundColor: colors.brand,
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: 'center',
    },
    secondaryBtn: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.brand },
    primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    secondaryBtnText: { color: colors.brand },
    section: { marginTop: 28 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 },
    offerCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    offerShop: { fontSize: 16, fontWeight: '700', color: colors.text },
    offerDiscount: { fontSize: 18, fontWeight: '800', color: colors.brand, marginTop: 6 },
    offerExtra: { fontSize: 14, color: colors.text, marginTop: 4 },
    offerTerms: { fontSize: 13, color: colors.textMuted, marginTop: 8, lineHeight: 18 },
    offerPhone: { fontSize: 14, color: colors.text, marginTop: 8, fontWeight: '600' },
    offerNote: { fontSize: 13, color: colors.textMuted, marginTop: 8, lineHeight: 18 },
  });
}
