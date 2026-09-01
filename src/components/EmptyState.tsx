import React from 'react';
import { View, Text, Image, StyleSheet, type ImageSourcePropType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, Spacing } from '../constants/theme';
import type { IoniconName } from '../types/icons';

interface EmptyStateProps {
  icon?: IoniconName;
  illustration?: ImageSourcePropType;
  title: string;
  message: string;
}

export default function EmptyState({
  icon = 'file-tray-outline',
  illustration,
  title,
  message,
}: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      {illustration ? (
        <Image source={illustration} style={styles.illustration} resizeMode="contain" />
      ) : (
        <View style={styles.iconBox}>
          <Ionicons name={icon} size={28} color={Colors.textLight} />
        </View>
      )}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: 48,
  },
  illustration: {
    width: 168,
    height: 168,
    marginBottom: Spacing.md,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: FontFamily.extraBold,
    fontSize: 17,
    color: Colors.textDark,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  message: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
});
