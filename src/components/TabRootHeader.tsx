import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontFamily, Spacing } from '../constants/theme';
import { HeaderBackButton, HeaderHomeButton } from './ScreenHeader';

interface TabRootHeaderProps {
  title: string;
  subtitle?: string;
  /** When set, shows back (e.g. tab roots other than Dashboard → returns to Dashboard). */
  onBack?: () => void;
  /** Trailing controls (e.g. notifications, add button). Home button is always shown unless hidden. */
  right?: React.ReactNode;
  showHome?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Green header for bottom-tab root screens. Dashboard omits onBack; other tab roots pass onBack. */
export default function TabRootHeader({
  title,
  subtitle,
  onBack,
  right,
  showHome = true,
  style,
}: TabRootHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }, style]}>
      {onBack ? <HeaderBackButton onPress={onBack} /> : null}
      <View style={[styles.textBlock, onBack && styles.textBlockWithBack]}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.actions}>
        {right}
        {showHome ? <HeaderHomeButton /> : null}
      </View>
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
  textBlock: { flex: 1, marginRight: Spacing.sm },
  textBlockWithBack: { marginLeft: Spacing.sm },
  title: {
    color: Colors.white,
    fontSize: 18,
    fontFamily: FontFamily.extraBold,
  },
  subtitle: {
    color: Colors.onDarkMuted,
    fontSize: 12,
    fontFamily: FontFamily.medium,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
