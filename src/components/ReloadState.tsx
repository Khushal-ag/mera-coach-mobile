import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, Radius, Shadow, Spacing } from '../constants/theme';
import { BrandImages } from '../constants/images';
import type { IoniconName } from '../types/icons';

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
          <Ionicons name={icon} size={30} color={Colors.primary} />
        </View>
      )}

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      <TouchableOpacity
        style={[styles.retryBtn, loading && styles.retryBtnDisabled]}
        onPress={onRetry}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel={retryLabel}
      >
        {loading ? (
          <ActivityIndicator color={Colors.white} size="small" />
        ) : (
          <>
            <Ionicons name="refresh" size={16} color={Colors.white} />
            <Text style={styles.retryText}>{retryLabel}</Text>
          </>
        )}
      </TouchableOpacity>

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
    paddingVertical: 40,
  },
  illustration: {
    width: 180,
    height: 180,
    marginBottom: Spacing.sm,
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  title: {
    fontFamily: FontFamily.extraBold,
    fontSize: 18,
    color: Colors.textDark,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  message: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 300,
    marginBottom: Spacing.lg,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingHorizontal: 22,
    paddingVertical: 13,
    minWidth: 148,
    ...Shadow.md,
  },
  retryBtnDisabled: { opacity: 0.75 },
  retryText: {
    color: Colors.white,
    fontFamily: FontFamily.bold,
    fontSize: 15,
  },
  hint: {
    marginTop: Spacing.md,
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.textLight,
    textAlign: 'center',
  },
});
