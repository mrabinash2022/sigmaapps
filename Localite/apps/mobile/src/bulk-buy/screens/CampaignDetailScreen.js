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
import {
  formatBulkBuyAcceptanceCount,
  formatBulkBuyDiscount,
  formatBulkBuyProgress,
  formatBulkBuyTokenAmount,
} from '@localite/shared';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { UserRole } from '@localite/shared';
import { shopHasBulkBuyEnabled } from '../../utils/profile';

function nextSaturdayDates(count = 3) {
  const dates = [];
  const cursor = new Date();
  while (dates.length < count) {
    cursor.setDate(cursor.getDate() + 1);
    if (cursor.getDay() === 6) {
      dates.push(cursor.toISOString().slice(0, 10));
    }
  }
  return dates;
}

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

  const runAction = async (action) => {
    setActing(true);
    try {
      await action();
      await load();
    } catch (err) {
      Alert.alert('Error', err.message || 'Action failed');
    } finally {
      setActing(false);
    }
  };

  const toggleSubscribe = () => runAction(async () => {
    if (campaign.isSubscribed) {
      const res = await api.unsubscribeBulkBuyCampaign(campaignId);
      setCampaign(res.campaign);
    } else {
      const res = await api.subscribeBulkBuyCampaign(campaignId);
      setCampaign(res.campaign);
    }
  });

  const acceptOffer = (offerId) => runAction(async () => {
    const res = await api.acceptBulkBuyOffer(campaignId, offerId);
    setCampaign(res.campaign);
    Alert.alert('Offer accepted', 'Pay the booking token to confirm your spot.');
  });

  const payToken = () => runAction(async () => {
    const res = await api.mockPayBulkBuyToken(campaignId);
    setCampaign(res.campaign);
    Alert.alert('Token paid', 'Your booking is confirmed. Vote for a visit day when the poll is open.');
  });

  const votePoll = (pollDate) => runAction(async () => {
    const res = await api.voteBulkBuyVisitPoll(campaignId, pollDate);
    setCampaign(res.campaign);
  });

  const createPoll = () => runAction(async () => {
    const dates = nextSaturdayDates(3);
    const res = await api.setBulkBuyVisitPoll(campaignId, dates);
    setCampaign(res.campaign);
    Alert.alert('Poll created', 'Subscribers can now vote for their preferred visit day.');
  });

  const closeCampaign = () => {
    Alert.alert('Close campaign', 'End this bulk buy campaign?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Close',
        style: 'destructive',
        onPress: () => runAction(async () => {
          const res = await api.closeBulkBuyCampaign(campaignId, 'manual');
          setCampaign(res.campaign);
        }),
      },
    ]);
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
  const canClose = !['closed', 'expired', 'cancelled'].includes(campaign.status);
  const myCommitment = campaign.myCommitment;
  const pollDates = campaign.visitPollDates || [];
  const pollVotes = campaign.pollVoteSummary || {};

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{campaign.title}</Text>
      <Text style={styles.category}>{campaign.productCategoryLabel}</Text>
      <Text style={styles.meta}>Status: {campaign.status.replace(/_/g, ' ')}</Text>
      {campaign.brandPreference ? (
        <Text style={styles.meta}>Preferred brand: {campaign.brandPreference}</Text>
      ) : null}
      {campaign.description ? <Text style={styles.desc}>{campaign.description}</Text> : null}

      <View style={styles.statBox}>
        <Text style={styles.stat}>{formatBulkBuyProgress(campaign.subscriberCount, campaign.minSubscribers)}</Text>
        <Text style={styles.statSub}>people interested in this campaign</Text>
      </View>

      {myCommitment && (
        <View style={styles.commitmentBox}>
          <Text style={styles.commitmentTitle}>Your commitment</Text>
          <Text style={styles.meta}>Store: {myCommitment.acceptedOffer?.shop?.name || 'Selected store'}</Text>
          <Text style={styles.meta}>Status: {myCommitment.commitmentStatus?.replace(/_/g, ' ')}</Text>
          {myCommitment.scheduledVisitAt ? (
            <Text style={styles.meta}>Visit day: {String(myCommitment.scheduledVisitAt).slice(0, 10)}</Text>
          ) : null}
        </View>
      )}

      {campaign.canEdit && (
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate('BulkBuyEditCampaign', { campaignId })}
        >
          <Text style={styles.editBtnText}>Edit campaign details</Text>
        </TouchableOpacity>
      )}

      {campaign.canEdit && pollDates.length === 0 && ['offers_available', 'ready_for_offers'].includes(campaign.status) && (
        <TouchableOpacity style={styles.secondaryActionBtn} onPress={createPoll} disabled={acting}>
          <Text style={styles.secondaryActionText}>Create visit day poll (next 3 Saturdays)</Text>
        </TouchableOpacity>
      )}

      {canClose && (campaign.canEdit || canUseShopBulkBuy || isSuperAdmin) && (
        <TouchableOpacity style={styles.closeBtn} onPress={closeCampaign} disabled={acting}>
          <Text style={styles.closeBtnText}>Close campaign</Text>
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

      {pollDates.length > 0 && campaign.isSubscribed && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vote for visit day</Text>
          <Text style={styles.offerNote}>Pick a day that works for you. If it matches a store&apos;s proposed day, that becomes the final visit day.</Text>
          {pollDates.map((date) => (
            <TouchableOpacity key={date} style={styles.pollChip} onPress={() => votePoll(date)} disabled={acting}>
              <Text style={styles.pollChipText}>{date}</Text>
              <Text style={styles.pollVotes}>{pollVotes[date] || 0} votes</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {myCommitment?.commitmentStatus === 'token_pending' && (
        <TouchableOpacity style={styles.primaryBtn} onPress={payToken} disabled={acting}>
          <Text style={styles.primaryBtnText}>
            Pay booking token ({formatBulkBuyTokenAmount(myCommitment.tokenAmount)})
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
          {campaign.offers.map((offer) => {
            const isMyOffer = myCommitment?.acceptedOfferId === offer.id;
            const canAccept = isCustomer
              && ['offers_available', 'ready_for_offers'].includes(campaign.status)
              && !myCommitment;
            return (
              <View key={offer.id} style={[styles.offerCard, isMyOffer && styles.offerCardSelected]}>
                <Text style={styles.offerShop}>{offer.shop?.name || 'Store'}</Text>
                <Text style={styles.offerDiscount}>{formatBulkBuyDiscount(offer)}</Text>
                <Text style={styles.offerExtra}>{formatBulkBuyTokenAmount(offer.tokenAmount)} booking token</Text>
                <Text style={styles.offerExtra}>
                  {formatBulkBuyAcceptanceCount(offer.acceptanceCount, campaign.subscriberCount)}
                </Text>
                {offer.proposedDealDay ? (
                  <Text style={styles.offerExtra}>Proposed visit day: {offer.proposedDealDay}</Text>
                ) : null}
                {offer.confirmedDealDay ? (
                  <Text style={styles.offerExtra}>Confirmed visit day: {offer.confirmedDealDay}</Text>
                ) : null}
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
                {canAccept && (
                  <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptOffer(offer.id)} disabled={acting}>
                    <Text style={styles.acceptBtnText}>Accept this deal</Text>
                  </TouchableOpacity>
                )}
                {isMyOffer && (
                  <Text style={styles.selectedBadge}>You selected this store</Text>
                )}
              </View>
            );
          })}
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
    commitmentBox: {
      marginTop: 16,
      padding: 14,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.brand,
    },
    commitmentTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
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
    secondaryActionBtn: {
      marginTop: 12,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    secondaryActionText: { color: colors.text, fontWeight: '600', fontSize: 14, textAlign: 'center' },
    closeBtn: {
      marginTop: 12,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#ef4444',
    },
    closeBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
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
    offerCardSelected: { borderColor: colors.brand, borderWidth: 2 },
    offerShop: { fontSize: 16, fontWeight: '700', color: colors.text },
    offerDiscount: { fontSize: 18, fontWeight: '800', color: colors.brand, marginTop: 6 },
    offerExtra: { fontSize: 14, color: colors.text, marginTop: 4 },
    offerTerms: { fontSize: 13, color: colors.textMuted, marginTop: 8, lineHeight: 18 },
    offerPhone: { fontSize: 14, color: colors.text, marginTop: 8, fontWeight: '600' },
    offerNote: { fontSize: 13, color: colors.textMuted, marginBottom: 10, lineHeight: 18 },
    acceptBtn: {
      marginTop: 12,
      backgroundColor: colors.brand,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
    },
    acceptBtnText: { color: '#fff', fontWeight: '700' },
    selectedBadge: { marginTop: 10, color: colors.brand, fontWeight: '700' },
    pollChip: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      marginBottom: 8,
    },
    pollChipText: { fontSize: 15, fontWeight: '600', color: colors.text },
    pollVotes: { fontSize: 13, color: colors.textMuted },
  });
}
