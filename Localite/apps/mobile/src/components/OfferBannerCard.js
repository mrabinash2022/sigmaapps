import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { formatOfferDiscount } from '@localite/shared';
import { resolveMediaUrl } from '../utils/profile';

export default function OfferBannerCard({ offer, colors, compact = false }) {
  const styles = createStyles(colors, compact);
  const bannerUrl = resolveMediaUrl(offer?.bannerImageUrl);

  return (
    <View style={styles.card}>
      {bannerUrl ? (
        <Image source={{ uri: bannerUrl }} style={styles.banner} resizeMode="cover" />
      ) : null}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={compact ? 1 : 2}>{offer.title}</Text>
        {offer.shop?.name ? <Text style={styles.shop}>{offer.shop.name}</Text> : null}
        <Text style={styles.discount}>{formatOfferDiscount(offer)}</Text>
        {!compact && offer.description ? (
          <Text style={styles.desc}>{offer.description}</Text>
        ) : null}
      </View>
    </View>
  );
}

function createStyles(colors, compact) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.linkCardBg,
      borderRadius: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.linkCardBorder,
      overflow: 'hidden',
    },
    banner: {
      width: '100%',
      height: compact ? 72 : 120,
    },
    body: {
      padding: compact ? 10 : 14,
    },
    title: {
      fontSize: compact ? 14 : 16,
      fontWeight: '700',
      color: colors.text,
    },
    shop: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 4,
    },
    discount: {
      fontSize: compact ? 13 : 15,
      fontWeight: '700',
      color: colors.brand,
      marginTop: 6,
    },
    desc: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 4,
    },
  });
}
