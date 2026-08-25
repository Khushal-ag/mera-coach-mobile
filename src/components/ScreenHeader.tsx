import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';

interface HeaderBackButtonProps {
  onPress: () => void;
  /** White translucent control for dark (green) headers. Default true. */
  onDark?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/** Circular back control — shared by stack headers and auth/hero banners. */
export function HeaderBackButton({
  onPress,
  onDark = true,
  style,
  accessibilityLabel = 'Go back',
}: HeaderBackButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.backBtn, onDark ? styles.backBtnOnDark : styles.backBtnOnLight, style]}
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name="arrow-back" size={20} color={onDark ? Colors.white : Colors.textDark} />
    </TouchableOpacity>
  );
}

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  /** Optional trailing control; when omitted with onBack, a spacer keeps the title centered. */
  right?: React.ReactNode;
}

/**
 * Green stack-screen header: safe-area padding, circular back, centered title.
 * Use for Edit Profile, Legal, Change Password, Client Detail, BMI Report, etc.
 * Wizard flows keep their floating back instead.
 */
export default function ScreenHeader({ title, onBack, right }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      {onBack ? <HeaderBackButton onPress={onBack} /> : <View style={styles.spacer} />}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {right ?? <View style={styles.spacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.secondary,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  spacer: { width: 36, height: 36 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnOnDark: {
    backgroundColor: Colors.onDarkOverlay,
  },
  backBtnOnLight: {
    backgroundColor: Colors.white,
  },
});
