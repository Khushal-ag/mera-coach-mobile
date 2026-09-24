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
      <Ionicons name={icon} size={IconSize.lg} color={Colors.headerGradientBottom} />
    </TouchableOpacity>
  );
}

interface WaveScreenHeaderProps {
  title: string;
  /** Optional outline icon shown left of the title (e.g. people on My Clients). */
  titleIcon?: IoniconName;
  onBack?: () => void;
  onHome?: () => void;
  showHome?: boolean;
  showBack?: boolean;
  /** Extra chrome to the left of Home (e.g. add-client on My Clients). */
  rightExtra?: React.ReactNode;
}

/**
 * Shared green header with soft wave bottom edge.
 * Used by Checkups, My Clients, Edit Profile, My Leads, and Find Your Coach.
 */
export default function WaveScreenHeader({
  title,
  titleIcon,
  onBack,
  onHome,
  showHome = true,
  showBack = true,
  rightExtra,
}: WaveScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const handleBack = onBack ?? (() => navigation.goBack());
  const handleHome = onHome ?? (() => navigation.navigate('Home'));

  return (
    <View style={styles.wrap}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.row}>
          {showBack ? (
            <ChromeCircleButton
              icon="chevron-back-outline"
              onPress={handleBack}
              accessibilityLabel="Go back"
            />
          ) : (
            <View style={styles.spacer} />
          )}
          <View style={styles.rightCluster}>
            {rightExtra}
            {showHome ? (
              <ChromeCircleButton
                icon="home-outline"
                onPress={handleHome}
                accessibilityLabel="Home"
              />
            ) : rightExtra ? null : (
              <View style={styles.spacer} />
            )}
          </View>
        </View>
        <View
          style={[styles.titleOverlay, { top: insets.top + Spacing.sm }]}
          pointerEvents="none"
        >
          <View style={styles.titleBlock}>
            {titleIcon ? (
              <Ionicons
                name={titleIcon}
                size={IconSize.lg}
                color={Colors.white}
                style={styles.titleIcon}
              />
            ) : null}
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.waveWrap} pointerEvents="none">
        <View style={styles.wave} />
      </View>
    </View>
  );
}

/** White circle + green outline icon — for custom trailing actions (e.g. add). */
export function WaveHeaderActionButton({
  icon,
  onPress,
  accessibilityLabel,
}: {
  icon: IoniconName;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <ChromeCircleButton icon={icon} onPress={onPress} accessibilityLabel={accessibilityLabel} />
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
    position: 'relative',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
    minHeight: TouchTarget.header,
  },
  titleOverlay: {
    position: 'absolute',
    left: Spacing.md + TouchTarget.header * 2 + Spacing.xs,
    right: Spacing.md + TouchTarget.header * 2 + Spacing.xs,
    height: TouchTarget.header,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '100%',
  },
  titleIcon: {
    marginRight: Spacing.xs,
  },
  title: {
    flexShrink: 1,
    textAlign: 'center',
    color: Colors.white,
    fontSize: 18,
    fontFamily: headingFont.bold,
  },
  rightCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minWidth: TouchTarget.header,
    justifyContent: 'flex-end',
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
