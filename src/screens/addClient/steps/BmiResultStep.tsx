import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../../../constants/theme';
import { getBmi, getBmiCategory } from '../../../utils/bmi';
import type { ClientProfile } from '../../../types/models';
import type { StepProps } from '../../../types/wizard';

interface MetricTile {
  icon: string;
  value: string;
  label: string;
  caption: string;
}

const METRIC_TILES: MetricTile[] = [
  { icon: '❤️', value: '32.5%', label: 'Body Fat', caption: 'Deurenberg formula' },
  { icon: '🔥', value: '17', label: 'Visceral Fat', caption: 'Level 1-59 (normal: 1-12)' },
  { icon: '💪', value: '29.5%', label: 'Skeletal Muscle', caption: 'Hume LBM formula' },
  { icon: '⚡', value: '1685 kcal', label: 'Resting Metabolism', caption: 'Mifflin-St Jeor' },
  { icon: '📅', value: '31 yrs', label: 'Body Age', caption: 'Based on fat% vs ideal' },
];

export default function BmiResultStep({ form, update }: StepProps<ClientProfile>) {
  const bmi = getBmi(form.height, form.weight);
  const category = getBmiCategory(bmi);

  return (
    <View>
      <View style={styles.bmiCard}>
        <Text style={styles.bmiValue}>{bmi ? bmi.toFixed(1) : '--'}</Text>
        {category && (
          <View style={[styles.categoryBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Text style={styles.categoryText}>{category.label}</Text>
          </View>
        )}
        <Text style={styles.bmiCaption}>Body Mass Index (BMI)</Text>
      </View>

      <View style={styles.tilesGrid}>
        {METRIC_TILES.map((t, i) => (
          <View key={i} style={styles.tile}>
            <Text style={styles.tileIcon}>{t.icon}</Text>
            <Text style={styles.tileValue}>{t.value}</Text>
            <Text style={styles.tileLabel}>{t.label}</Text>
            <Text style={styles.tileCaption}>{t.caption}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.checkboxRow}
        onPress={() => update('saveBmiCheckup', !form.saveBmiCheckup)}
      >
        <View style={[styles.checkbox, form.saveBmiCheckup && styles.checkboxActive]}>
          {form.saveBmiCheckup && <Ionicons name="checkmark" size={13} color={Colors.white} />}
        </View>
        <Text style={styles.checkboxLabel}>Save BMI Check-up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bmiCard: {
    backgroundColor: Colors.secondary,
    borderRadius: Radius.lg,
    padding: 24,
    marginBottom: 16,
    ...Shadow.md,
  },
  bmiValue: { fontSize: 44, fontWeight: '800', color: Colors.white },
  categoryBadge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 6,
  },
  categoryText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  bmiCaption: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 10 },
  tilesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  tile: {
    width: '47%',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 14,
    ...Shadow.sm,
  },
  tileIcon: { fontSize: 18, marginBottom: 6 },
  tileValue: { fontSize: 20, fontWeight: '800', color: Colors.secondary },
  tileLabel: { fontSize: 12, fontWeight: '700', color: Colors.textDark, marginTop: 2 },
  tileCaption: { fontSize: 10, color: Colors.textLight, marginTop: 2 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  checkboxLabel: { fontSize: 13, fontWeight: '600', color: Colors.textDark },
});
