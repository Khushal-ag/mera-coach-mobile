import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../../../constants/theme';
import { getBmiCategory, computeBmiMetrics } from '../../../utils/bmi';
import type { BodyMetrics } from '../../../utils/bmi';
import type { ClientProfile } from '../../../types/models';
import type { IoniconName, StepProps } from '../../../types/wizard';

interface MetricTile {
  icon: IoniconName;
  value: string;
  label: string;
  caption: string;
  fullWidth?: boolean;
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
      fullWidth: true,
    },
  ];
}

export default function BmiResultStep({ form }: StepProps<ClientProfile>) {
  const metrics = computeBmiMetrics(form);
  const category = getBmiCategory(metrics?.bmi ?? null);
  const tiles = tilesFor(metrics);

  return (
    <View>
      <View style={styles.bmiCard}>
        <Text style={styles.bmiCaption}>Body Mass Index</Text>
        <Text style={styles.bmiValue}>{metrics ? metrics.bmi.toFixed(1) : '--'}</Text>
        {category ? (
          <View style={[styles.categoryBadge, { backgroundColor: category.bg }]}>
            <Text style={[styles.categoryText, { color: category.color }]}>{category.label}</Text>
          </View>
        ) : null}
      </View>

      {!metrics ? (
        <View style={styles.hintCard}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.accent} />
          <Text style={styles.hint}>
            Enter age, gender, height and weight in the basic profile to calculate these metrics.
          </Text>
        </View>
      ) : null}

      <Text style={styles.sectionLabel}>Body composition</Text>
      <View style={styles.tilesGrid}>
        {tiles.map(t => (
          <View key={t.label} style={[styles.tile, t.fullWidth && styles.tileFull]}>
            <View style={styles.tileIconWrap}>
              <Ionicons name={t.icon} size={16} color={Colors.secondary} />
            </View>
            <Text style={styles.tileValue}>{t.value}</Text>
            <Text style={styles.tileLabel}>{t.label}</Text>
            <Text style={styles.tileCaption}>{t.caption}</Text>
          </View>
        ))}
      </View>

      {metrics ? (
        <View style={styles.saveHint}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.secondary} />
          <Text style={styles.saveHintText}>
            Continuing or opening a report saves this reading to the client&apos;s history.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bmiCard: {
    backgroundColor: Colors.secondary,
    borderRadius: Radius.lg,
    padding: 22,
    marginBottom: 16,
    ...Shadow.md,
  },
  bmiCaption: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  bmiValue: { fontSize: 48, fontWeight: '800', color: Colors.white, marginTop: 4 },
  categoryBadge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 10,
  },
  categoryText: { fontSize: 12, fontWeight: '700' },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 16,
  },
  hint: { flex: 1, fontSize: 12, color: Colors.textLight, lineHeight: 18 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 10,
  },
  tilesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  tile: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 14,
    ...Shadow.sm,
  },
  tileFull: { width: '100%', flexGrow: 0 },
  tileIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  tileValue: { fontSize: 20, fontWeight: '800', color: Colors.secondary },
  tileLabel: { fontSize: 12, fontWeight: '700', color: Colors.textDark, marginTop: 2 },
  tileCaption: { fontSize: 10, color: Colors.textLight, marginTop: 2, lineHeight: 14 },
  saveHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.md,
    padding: 12,
  },
  saveHintText: { flex: 1, fontSize: 12, color: Colors.textLight, lineHeight: 18 },
});
