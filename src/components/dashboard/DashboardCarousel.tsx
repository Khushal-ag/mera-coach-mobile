import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontFamily,
  HitSlop,
  PressOpacity,
  ScreenPad,
  Shadow,
  Spacing,
  headingFont,
} from '../../constants/theme';
import { BrandImages, TIPS_COACH_ASPECT } from '../../constants/images';

const CARD_WIDTH = Dimensions.get('window').width - ScreenPad.horizontal * 2;
const CARD_HEIGHT = Math.round(CARD_WIDTH / TIPS_COACH_ASPECT);
const CARD_RADIUS = 20;

interface DashboardCarouselProps {
  onStartNow?: () => void;
  onViewAll?: () => void;
}

export default function DashboardCarousel({ onStartNow, onViewAll }: DashboardCarouselProps) {
  const openTip = onStartNow ?? onViewAll;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.bulbWrap}>
            <Ionicons name="bulb-outline" size={22} color={Colors.white} />
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
            <Ionicons name="arrow-forward" size={15} color={Colors.secondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.card}>
        <Image source={BrandImages.tipsCoach} style={styles.hero} resizeMode="cover" />
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
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: Spacing.xs,
    paddingHorizontal: ScreenPad.horizontal,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  bulbWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: headingFont.bold,
    color: Colors.textDark,
  },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewAllText: {
    color: Colors.secondary,
    fontSize: 14,
    fontFamily: FontFamily.semibold,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    backgroundColor: Colors.tipsPanel,
    ...Shadow.md,
  },
  hero: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
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
