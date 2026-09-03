import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import BrandLogo from './BrandLogo';
import BrandWordmark from './BrandWordmark';
import { Spacing } from '../constants/theme';

type BrandLockupTone = 'onDark' | 'onLight';
type BrandLockupSize = 'md' | 'lg';

interface BrandLockupProps {
  tone?: BrandLockupTone;
  size?: BrandLockupSize;
  style?: StyleProp<ViewStyle>;
}

const MARK_SIZE = { md: 72, lg: 96 } as const;
const WORDMARK_SIZE = { md: 'md' as const, lg: 'lg' as const };

/** Icon mark + readable wordmark — use on dark green backgrounds where PNG wordmark greens vanish. */
export default function BrandLockup({ tone = 'onDark', size = 'lg', style }: BrandLockupProps) {
  return (
    <View style={[styles.lockup, style]} accessibilityRole="image" accessibilityLabel="Mera Coach">
      <BrandLogo variant="mark" size={MARK_SIZE[size]} />
      <BrandWordmark tone={tone} size={WORDMARK_SIZE[size]} style={styles.wordmark} />
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: {
    alignItems: 'center',
  },
  wordmark: {
    marginTop: Spacing.sm,
  },
});
