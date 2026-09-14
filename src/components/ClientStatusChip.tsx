import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { clientStatusTone, statusChipStyles } from '../constants/theme';

interface ClientStatusChipProps {
  status: string;
  style?: StyleProp<ViewStyle>;
}

/** Shared Active / Checkup Due / New badge — text + tone (not color-only). */
export default function ClientStatusChip({ status, style }: ClientStatusChipProps) {
  const tone = clientStatusTone(status);
  return (
    <View
      style={[
        styles.chip,
        tone === 'active' && styles.toneActive,
        tone === 'warning' && styles.toneWarning,
        tone === 'new' && styles.toneNew,
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${status}`}
    >
      <Text
        style={[
          styles.text,
          tone === 'active' && styles.toneActiveText,
          tone === 'warning' && styles.toneWarningText,
          tone === 'new' && styles.toneNewText,
        ]}
      >
        {status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: statusChipStyles.compact,
  text: statusChipStyles.compactText,
  toneActive: statusChipStyles.toneActive,
  toneWarning: statusChipStyles.toneWarning,
  toneNew: statusChipStyles.toneNew,
  toneActiveText: statusChipStyles.toneActiveText,
  toneWarningText: statusChipStyles.toneWarningText,
  toneNewText: statusChipStyles.toneNewText,
});
