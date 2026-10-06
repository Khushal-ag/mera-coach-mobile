import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontFamily,
  HitSlop,
  IconSize,
  PressOpacity,
  Spacing,
  TouchTarget,
  headingFont,
} from '../../constants/theme';

type Props = {
  onHomePress: () => void;
};

export default function PublicHomeHeader({ onHomePress }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.brandBlock}>
        <Text style={styles.brandLine} accessibilityRole="header">
          <Text style={styles.mera}>Mera</Text>
          <Text style={styles.coach}>Coach</Text>
        </Text>
        <Text style={styles.tagline}>
          Guide <Text style={styles.dot}>•</Text> Support <Text style={styles.dot}>•</Text>{' '}
          transform
        </Text>
      </View>
      <Pressable
        onPress={onHomePress}
        hitSlop={HitSlop.sm}
        style={({ pressed }) => [styles.homeBtn, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Home"
      >
        <Ionicons name="home-outline" size={IconSize.xl} color={Colors.accentInk} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandBlock: {
    flexShrink: 1,
    paddingRight: Spacing.sm,
  },
  brandLine: {
    fontFamily: headingFont.bold,
    fontSize: 22,
    lineHeight: 28,
  },
  mera: {
    fontFamily: headingFont.bold,
    color: Colors.secondary,
  },
  coach: {
    fontFamily: headingFont.bold,
    color: Colors.brandCoach,
  },
  tagline: {
    marginTop: 2,
    fontFamily: FontFamily.medium,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.secondary,
  },
  dot: {
    color: Colors.brandCoach,
    fontFamily: FontFamily.bold,
  },
  homeBtn: {
    width: TouchTarget.header,
    height: TouchTarget.header,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: PressOpacity.default,
  },
});
