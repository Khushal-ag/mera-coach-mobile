import React from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  StyleSheet,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, IconSize, PressOpacity, buttonStyles } from '../constants/theme';
import type { IoniconName } from '../types/icons';

type AppButtonVariant = 'primary' | 'secondary' | 'ghost';
type AppButtonSize = 'default' | 'compact';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: AppButtonVariant;
  /** Use compact for list CTAs, diet Add, re-checkup, and toolbar actions. */
  size?: AppButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: IoniconName;
  iconPosition?: 'left' | 'right';
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

/**
 * Shared CTA used across auth, forms, and empty/error recovery.
 * Prefer this over one-off terracotta pill buttons.
 */
export default function AppButton({
  label,
  onPress,
  variant = 'primary',
  size = 'default',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'right',
  accessibilityLabel,
  style,
  textStyle,
}: AppButtonProps) {
  const isDisabled = disabled || loading;
  const isCompact = size === 'compact';

  let chrome: ViewStyle = styles.primary;
  let labelStyle: TextStyle = styles.primaryText;
  if (isCompact) {
    if (variant === 'secondary') {
      chrome = styles.compactSecondary;
      labelStyle = styles.compactSecondaryText;
    } else if (variant === 'ghost') {
      chrome = styles.compactGhost;
      labelStyle = styles.compactGhostText;
    } else {
      chrome = styles.compact;
      labelStyle = styles.compactText;
    }
  } else if (variant === 'secondary') {
    chrome = styles.secondary;
    labelStyle = styles.secondaryText;
  } else if (variant === 'ghost') {
    chrome = styles.ghost;
    labelStyle = styles.ghostText;
  }

  const spinnerColor = variant === 'primary' ? Colors.white : Colors.primary;
  const iconColor =
    variant === 'primary'
      ? Colors.white
      : variant === 'secondary'
        ? Colors.secondary
        : Colors.primary;
  const iconSz = isCompact ? IconSize.sm : IconSize.md;

  return (
    <TouchableOpacity
      style={[chrome, isDisabled && styles.disabled, style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={PressOpacity.default}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} size="small" />
      ) : (
        <>
          {icon && iconPosition === 'left' ? (
            <Ionicons name={icon} size={iconSz} color={iconColor} />
          ) : null}
          <Text style={[labelStyle, textStyle]}>{label}</Text>
          {icon && iconPosition === 'right' ? (
            <Ionicons name={icon} size={iconSz} color={iconColor} />
          ) : null}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  primary: buttonStyles.primary,
  primaryText: buttonStyles.primaryText,
  secondary: buttonStyles.secondary,
  secondaryText: buttonStyles.secondaryText,
  ghost: buttonStyles.ghost,
  ghostText: buttonStyles.ghostText,
  compact: buttonStyles.compact,
  compactText: buttonStyles.compactText,
  compactSecondary: buttonStyles.compactSecondary,
  compactSecondaryText: buttonStyles.compactSecondaryText,
  compactGhost: buttonStyles.compactGhost,
  compactGhostText: buttonStyles.compactGhostText,
  disabled: buttonStyles.disabled,
});
