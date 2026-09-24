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
import {
  Colors,
  IconSize,
  Radius,
  Shadow,
  Spacing,
  Typography,
  headingFont,
} from '../constants/theme';
import { BrandImages } from '../constants/images';
import type { IoniconName } from '../types/icons';
import AppButton from './AppButton';

interface ReloadStateProps {
  title?: string;
  message: string;
  onRetry: () => void;
  retryLabel?: string;
  illustration?: ImageSourcePropType;
  icon?: IoniconName;
  loading?: boolean;
  /** Hide pull-to-refresh hint (e.g. crash boundary). */
  showPullHint?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Friendly full-screen / list error state with illustration and retry CTA. */
export default function ReloadState({
  title = 'Connection took a breather',
  message,
  onRetry,
  retryLabel = 'Try again',
  illustration = BrandImages.emptyError,
  icon = 'cloud-offline-outline',
  loading = false,
  showPullHint = true,
  style,
}: ReloadStateProps) {
  return (
    <View style={[styles.wrap, style]}>
      {illustration ? (
        <Image source={illustration} style={styles.illustration} resizeMode="contain" />
      ) : (
        <View style={styles.iconBox}>
          <Ionicons name={icon} size={IconSize.xxl} color={Colors.primary} />
        </View>
      )}

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      <AppButton
        label={retryLabel}
        onPress={onRetry}
        loading={loading}
        icon="refresh"
        iconPosition="left"
        style={styles.retryBtn}
      />

      {showPullHint ? <Text style={styles.hint}>Pull down to refresh works too.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  illustration: {
    width: 180,
    height: 180,
    marginBottom: Spacing.sm,
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  title: {
    fontFamily: headingFont.extraBold,
    fontSize: 18,
    color: Colors.textDark,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  message: {
    ...Typography.body,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 300,
    marginBottom: Spacing.lg,
  },
  retryBtn: {
    minWidth: 148,
  },
  hint: {
    marginTop: Spacing.md,
    ...Typography.micro,
    textAlign: 'center',
  },
});
