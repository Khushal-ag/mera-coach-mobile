import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  HitSlop,
  IconSize,
  PressOpacity,
  Radius,
  ScreenPad,
  Shadow,
  Spacing,
  Typography,
} from '../../constants/theme';
import { BrandImages, TIPS_COACH_ASPECT } from '../../constants/images';

interface DashboardCarouselProps {
  onStartNow?: () => void;
  onViewAll?: () => void;
}

export default function DashboardCarousel({ onStartNow, onViewAll }: DashboardCarouselProps) {
  const openTip = onStartNow ?? onViewAll;
  // Sized from the live window so rotation, split-screen and foldables do not leave a stale card.
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = screenWidth - ScreenPad.horizontal * 2;
  const cardHeight = Math.round(cardWidth / TIPS_COACH_ASPECT);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.bulbWrap}>
            <Ionicons name="bulb-outline" size={IconSize.sm} color={Colors.white} />
          </View>
          <Text style={styles.headerTitle}>Tips for your week</Text>
        </View>
        {onViewAll ? (
          <TouchableOpacity
            style={styles.viewAllBtn}
            onPress={onViewAll}
            hitSlop={HitSlop.sm}
            activeOpacity={PressOpacity.default}
            accessibilityRole="button"
            accessibilityLabel="View all tips"
          >
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="arrow-forward-outline" size={IconSize.sm} color={Colors.secondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.cardShell}>
        <View style={[styles.card, { width: cardWidth, height: cardHeight }]}>
          <Image
            source={BrandImages.tipsCoach}
            style={{ width: cardWidth, height: cardHeight }}
            resizeMode="cover"
          />
          {openTip ? (
            <>
              <TouchableOpacity
                style={styles.startHit}
                onPress={openTip}
                activeOpacity={PressOpacity.default}
                accessibilityRole="button"
                accessibilityLabel="Start now: Your Personal Coach Awaits"
              />
              <TouchableOpacity
                style={styles.playHit}
                onPress={openTip}
                activeOpacity={PressOpacity.default}
                accessibilityRole="button"
                accessibilityLabel="Open tip: Your Personal Coach Awaits"
              />
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: ScreenPad.horizontal,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  bulbWrap: {
    width: Typography.section.lineHeight,
    height: Typography.section.lineHeight,
    borderRadius: Typography.section.lineHeight / 2,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.section,
    lineHeight: Typography.section.lineHeight,
    includeFontPadding: false,
  },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
  viewAllText: {
    ...Typography.bodyStrong,
    color: Colors.secondary,
    lineHeight: Typography.section.lineHeight,
    includeFontPadding: false,
  },
  cardShell: {
    borderRadius: Radius.md,
    backgroundColor: Colors.tipsPanel,
    ...Shadow.sm,
  },
  card: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.tipsPanel,
  },
  startHit: {
    position: 'absolute',
    left: Spacing.md,
    bottom: Spacing.md,
    width: 128,
    height: 44,
  },
  playHit: {
    position: 'absolute',
    right: Spacing.md,
    bottom: Spacing.md,
    width: 56,
    height: 56,
    borderRadius: 28,
  },
});
