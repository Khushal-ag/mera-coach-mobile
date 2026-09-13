import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, IconSize, Radius, Spacing } from '../constants/theme';

interface FormErrorBannerProps {
  message: string | null | undefined;
}

export default function FormErrorBanner({ message }: FormErrorBannerProps) {
  if (!message) return null;
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Ionicons name="alert-circle" size={IconSize.md} color={Colors.destructive} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.destructiveSoft,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.destructive,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  text: {
    color: Colors.destructive,
    fontSize: 13,
    fontFamily: FontFamily.semibold,
    flex: 1,
  },
});
