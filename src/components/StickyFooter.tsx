import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadow, Spacing } from '../constants/theme';

type StickyFooterProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Extra padding above the safe-area inset. Default Spacing.sm. */
  paddingTop?: number;
};

/**
 * Bottom-pinned action bar with safe-area inset so primary CTAs stay reachable
 * on small Android screens and devices with gesture bars.
 */
export default function StickyFooter({
  children,
  style,
  paddingTop = Spacing.sm,
}: StickyFooterProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.footer,
        { paddingTop, paddingBottom: Math.max(insets.bottom, Spacing.sm) },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    backgroundColor: Colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    ...Shadow.sm,
  },
});
