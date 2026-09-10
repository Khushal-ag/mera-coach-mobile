import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Colors, FontFamily, Spacing } from '../constants/theme';

/** Subtle QA affordance when packages / events / gallery come from local demo store. */
export default function DemoModeHint({ message }: { message?: string }) {
  return (
    <Text style={styles.hint} accessibilityRole="text">
      {message ?? 'Demo data — stored on this device only until the API supports it.'}
    </Text>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    marginBottom: Spacing.sm,
    lineHeight: 17,
  },
});
