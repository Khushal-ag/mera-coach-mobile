import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Colors,
  FontFamily,
  ScreenPad,
  Spacing,
  TouchTarget,
  headingFont,
} from '../constants/theme';
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

/** Light page header for Packages / Events / Profile tab roots — matches dashboard chrome. */
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
      {onBack ? <HeaderBackButton onPress={onBack} onDark={false} /> : null}
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
        {showHome ? <HeaderHomeButton onDark={false} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.background,
    paddingBottom: Spacing.sm,
    paddingHorizontal: ScreenPad.horizontal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: TouchTarget.min,
  },
  textBlock: { flex: 1, marginRight: Spacing.sm },
  textBlockWithBack: { marginLeft: Spacing.sm },
  title: {
    color: Colors.textDark,
    fontSize: 22,
    fontFamily: headingFont.extraBold,
    letterSpacing: -0.3,
  },
  subtitle: {
    color: Colors.textLight,
    fontSize: 13,
    fontFamily: FontFamily.medium,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
});
