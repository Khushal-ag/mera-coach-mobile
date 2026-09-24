import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Colors,
  HitSlop,
  IconSize,
  PressOpacity,
  Shadow,
  Spacing,
  TouchTarget,
  headingFont,
} from '../constants/theme';
import type { IoniconName } from '../types/icons';

function ChromeCircleButton({
  icon,
  onPress,
  accessibilityLabel,
}: {
  icon: IoniconName;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <TouchableOpacity
      style={styles.chromeCircle}
      onPress={onPress}
      hitSlop={HitSlop.sm}
      activeOpacity={PressOpacity.default}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name={icon} size={IconSize.lg} color={Colors.secondary} />
    </TouchableOpacity>
  );
}

interface WaveScreenHeaderProps {
  title: string;
  onBack?: () => void;
  onHome?: () => void;
  showHome?: boolean;
}

/**
 * Shared green header with soft wave bottom edge.
 * Used by Find Your Coach, My Leads, and Checkups.
 */
export default function WaveScreenHeader({
  title,
  onBack,
  onHome,
  showHome = true,
}: WaveScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const handleBack = onBack ?? (() => navigation.goBack());
  const handleHome = onHome ?? (() => navigation.navigate('Home'));

  return (
    <View style={styles.wrap}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.row}>
          <ChromeCircleButton
            icon="chevron-back"
            onPress={handleBack}
            accessibilityLabel="Go back"
          />
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {showHome ? (
            <ChromeCircleButton icon="home" onPress={handleHome} accessibilityLabel="Home" />
          ) : (
            <View style={styles.spacer} />
          )}
        </View>
      </View>
      <View style={styles.waveWrap} pointerEvents="none">
        <View style={styles.wave} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: Colors.headerGradientBottom,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg + 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: Colors.white,
    fontSize: 18,
    fontFamily: headingFont.bold,
    marginHorizontal: Spacing.xs,
  },
  chromeCircle: {
    width: TouchTarget.header,
    height: TouchTarget.header,
    borderRadius: TouchTarget.header / 2,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  spacer: { width: TouchTarget.header, height: TouchTarget.header },
  waveWrap: {
    marginTop: -2,
    height: 22,
    overflow: 'hidden',
    backgroundColor: Colors.headerGradientBottom,
  },
  wave: {
    position: 'absolute',
    left: '-20%',
    right: '-20%',
    bottom: -26,
    height: 48,
    backgroundColor: Colors.background,
    borderRadius: 120,
  },
});
