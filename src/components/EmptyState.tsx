import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, IconSize, Radius, Spacing, headingFont } from '../constants/theme';
import type { IoniconName } from '../types/icons';
import AppButton from './AppButton';

interface EmptyStateProps {
  icon?: IoniconName;
  illustration?: ImageSourcePropType;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function EmptyState({
  icon = 'file-tray-outline',
  illustration,
  title,
  message,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.wrap, style]}>
      {illustration ? (
        <Image source={illustration} style={styles.illustration} resizeMode="contain" />
      ) : (
        <View style={styles.iconBox}>
          <Ionicons name={icon} size={IconSize.xxl} color={Colors.textLight} />
        </View>
      )}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <AppButton
          label={actionLabel}
          onPress={onAction}
          icon="arrow-forward"
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxxl,
  },
  illustration: {
    width: 168,
    height: 168,
    marginBottom: Spacing.md,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: headingFont.extraBold,
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
    maxWidth: 300,
  },
  action: {
    marginTop: Spacing.lg,
    minWidth: 160,
  },
});
