import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontFamily, Radius, Shadow, Spacing } from '../constants/theme';
import { BrandImages } from '../constants/images';
import type { IoniconName } from '../types/icons';

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
          paddingTop: insets.top + 24,
          paddingBottom: Math.max(insets.bottom, 32) + 24,
        },
      ]}
    >
      <View style={styles.center}>
        {fromLabel ? (
          <View style={styles.doneRow}>
            <Ionicons name="checkmark-circle" size={20} color="rgba(255,255,255,0.85)" />
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

      <TouchableOpacity style={styles.continueBtn} onPress={onContinue}>
        <Text style={styles.continueText}>Continue</Text>
        <Ionicons name="arrow-forward" size={18} color={Colors.primary} />
      </TouchableOpacity>
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
    color: 'rgba(255,255,255,0.85)',
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
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  upNext: {
    color: 'rgba(255,255,255,0.6)',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    borderRadius: Radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 32,
    ...Shadow.lg,
  },
  continueText: { color: Colors.primary, fontFamily: FontFamily.bold, fontSize: 16 },
});
