import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  IconSize,
  Radius,
  Shadow,
  Spacing,
  Typography,
  headingFont,
} from '../../../constants/theme';
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
          <Ionicons name="information-circle-outline" size={IconSize.md} color={Colors.accentInk} />
          <Text style={styles.hint}>
            Enter age, gender, height and weight in the basic profile to calculate these metrics.
          </Text>
        </View>
      ) : null}

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Body composition</Text>
        <View style={styles.underline} />
      </View>
      <View style={styles.tilesGrid}>
        <View style={styles.tile}>
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
            <Ionicons name={t.icon} size={IconSize.md} color={Colors.accentInk} />
            <Text style={styles.tileValue}>{t.value}</Text>
            <Text style={styles.tileLabel}>{t.label}</Text>
            <Text style={styles.tileCaption}>{t.caption}</Text>
          </View>
        ))}
      </View>

      {metrics ? (
        <View style={styles.saveHint}>
          <Ionicons name="information-circle-outline" size={IconSize.sm} color={Colors.accentInk} />
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
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  hint: {
    flex: 1,
    ...Typography.body,
    color: Colors.accentInk,
  },
  sectionHead: { marginBottom: Spacing.sm },
  sectionTitle: {
    ...Typography.title,
    color: Colors.textDark,
  },
  underline: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#F08A2C',
    marginTop: 4,
  },
  tilesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: Spacing.md },
  tile: {
    width: '48.5%',
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: Spacing.md,
    gap: 4,
    ...Shadow.sm,
  },
  bmiTileCaption: {
    ...Typography.caption,
    color: Colors.accentInk,
    textTransform: 'uppercase',
  },
  bmiTileValue: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: headingFont.bold,
    color: Colors.accentInk,
  },
  bmiTileSub: {
    ...Typography.caption,
    marginTop: 4,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: Spacing.xs,
  },
  categoryText: { ...Typography.micro, fontFamily: headingFont.bold },
  tileValue: {
    marginTop: 4,
    fontSize: 20,
    lineHeight: 26,
    fontFamily: headingFont.extraBold,
    color: Colors.accentInk,
  },
  tileLabel: {
    ...Typography.label,
    marginTop: 2,
  },
  tileCaption: {
    ...Typography.micro,
    marginTop: 2,
  },
  saveHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  saveHintText: {
    flex: 1,
    ...Typography.caption,
    color: Colors.accentInk,
  },
});
