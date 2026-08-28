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
import { Colors, Radius, Shadow } from '../constants/theme';

export const PDF_PREPARING_LABEL = 'Preparing PDF…';

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
            <Ionicons name="download-outline" size={18} color={Colors.white} />
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
          <Ionicons name="download-outline" size={16} color={iconColor} />
          <Text style={[styles.headerChipText, textStyle]}>{idleLabel}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 20,
    ...Shadow.md,
  },
  primaryText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  headerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  headerChipOnDark: {
    backgroundColor: Colors.onDarkOverlay,
  },
  headerChipOnLight: {
    backgroundColor: Colors.white,
    ...Shadow.md,
  },
  headerChipLoading: {
    paddingHorizontal: 12,
  },
  headerChipText: { fontSize: 12, fontWeight: '700' },
  headerChipTextOnDark: { color: Colors.white },
  headerChipTextOnLight: { color: Colors.textDark },
  headerChipLoadingText: { fontSize: 11 },
  disabled: { opacity: 0.7 },
});
