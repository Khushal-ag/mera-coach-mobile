import React from 'react';
import { Image, StyleSheet, type StyleProp, type ImageStyle } from 'react-native';
import { BrandImages, LOGO_ASPECT } from '../constants/images';

type BrandLogoVariant = 'full' | 'mark' | 'wordmark';

interface BrandLogoProps {
  /** Height in points; width follows the variant aspect ratio. */
  size?: number;
  variant?: BrandLogoVariant;
  style?: StyleProp<ImageStyle>;
}

const SOURCES: Record<BrandLogoVariant, number> = {
  full: BrandImages.logoFull,
  mark: BrandImages.logoMark,
  wordmark: BrandImages.logoWordmark,
};

export default function BrandLogo({ size = 60, variant = 'full', style }: BrandLogoProps) {
  const height = size;
  const width = size * LOGO_ASPECT[variant];

  return (
    <Image
      source={SOURCES[variant]}
      accessibilityLabel="Mera Coach"
      style={[styles.image, { width, height }, style]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: 'transparent' },
});
