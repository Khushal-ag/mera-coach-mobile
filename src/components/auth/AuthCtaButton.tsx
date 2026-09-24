import React from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  IconSize,
  PressOpacity,
  Radius,
  Spacing,
  headingFont,
} from '../../constants/theme';
import type { IoniconName } from '../../types/icons';

export type AuthCtaVariant = 'authPrimary' | 'authSecondary' | 'authBack';

interface AuthCtaButtonProps {
  label: string;
  onPress: () => void;
  variant: AuthCtaVariant;
  leftIcon?: IoniconName;
  /** When true, leading control is a circular back arrow (no trailing forward). */
  backArrow?: boolean;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const AUTH_CTA_HEIGHT = 48;
const SIDE_INSET = 10;

/** Pill CTAs for auth: centered label; side icons absolutely positioned. */
export default function AuthCtaButton({
  label,
  onPress,
  variant,
  leftIcon,
  backArrow = false,
  loading = false,
  disabled = false,
  accessibilityLabel,
  style,
}: AuthCtaButtonProps) {
  const isDisabled = disabled || loading;
  const isOutlined = variant === 'authSecondary' || variant === 'authBack';
  const labelColor = isOutlined ? Colors.authCtaGradientStart : Colors.white;
  const iconColor = Colors.authCtaGradientStart;
  const arrowFill = Colors.white;
  const arrowGlyph = Colors.authCtaGradientStart;
  const spinnerColor = isOutlined ? Colors.authCtaGradientStart : Colors.white;

  const body = loading ? (
    <ActivityIndicator color={spinnerColor} size="small" />
  ) : (
    <>
      <Text style={[styles.label, { color: labelColor }]} numberOfLines={1}>
        {label}
      </Text>

      {backArrow ? (
        <View style={[styles.sideSlot, styles.sideLeft]} pointerEvents="none">
          <View
            style={[styles.arrowCircle, styles.arrowCircleBordered, { backgroundColor: arrowFill }]}
          >
            <Ionicons name="arrow-back" size={IconSize.sm} color={arrowGlyph} />
          </View>
        </View>
      ) : null}

      {leftIcon && !backArrow ? (
        <View style={[styles.sideSlot, styles.sideLeft]} pointerEvents="none">
          <Ionicons name={leftIcon} size={IconSize.lg} color={iconColor} />
        </View>
      ) : null}

      {!backArrow ? (
        <View style={[styles.sideSlot, styles.sideRight]} pointerEvents="none">
          <View
            style={[
              styles.arrowCircle,
              { backgroundColor: arrowFill },
              isOutlined && styles.arrowCircleBordered,
            ]}
          >
            <Ionicons name="arrow-forward" size={IconSize.sm} color={arrowGlyph} />
          </View>
        </View>
      ) : null}
    </>
  );

  return (
    <TouchableOpacity
      style={[styles.touchable, isDisabled && styles.disabled, style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={PressOpacity.default}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {variant === 'authPrimary' ? (
        <View style={[styles.inner, styles.primary]}>{body}</View>
      ) : (
        <View style={[styles.inner, styles.outlined]}>{body}</View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  inner: {
    height: AUTH_CTA_HEIGHT,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  primary: {
    backgroundColor: Colors.authCtaGradientEnd,
  },
  outlined: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.authCtaGradientStart,
  },
  disabled: { opacity: 0.7 },
  label: {
    fontSize: 15,
    fontFamily: headingFont.semibold,
    textAlign: 'center',
  },
  sideSlot: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  sideLeft: {
    left: SIDE_INSET,
  },
  sideRight: {
    right: SIDE_INSET,
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowCircleBordered: {
    borderWidth: 1.5,
    borderColor: Colors.authCtaGradientStart,
  },
});
