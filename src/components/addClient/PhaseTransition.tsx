import React from 'react';
import { View, Text, Image, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Colors,
  FontFamily,
  IconSize,
  Radius,
  ScreenPad,
  Shadow,
  Spacing,
  Typography,
  headingFont,
} from '../../constants/theme';
import { BrandImages } from '../../constants/images';
import GreenSubmitButton from '../GreenSubmitButton';
import type { IoniconName } from '../../types/icons';

const CANVAS = '#F3FAF7';
const UNDERLINE = '#F08A2C';
const ART_WIDTH = 220;
const ART_HEIGHT = 132;
/** Below this screen height the picture shrinks so the Continue button stays on screen. */
const SHORT_SCREEN_HEIGHT = 700;
const SHORT_ART_SCALE = 0.7;

interface PhaseTransitionProps {
  fromLabel?: string;
  toLabel: string;
  toIcon: IoniconName;
  onContinue: () => void;
}

function outlineIcon(icon: IoniconName): IoniconName {
  if (icon.endsWith('-outline') || icon.endsWith('-sharp')) return icon;
  return `${icon}-outline` as IoniconName;
}

export default function PhaseTransition({
  fromLabel,
  toLabel,
  toIcon,
  onContinue,
}: PhaseTransitionProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const artScale = height < SHORT_SCREEN_HEIGHT ? SHORT_ART_SCALE : 1;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, Spacing.md) },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.card}>
        {fromLabel ? (
          <View style={styles.doneRow}>
            <Ionicons name="checkmark-circle-outline" size={IconSize.lg} color={Colors.accentInk} />
            <Text style={styles.doneText}>{fromLabel} saved</Text>
          </View>
        ) : null}

        <Image
          source={BrandImages.phasePath}
          style={[styles.phaseArt, { width: ART_WIDTH * artScale, height: ART_HEIGHT * artScale }]}
          resizeMode="cover"
        />

        <Ionicons name={outlineIcon(toIcon)} size={32} color={Colors.accentInk} />
        <Text style={styles.upNext}>Up next</Text>
        <Text style={styles.toLabel}>{toLabel}</Text>
        <View style={styles.underline} />
      </View>

      <GreenSubmitButton label="Continue" onPress={onContinue} style={styles.continueBtn} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: CANVAS },
  container: {
    flexGrow: 1,
    backgroundColor: CANVAS,
    justifyContent: 'space-between',
    paddingHorizontal: ScreenPad.horizontal,
    paddingTop: Spacing.md,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadow.sm,
  },
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.md,
  },
  doneText: {
    ...Typography.bodyStrong,
    color: Colors.accentInk,
  },
  continueBtn: { marginTop: Spacing.md },
  phaseArt: {
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  upNext: {
    marginTop: Spacing.sm,
    color: Colors.textLight,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontFamily: FontFamily.bold,
  },
  toLabel: {
    ...Typography.title,
    fontFamily: headingFont.bold,
    marginTop: 6,
    textAlign: 'center',
  },
  underline: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: UNDERLINE,
    marginTop: 6,
  },
});
