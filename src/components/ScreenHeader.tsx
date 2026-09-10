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
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontFamily, Spacing } from '../constants/theme';

/**
 * Screen chrome patterns (see also TabRootHeader for tab roots):
 *
 * - **Tab root screens** (ClientList, Checkups, Profile): green header with back → Dashboard.
 *   Dashboard tab root uses its greeting header variant — no back.
 * - **Stack push screens** (ClientDetail, EditProfile, EditGallery, EditPackages, EditEvents, Leads, Notifications, Legal, etc.):
 *   ScreenHeader with onBack — back left, title center, home right (optional via showHome).
 * - **Auth / marketing hero** (Login, Register, CoachList, CoachPublicProfile): HeaderBackButton
 *   overlaid on imagery — back only, no duplicate title bar.
 * - **Wizard flows** (AddClient, ClientBmi, ClientDietPlan): ScreenHeader + step banner on cream body.
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
  const handlePress = onPress ?? (() => navigation.navigate('Home'));

  return (
    <TouchableOpacity
      style={[styles.backBtn, onDark ? styles.backBtnOnDark : styles.backBtnOnLight, style]}
      onPress={handlePress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name="home-outline" size={20} color={onDark ? Colors.white : Colors.textDark} />
    </TouchableOpacity>
  );
}

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  /** Optional trailing control; spacer keeps title centered when onBack is set. */
  right?: React.ReactNode;
  /**
   * Home control on the right. Default true for authenticated stack screens.
   * Pass false or a custom `right` to override.
   */
  showHome?: boolean;
}

export default function ScreenHeader({ title, onBack, right, showHome = true }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const trailing = right ?? (showHome ? <HeaderHomeButton /> : <View style={styles.spacer} />);

  return (
    <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
      {onBack ? <HeaderBackButton onPress={onBack} /> : <View style={styles.spacer} />}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.secondary,
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    color: Colors.white,
    fontSize: 18,
    fontFamily: FontFamily.bold,
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
