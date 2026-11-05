import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, IconSize, Radius, Spacing } from '../constants/theme';

interface InfoBannerProps {
  children: React.ReactNode;
}

/** Non-blocking guidance (profile gates, tips). Pair with FormErrorBanner for failures. */
export default function InfoBanner({ children }: InfoBannerProps) {
  return (
    <View style={styles.banner} accessibilityRole="text">
      <Ionicons name="information-circle-outline" size={IconSize.md} color={Colors.secondary} />
      <Text style={styles.text}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  text: {
    color: Colors.textDark,
    fontSize: 13,
    fontFamily: FontFamily.regular,
    lineHeight: 18,
    flex: 1,
  },
});
