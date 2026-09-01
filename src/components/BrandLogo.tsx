import React from 'react';
import { Image, StyleSheet, type StyleProp, type ImageStyle } from 'react-native';
import { Radius } from '../constants/theme';
import { BrandImages } from '../constants/images';

interface BrandLogoProps {
  size?: number;
  /** Cream leaf tile for dark headers; green mark for light surfaces. */
  variant?: 'onDark' | 'onLight';
  style?: StyleProp<ImageStyle>;
}

export default function BrandLogo({ size = 60, variant = 'onDark', style }: BrandLogoProps) {
  return (
    <Image
      source={variant === 'onLight' ? BrandImages.leafMark : BrandImages.leafCream}
      accessibilityLabel="Mera Coach"
      style={[
        styles.image,
        { width: size, height: size, borderRadius: Math.min(Radius.md, size * 0.28) },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: 'transparent' },
});
