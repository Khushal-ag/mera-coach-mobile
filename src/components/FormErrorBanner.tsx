import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '../constants/theme';

interface FormErrorBannerProps {
  message: string | null | undefined;
}

/** Shared top-of-form validation / submit error banner. */
export default function FormErrorBanner({ message }: FormErrorBannerProps) {
  if (!message) return null;
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Ionicons name="alert-circle" size={18} color={Colors.destructive} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.destructive,
    padding: 12,
    marginBottom: 16,
  },
  text: { color: Colors.destructive, fontSize: 13, fontWeight: '600', flex: 1 },
});
