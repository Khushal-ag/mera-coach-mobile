import React from 'react';
import { Text, StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { Colors, FontFamily } from '../constants/theme';

type BrandWordmarkTone = 'onDark' | 'onLight';
type BrandWordmarkSize = 'sm' | 'md' | 'lg';

interface BrandWordmarkProps {
  /** Optional leading text, e.g. "with " */
  prefix?: string;
  tone?: BrandWordmarkTone;
  size?: BrandWordmarkSize;
  align?: 'left' | 'center';
  style?: StyleProp<TextStyle>;
}

const SIZE = {
  sm: { base: 13, brand: 14, lineHeight: 18 },
  md: { base: 16, brand: 18, lineHeight: 24 },
  lg: { base: 18, brand: 22, lineHeight: 28 },
} as const;

export default function BrandWordmark({
  prefix,
  tone = 'onDark',
  size = 'md',
  align = 'center',
  style,
}: BrandWordmarkProps) {
  const scale = SIZE[size];
  const meraColor = tone === 'onDark' ? Colors.brandMeraOnDark : Colors.secondary;
  const coachColor = tone === 'onDark' ? Colors.brandCoach : Colors.accent;
  const prefixColor = tone === 'onDark' ? Colors.onDarkMuted : Colors.textLight;

  return (
    <Text
      style={[
        styles.root,
        { fontSize: scale.base, lineHeight: scale.lineHeight, textAlign: align },
        style,
      ]}
    >
      {prefix ? (
        <Text style={[styles.prefix, { color: prefixColor, fontSize: scale.base }]}>{prefix}</Text>
      ) : null}
      <Text
        style={[
          styles.mera,
          {
            color: meraColor,
            fontSize: scale.brand,
            ...(tone === 'onDark' ? styles.meraOnDark : null),
          },
        ]}
      >
        mera
      </Text>
      <Text style={[styles.coach, { color: coachColor, fontSize: scale.brand }]}> coach</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  root: {
    fontFamily: FontFamily.semibold,
  },
  prefix: {
    fontFamily: FontFamily.semibold,
  },
  mera: {
    fontFamily: FontFamily.extraBold,
    letterSpacing: 0.3,
  },
  meraOnDark: {
    textShadowColor: 'rgba(168, 196, 180, 0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
  coach: {
    fontFamily: FontFamily.extraBold,
    letterSpacing: 0.3,
  },
});
