import React from 'react';
import { TouchableOpacity, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, HitSlop, IconSize, PressOpacity, TouchTarget } from '../constants/theme';

/**
 * Shared chrome buttons for light (tab roots) and dark (overlays) headers.
 * Prefer WaveScreenHeader for pushed coach-app screens.
 */

interface HeaderBackButtonProps {
  onPress: () => void;
  /** White translucent control for dark (green) headers. Default true. */
  onDark?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function HeaderBackButton({
  onPress,
  onDark = true,
  style,
  accessibilityLabel = 'Go back',
}: HeaderBackButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.chromeBtn, onDark ? styles.chromeOnDark : styles.chromeOnLight, style]}
      onPress={onPress}
      hitSlop={HitSlop.sm}
      activeOpacity={PressOpacity.default}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons
        name="chevron-back-outline"
        size={IconSize.lg}
        color={onDark ? Colors.white : Colors.accentInk}
      />
    </TouchableOpacity>
  );
}

interface HeaderHomeButtonProps {
  onPress?: () => void;
  /** White translucent control for dark (green) headers. Default true. */
  onDark?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function HeaderHomeButton({
  onPress,
  onDark = true,
  style,
  accessibilityLabel = 'Home',
}: HeaderHomeButtonProps) {
  const navigation = useNavigation();
  const handlePress = onPress ?? (() => navigation.navigate('Home', { page: 0 }));

  return (
    <TouchableOpacity
      style={[styles.chromeBtn, onDark ? styles.chromeOnDark : styles.chromeOnLight, style]}
      onPress={handlePress}
      hitSlop={HitSlop.sm}
      activeOpacity={PressOpacity.default}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons
        name="home-outline"
        size={IconSize.lg}
        color={onDark ? Colors.white : Colors.accentInk}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chromeBtn: {
    width: TouchTarget.header,
    height: TouchTarget.header,
    borderRadius: TouchTarget.header / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chromeOnDark: {
    backgroundColor: Colors.onDarkOverlay,
  },
  chromeOnLight: {
    backgroundColor: Colors.white,
  },
});
