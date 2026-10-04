import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandImages, WAVE_HEADER_BITMAP, WAVE_HEADER_FRAME } from '../constants/images';
import {
  Colors,
  HitSlop,
  IconSize,
  PressOpacity,
  Shadow,
  Spacing,
  TouchTarget,
  Typography,
} from '../constants/theme';
import type { IoniconName } from '../types/icons';

/** Extra logical pixels so rounding cannot open a seam at the screen edge. */
const WAVE_EDGE_BLEED = 1;

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
      <Ionicons name={icon} size={IconSize.lg} color={Colors.accentInk} />
    </TouchableOpacity>
  );
}

interface WaveScreenHeaderProps {
  title: string;
  titleIcon?: IoniconName;
  onBack?: () => void;
  onHome?: () => void;
  showHome?: boolean;
  showBack?: boolean;
  rightExtra?: React.ReactNode;
}

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
  const { width: screenWidth } = useWindowDimensions();
  const navigation = useNavigation();

  const handleBack = onBack ?? (() => navigation.goBack());
  const handleHome = onHome ?? (() => navigation.navigate('Home', { page: 0 }));

  // Uniform scale: the opaque frame maps to the screen width, so the wave
  // keeps the bitmap's curve. Transparent padding sits outside the clip.
  const scale = (screenWidth + WAVE_EDGE_BLEED * 2) / WAVE_HEADER_FRAME.width;
  const headerHeight = Math.ceil(WAVE_HEADER_FRAME.height * scale);
  const artWidth = WAVE_HEADER_BITMAP.width * scale;
  const artHeight = WAVE_HEADER_BITMAP.height * scale;
  const artLeft = -WAVE_HEADER_FRAME.x * scale - WAVE_EDGE_BLEED;
  const artTop = -WAVE_HEADER_FRAME.y * scale;
  const maxChromeTop = Math.max(0, headerHeight - TouchTarget.header);
  const chromePadTop = Math.min(insets.top + Spacing.xs, maxChromeTop);

  return (
    <View style={[styles.wrap, { width: screenWidth, height: headerHeight }]}>
      <Image
        source={BrandImages.waveHeader}
        style={[
          styles.waveArt,
          {
            width: artWidth,
            height: artHeight,
            left: artLeft,
            top: artTop,
          },
        ]}
        resizeMode="cover"
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <View style={[styles.header, { paddingTop: chromePadTop }]}>
        <View style={styles.row}>
          {showBack ? (
            <ChromeCircleButton
              icon="chevron-back-outline"
              onPress={handleBack}
              accessibilityLabel="Go back"
            />
          ) : null}
          <View style={[styles.titleBlock, showBack ? styles.titleAfterBack : null]}>
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
          {rightExtra || showHome ? (
            <View style={styles.rightCluster}>
              {rightExtra}
              {showHome ? (
                <ChromeCircleButton
                  icon="home-outline"
                  onPress={handleHome}
                  accessibilityLabel="Home"
                />
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

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
    alignSelf: 'stretch',
    backgroundColor: 'transparent',
    overflow: 'hidden',
    position: 'relative',
  },
  waveArt: {
    position: 'absolute',
  },
  header: {
    backgroundColor: 'transparent',
    paddingHorizontal: Spacing.md,
    position: 'relative',
    zIndex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: TouchTarget.header,
  },
  titleBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    minWidth: 0,
  },
  titleAfterBack: {
    marginLeft: Spacing.sm,
  },
  titleIcon: {
    marginRight: Spacing.xs,
  },
  title: {
    ...Typography.title,
    flexShrink: 1,
    textAlign: 'left',
    color: Colors.white,
  },
  rightCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginLeft: Spacing.sm,
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
});
