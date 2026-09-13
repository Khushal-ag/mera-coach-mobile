import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontFamily, IconSize, Radius, Shadow, Spacing } from '../../constants/theme';
import { BrandImages } from '../../constants/images';
import AppButton from '../AppButton';
import type { IoniconName } from '../../types/icons';

interface PhaseTransitionProps {
  fromLabel?: string;
  toLabel: string;
  toIcon: IoniconName;
  onContinue: () => void;
}

export default function PhaseTransition({
  fromLabel,
  toLabel,
  toIcon,
  onContinue,
}: PhaseTransitionProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + Spacing.lg,
          paddingBottom: Math.max(insets.bottom, Spacing.xl) + Spacing.lg,
        },
      ]}
    >
      <View style={styles.center}>
        {fromLabel ? (
          <View style={styles.doneRow}>
            <Ionicons name="checkmark-circle" size={IconSize.lg} color={Colors.onDarkMuted} />
            <Text style={styles.doneText}>{fromLabel} saved</Text>
          </View>
        ) : null}

        <Image source={BrandImages.phasePath} style={styles.phaseArt} resizeMode="cover" />

        <View style={styles.iconCircle}>
          <Ionicons name={toIcon} size={36} color={Colors.white} />
        </View>
        <Text style={styles.upNext}>Up next</Text>
        <Text style={styles.toLabel}>{toLabel}</Text>
      </View>

      <AppButton
        label="Continue"
        onPress={onContinue}
        variant="ghost"
        icon="arrow-forward"
        style={styles.continueBtn}
        textStyle={styles.continueText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
  },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.lg },
  doneText: {
    color: Colors.onDarkMuted,
    fontSize: 13,
    fontFamily: FontFamily.semibold,
  },
  phaseArt: {
    width: 220,
    height: 132,
    borderRadius: Radius.md,
    marginBottom: Spacing.lg,
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.onDarkOverlay,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg - 4,
  },
  upNext: {
    color: Colors.onDarkSoft,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontFamily: FontFamily.bold,
  },
  toLabel: {
    color: Colors.white,
    fontSize: 26,
    fontFamily: FontFamily.extraBold,
    marginTop: 6,
    textAlign: 'center',
  },
  continueBtn: {
    backgroundColor: Colors.white,
    minHeight: 52,
    paddingHorizontal: Spacing.xl,
    ...Shadow.lg,
  },
  continueText: { fontSize: 16 },
});
