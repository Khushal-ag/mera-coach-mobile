import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontFamily,
  IconSize,
  PressOpacity,
  Shadow,
  Spacing,
  buttonStyles,
} from '../../constants/theme';

const PDF_PREPARING_LABEL = 'Preparing PDF…';

type Variant = 'headerOnDark' | 'headerOnLight' | 'primary';

interface PdfDownloadShareButtonProps {
  onPress: () => void;
  loading: boolean;
  disabled?: boolean;
  variant: Variant;
  style?: StyleProp<ViewStyle>;
}

export default function PdfDownloadShareButton({
  onPress,
  loading,
  disabled,
  variant,
  style,
}: PdfDownloadShareButtonProps) {
  const isPrimary = variant === 'primary';
  const onDark = variant === 'headerOnDark';
  const idleLabel = isPrimary ? 'Download & Share PDF' : 'PDF';
  const label = loading ? PDF_PREPARING_LABEL : idleLabel;
  const a11yLabel = loading
    ? 'Preparing PDF for download and share'
    : isPrimary
      ? 'Download and share PDF report'
      : 'Download PDF report';

  if (isPrimary) {
    return (
      <TouchableOpacity
        style={[styles.primaryBtn, (loading || disabled) && styles.disabled, style]}
        onPress={onPress}
        disabled={loading || disabled}
        activeOpacity={PressOpacity.default}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
      >
        {loading ? (
          <>
            <ActivityIndicator color={Colors.white} size="small" />
            <Text style={styles.primaryText}>{label}</Text>
          </>
        ) : (
          <>
            <Ionicons name="download-outline" size={IconSize.md} color={Colors.white} />
            <Text style={styles.primaryText}>{label}</Text>
          </>
        )}
      </TouchableOpacity>
    );
  }

  const iconColor = onDark ? Colors.white : Colors.textDark;
  const textStyle = onDark ? styles.headerChipTextOnDark : styles.headerChipTextOnLight;

  return (
    <TouchableOpacity
      style={[
        styles.headerChip,
        onDark ? styles.headerChipOnDark : styles.headerChipOnLight,
        loading && styles.headerChipLoading,
        (loading || disabled) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={PressOpacity.default}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
    >
      {loading ? (
        <>
          <ActivityIndicator color={iconColor} size="small" />
          <Text style={[styles.headerChipText, textStyle, styles.headerChipLoadingText]}>
            {label}
          </Text>
        </>
      ) : (
        <>
          <Ionicons name="download-outline" size={IconSize.sm} color={iconColor} />
          <Text style={[styles.headerChipText, textStyle]}>{idleLabel}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  primaryBtn: {
    ...buttonStyles.primary,
    minHeight: 48,
    paddingVertical: Spacing.sm + 2,
  },
  primaryText: {
    color: Colors.white,
    fontFamily: FontFamily.bold,
    fontSize: 15,
  },
  headerChip: {
    ...buttonStyles.compact,
    backgroundColor: 'transparent',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm - 2,
  },
  headerChipOnDark: {
    backgroundColor: Colors.onDarkOverlay,
  },
  headerChipOnLight: {
    backgroundColor: Colors.white,
    ...Shadow.md,
  },
  headerChipLoading: {
    paddingHorizontal: Spacing.sm,
  },
  headerChipText: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
  },
  headerChipTextOnDark: { color: Colors.white },
  headerChipTextOnLight: { color: Colors.textDark },
  headerChipLoadingText: { fontSize: 11 },
  disabled: buttonStyles.disabled,
});
