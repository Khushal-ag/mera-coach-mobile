import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, IconSize, Radius, Shadow, Spacing } from '../../../constants/theme';
import { getBmiCategory, computeBmiMetrics } from '../../../utils/bmi';
import type { BodyMetrics } from '../../../utils/bmi';
import type { ClientProfile } from '../../../types/models';
import type { IoniconName, StepProps } from '../../../types/wizard';

interface MetricTile {
  icon: IoniconName;
  value: string;
  label: string;
  caption: string;
}

function tilesFor(metrics: BodyMetrics | null): MetricTile[] {
  return [
    {
      icon: 'heart-outline',
      value: metrics ? `${metrics.bodyFatPct}%` : '--',
      label: 'Body Fat',
      caption: 'Deurenberg formula',
    },
    {
      icon: 'flame-outline',
      value: metrics ? String(metrics.visceralFat) : '--',
      label: 'Visceral Fat',
      caption: 'Level 1-59 (normal: 1-12)',
    },
    {
      icon: 'barbell-outline',
      value: metrics ? `${metrics.skeletalMusclePct}%` : '--',
      label: 'Skeletal Muscle',
      caption: 'Hume LBM formula',
    },
    {
      icon: 'flash-outline',
      value: metrics ? `${metrics.restingMetabolism} kcal` : '--',
      label: 'Resting Metabolism',
      caption: 'Mifflin-St Jeor',
    },
    {
      icon: 'calendar-outline',
      value: metrics ? `${metrics.bodyAge} yrs` : '--',
      label: 'Body Age',
      caption: 'Based on fat% vs ideal',
    },
  ];
}

export default function BmiResultStep({ form }: StepProps<ClientProfile>) {
  const metrics = computeBmiMetrics(form);
  const category = getBmiCategory(metrics?.bmi ?? null);
  const tiles = tilesFor(metrics);

  return (
    <View>
      {!metrics ? (
        <View style={styles.hintCard}>
          <Ionicons name="information-circle-outline" size={IconSize.md} color={Colors.accent} />
          <Text style={styles.hint}>
            Enter age, gender, height and weight in the basic profile to calculate these metrics.
          </Text>
        </View>
      ) : null}

      <Text style={styles.sectionLabel}>Body composition</Text>
      <View style={styles.tilesGrid}>
        <View style={[styles.tile, styles.bmiTile]}>
          <Text style={styles.bmiTileCaption}>BMI</Text>
          <Text style={styles.bmiTileValue}>{metrics ? metrics.bmi.toFixed(1) : '--'}</Text>
          {category ? (
            <View style={[styles.categoryBadge, { backgroundColor: category.bg }]}>
              <Text style={[styles.categoryText, { color: category.color }]}>{category.label}</Text>
            </View>
          ) : (
            <Text style={styles.bmiTileSub}>Body Mass Index</Text>
          )}
        </View>

        {tiles.map(t => (
          <View key={t.label} style={styles.tile}>
            <View style={styles.tileIconWrap}>
              <Ionicons name={t.icon} size={IconSize.sm} color={Colors.secondary} />
            </View>
            <Text style={styles.tileValue}>{t.value}</Text>
            <Text style={styles.tileLabel}>{t.label}</Text>
            <Text style={styles.tileCaption}>{t.caption}</Text>
          </View>
        ))}
      </View>

      {metrics ? (
        <View style={styles.saveHint}>
          <Ionicons name="information-circle-outline" size={IconSize.sm} color={Colors.secondary} />
          <Text style={styles.saveHintText}>
            Continuing or opening a report saves this reading to the client&apos;s history.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hintCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  hint: {
    flex: 1,
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    lineHeight: 18,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    color: Colors.textDark,
    marginBottom: 10,
  },
  tilesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: Spacing.md + 2 },
  tile: {
    width: '48.5%',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 14,
    ...Shadow.sm,
  },
  bmiTile: {
    backgroundColor: Colors.secondary,
    ...Shadow.md,
    justifyContent: 'center',
  },
  bmiTileCaption: {
    color: Colors.onDarkCaption,
    fontSize: 11,
    fontFamily: FontFamily.semibold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  bmiTileValue: { fontSize: 28, fontFamily: FontFamily.extraBold, color: Colors.white },
  bmiTileSub: {
    color: Colors.onDarkSoft,
    fontSize: 10,
    fontFamily: FontFamily.regular,
    marginTop: 6,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: Spacing.xs,
  },
  categoryText: { fontSize: 11, fontFamily: FontFamily.bold },
  tileIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  tileValue: { fontSize: 20, fontFamily: FontFamily.extraBold, color: Colors.secondary },
  tileLabel: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
    color: Colors.textDark,
    marginTop: 2,
  },
  tileCaption: {
    fontSize: 10,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    marginTop: 2,
    lineHeight: 14,
  },
  saveHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },
  saveHintText: {
    flex: 1,
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    lineHeight: 18,
  },
});
