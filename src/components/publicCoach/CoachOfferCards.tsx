import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import {
  Colors,
  FontFamily,
  PressOpacity,
  Radius,
  Shadow,
  Spacing,
  headingFont,
} from '../../constants/theme';
import { BrandImages } from '../../constants/images';
import { isDegenerateImageSize, resolveMediaUrl } from '../../utils/mediaUrl';
import type { CoachEvent, CoachPackage } from '../../types/models';

export function PackageCard({ pkg, onSelect }: { pkg: CoachPackage; onSelect: () => void }) {
  const imageUri = resolveMediaUrl(pkg.imageUrl);
  const [imageFailed, setImageFailed] = useState(false);
  const [trackedImage, setTrackedImage] = useState(pkg.imageUrl);
  if (pkg.imageUrl !== trackedImage) {
    setTrackedImage(pkg.imageUrl);
    setImageFailed(false);
  }
  const showImage = Boolean(imageUri) && !imageFailed;

  return (
    <TouchableOpacity
      style={styles.offerCard}
      onPress={onSelect}
      activeOpacity={PressOpacity.soft}
      accessibilityRole="button"
      accessibilityLabel={`Enquire about ${pkg.name}`}
    >
      <View style={styles.offerImageWrap}>
        {showImage ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.offerImage}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
            onLoad={e => {
              const { width, height } = e.nativeEvent.source;
              if (isDegenerateImageSize(width, height)) setImageFailed(true);
            }}
          />
        ) : (
          <Image
            source={BrandImages.emptyCheckups}
            style={styles.offerImagePlaceholder}
            resizeMode="contain"
          />
        )}
      </View>
      <View style={styles.offerCardBodyWrap}>
        <View style={styles.offerCardHeader}>
          <Text style={styles.offerCardTitle} numberOfLines={2}>
            {pkg.name}
          </Text>
          {pkg.price ? (
            <Text style={styles.offerCardPrice} numberOfLines={1}>
              {pkg.price}
            </Text>
          ) : null}
        </View>
        {pkg.duration ? <Text style={styles.offerCardMeta}>{pkg.duration}</Text> : null}
        {pkg.description ? (
          <Text style={styles.offerCardBody} numberOfLines={3}>
            {pkg.description}
          </Text>
        ) : null}
        <Text style={styles.offerCardCta}>Enquire about this package</Text>
      </View>
    </TouchableOpacity>
  );
}

export function EventCard({ event }: { event: CoachEvent }) {
  const meta = [event.date, event.time, event.location].filter(Boolean).join(' · ');
  const imageUri = resolveMediaUrl(event.imageUrl);
  const [imageFailed, setImageFailed] = useState(false);
  const [trackedImage, setTrackedImage] = useState(event.imageUrl);
  if (event.imageUrl !== trackedImage) {
    setTrackedImage(event.imageUrl);
    setImageFailed(false);
  }
  const showImage = Boolean(imageUri) && !imageFailed;

  const openLink = () => {
    const url = event.link.trim();
    if (!url) return;
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    Linking.openURL(href).catch(() => Alert.alert('Unable to open link'));
  };

  return (
    <View style={styles.offerCard}>
      <View style={styles.offerImageWrap}>
        {showImage ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.offerImage}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
            onLoad={e => {
              const { width, height } = e.nativeEvent.source;
              if (isDegenerateImageSize(width, height)) setImageFailed(true);
            }}
          />
        ) : (
          <Image
            source={BrandImages.emptyLeads}
            style={styles.offerImagePlaceholder}
            resizeMode="contain"
          />
        )}
      </View>
      <View style={styles.offerCardBodyWrap}>
        <Text style={styles.offerCardTitle} numberOfLines={2}>
          {event.title}
        </Text>
        {meta ? <Text style={styles.offerCardMeta}>{meta}</Text> : null}
        {event.link ? (
          <TouchableOpacity
            onPress={openLink}
            activeOpacity={PressOpacity.soft}
            accessibilityRole="link"
            accessibilityLabel={`Open event link for ${event.title}`}
          >
            <Text style={styles.offerCardCta}>Open event link</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  offerCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  offerImageWrap: {
    height: 140,
    backgroundColor: Colors.backgroundTan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerImage: {
    width: '100%',
    height: '100%',
  },
  offerImagePlaceholder: {
    width: '62%',
    height: '72%',
  },
  offerCardBodyWrap: {
    padding: Spacing.md,
  },
  offerCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  offerCardTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: headingFont.bold,
    color: Colors.textDark,
  },
  offerCardPrice: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    color: Colors.primary,
  },
  offerCardMeta: {
    fontSize: 12,
    fontFamily: FontFamily.semibold,
    color: Colors.textLight,
    marginTop: 6,
  },
  offerCardBody: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.textDark,
    lineHeight: 18,
    marginTop: Spacing.xs,
  },
  offerCardCta: {
    marginTop: 10,
    fontSize: 12,
    fontFamily: FontFamily.bold,
    color: Colors.secondary,
  },
});
