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
import { Colors, IconSize, PressOpacity, Radius, headingFont } from '../constants/theme';

interface GreenSubmitButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export default function GreenSubmitButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  accessibilityLabel,
  style,
}: GreenSubmitButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[styles.btn, isDisabled && styles.disabled, style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={PressOpacity.default}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={Colors.white} />
      ) : (
        <>
          <Text style={styles.label}>{label}</Text>
          <View style={styles.arrow}>
            <Ionicons name="arrow-forward" size={IconSize.sm} color={Colors.accentInk} />
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 56,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accentInk,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 56,
  },
  disabled: { opacity: 0.55 },
  label: {
    color: Colors.white,
    fontFamily: headingFont.semibold,
    fontSize: 18,
    lineHeight: 24,
  },
  arrow: {
    position: 'absolute',
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
