import React from 'react';
import { Image, StyleSheet, type StyleProp, type ImageStyle } from 'react-native';
import { BrandImages, LOGO_ASPECT } from '../constants/images';

interface BrandLogoProps {
  /** Height in points; width follows the full-logo aspect ratio. */
  size?: number;
  style?: StyleProp<ImageStyle>;
}

export default function BrandLogo({ size = 60, style }: BrandLogoProps) {
  const height = size;
  const width = size * LOGO_ASPECT.full;

  return (
    <Image
      source={BrandImages.logoFull}
      accessibilityLabel="Mera Coach"
      style={[styles.image, { width, height }, style]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: 'transparent' },
});
