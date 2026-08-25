import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FormErrorBanner from './FormErrorBanner';
import FormFieldLabel from './FormFieldLabel';
import { Colors, Radius, Shadow } from '../constants/theme';
import { getBmi, getBmiCategory } from '../utils/bmi';
import {
  HEIGHT_CM_MAX,
  HEIGHT_CM_MIN,
  cmToFeetInches,
  feetInchesToCm,
  validateHeight,
  validateWeight,
} from '../utils/validation';
import type { BmiCategory } from '../types/models';

type HeightUnit = 'cm' | 'ftin';

const BMI_EXPLAINS: Record<string, string> = {
  Underweight:
    'Your BMI is below the healthy range. This may indicate insufficient nutrition or low muscle mass. A certified nutrition or fitness coach can help you build a healthier body weight safely.',
  Normal:
    'Great news! Your BMI is within the healthy range. A wellness or yoga coach can help you maintain this long-term and optimise your energy and fitness.',
  Overweight:
    'Your BMI is above the healthy range. Even modest weight loss of 5-10% can significantly reduce health risks. A weight management or lifestyle coach can create a practical, sustainable plan for you.',
  Obese:
    'Your BMI indicates obesity, which carries significant health risks. A certified weight management or nutrition coach with a structured plan can make a real, life-changing difference.',
};

type Props = {
  onFindCoach?: () => void;
  onFieldFocus?: () => void;
};

/** Inline BMI calculator for the public Home screen (no separate route). */
export default function PublicBmiCard({ onFindCoach, onFieldFocus }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [heightUnit, setHeightUnit] = useState<HeightUnit>('cm');
  const [heightCm, setHeightCm] = useState('');
  const [feetText, setFeetText] = useState('');
  const [inchesText, setInchesText] = useState('');
  const [weight, setWeight] = useState('');
  const [banner, setBanner] = useState<string | null>(null);
  const [result, setResult] = useState<{ bmi: number; category: BmiCategory } | null>(null);

  const switchUnit = (next: HeightUnit) => {
    if (next === heightUnit) return;
    if (next === 'ftin') {
      const cm = parseFloat(heightCm);
      if (cm > 0) {
        const { feet, inches } = cmToFeetInches(cm);
        setFeetText(String(feet));
        setInchesText(String(inches));
      }
    } else {
      const ft = parseFloat(feetText);
      const ins = parseFloat(inchesText) || 0;
      if (ft > 0) {
        setHeightCm(String(Math.round(feetInchesToCm(ft, ins))));
      }
    }
    setHeightUnit(next);
  };

  const resolveHeightCm = (): string => {
    if (heightUnit === 'cm') return heightCm.trim();
    const ft = parseFloat(feetText);
    const ins = parseFloat(inchesText) || 0;
    if (!ft || ft < 1) return '';
    return String(Math.round(feetInchesToCm(ft, ins)));
  };

  const calculate = () => {
    const h = resolveHeightCm();
    const heightErr = validateHeight(h);
    const weightErr = validateWeight(weight);
    if (heightErr || weightErr) {
      setBanner([heightErr, weightErr].filter(Boolean).join(' '));
      setResult(null);
      return;
    }
    setBanner(null);
    const bmi = getBmi(h, weight);
    const category = getBmiCategory(bmi);
    if (bmi == null || !category) {
      setBanner('Could not calculate BMI. Check your height and weight.');
      setResult(null);
      return;
    }
    setResult({ bmi, category });
  };

  return (
    <View style={styles.section}>
      <View style={[styles.sectionTag, styles.bmiTag]}>
        <Ionicons name="calculator-outline" size={12} color={Colors.accent} />
        <Text style={styles.bmiTagText}>Free Health Tool</Text>
      </View>
      <Text style={styles.sectionTitle}>Know Your BMI</Text>
      <Text style={styles.sectionSubtitle}>
        Instant BMI with health category. No login required, nothing saved.
      </Text>

      {!expanded ? (
        <TouchableOpacity
          style={styles.openBtn}
          onPress={() => setExpanded(true)}
          accessibilityRole="button"
          accessibilityLabel="Check Your BMI"
        >
          <Ionicons name="fitness-outline" size={20} color={Colors.white} />
          <Text style={styles.openBtnText}>Check Your BMI</Text>
          <Ionicons name="chevron-down" size={16} color={Colors.white} />
        </TouchableOpacity>
      ) : (
        <View style={styles.form}>
          <FormErrorBanner message={banner} />

          <View style={styles.field}>
            <View style={styles.labelRow}>
              <FormFieldLabel required style={{ marginBottom: 0 }}>
                Height
              </FormFieldLabel>
              <View style={styles.unitToggle}>
                {(['cm', 'ftin'] as const).map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.unitBtn, heightUnit === opt && styles.unitBtnActive]}
                    onPress={() => switchUnit(opt)}
                  >
                    <Text
                      style={[styles.unitBtnText, heightUnit === opt && styles.unitBtnTextActive]}
                    >
                      {opt === 'cm' ? 'cm' : 'ft/in'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {heightUnit === 'cm' ? (
              <View style={styles.inputWrap}>
                <Ionicons
                  name="resize-outline"
                  size={17}
                  color={Colors.textLight}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder={`e.g. 165 (${HEIGHT_CM_MIN}-${HEIGHT_CM_MAX})`}
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                  value={heightCm}
                  onChangeText={v => {
                    setHeightCm(v);
                    setBanner(null);
                  }}
                  onFocus={onFieldFocus}
                />
              </View>
            ) : (
              <View style={styles.row}>
                <View style={[styles.inputWrap, styles.half]}>
                  <TextInput
                    style={styles.input}
                    placeholder="ft"
                    placeholderTextColor={Colors.textLight}
                    keyboardType="number-pad"
                    value={feetText}
                    onChangeText={v => {
                      setFeetText(v);
                      setBanner(null);
                    }}
                    onFocus={onFieldFocus}
                  />
                  <Text style={styles.unitSuffix}>ft</Text>
                </View>
                <View style={[styles.inputWrap, styles.half]}>
                  <TextInput
                    style={styles.input}
                    placeholder="in"
                    placeholderTextColor={Colors.textLight}
                    keyboardType="number-pad"
                    value={inchesText}
                    onChangeText={v => {
                      setInchesText(v);
                      setBanner(null);
                    }}
                    onFocus={onFieldFocus}
                  />
                  <Text style={styles.unitSuffix}>in</Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.field}>
            <FormFieldLabel required>Weight (kg)</FormFieldLabel>
            <View style={styles.inputWrap}>
              <Ionicons
                name="barbell-outline"
                size={17}
                color={Colors.textLight}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="e.g. 70"
                placeholderTextColor={Colors.textLight}
                keyboardType="numeric"
                value={weight}
                onChangeText={v => {
                  setWeight(v);
                  setBanner(null);
                }}
                onFocus={onFieldFocus}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.calcBtn} onPress={calculate}>
            <Ionicons name="calculator" size={18} color={Colors.white} />
            <Text style={styles.calcBtnText}>Calculate My BMI</Text>
          </TouchableOpacity>

          {result ? (
            <View style={styles.resultCard}>
              <Text style={styles.resultCaption}>Body Mass Index</Text>
              <Text style={styles.resultValue}>{result.bmi.toFixed(1)}</Text>
              <View style={[styles.categoryBadge, { backgroundColor: result.category.bg }]}>
                <Text style={[styles.categoryText, { color: result.category.color }]}>
                  {result.category.label}
                </Text>
              </View>
              <Text style={styles.explain}>
                {BMI_EXPLAINS[result.category.label] ??
                  `Your BMI is ${result.bmi.toFixed(1)} (${result.category.label}).`}
              </Text>
              {onFindCoach ? (
                <TouchableOpacity style={styles.findCoachBtn} onPress={onFindCoach}>
                  <Ionicons name="search" size={16} color={Colors.white} />
                  <Text style={styles.findCoachText}>Find a Coach</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 20,
    alignItems: 'center',
    ...Shadow.sm,
  },
  sectionTag: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 10,
  },
  bmiTag: { backgroundColor: Colors.accentLight },
  bmiTagText: { color: Colors.accent, fontSize: 11, fontWeight: '700' },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: Colors.textDark, textAlign: 'center' },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    backgroundColor: Colors.accent,
    borderRadius: Radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 22,
    ...Shadow.sm,
  },
  openBtnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  form: { width: '100%', marginTop: 16 },
  field: { marginBottom: 14 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundTan,
    borderRadius: Radius.pill,
    padding: 2,
  },
  unitBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill },
  unitBtnActive: { backgroundColor: Colors.secondary },
  unitBtnText: { fontSize: 11, fontWeight: '700', color: Colors.textLight },
  unitBtnTextActive: { color: Colors.white },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: Colors.textDark, paddingVertical: 10 },
  unitSuffix: { fontSize: 12, fontWeight: '600', color: Colors.textLight, marginLeft: 4 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  calcBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: Radius.pill,
    paddingVertical: 14,
    marginTop: 4,
    ...Shadow.sm,
  },
  calcBtnText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  resultCard: {
    backgroundColor: Colors.secondary,
    borderRadius: Radius.lg,
    padding: 22,
    marginTop: 18,
    alignItems: 'center',
    ...Shadow.md,
  },
  resultCaption: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  resultValue: { fontSize: 48, fontWeight: '800', color: Colors.white, marginTop: 4 },
  categoryBadge: {
    marginTop: 10,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  categoryText: { fontSize: 13, fontWeight: '700' },
  explain: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 14,
  },
  findCoachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    backgroundColor: Colors.accent,
    borderRadius: Radius.pill,
    paddingVertical: 12,
    paddingHorizontal: 22,
  },
  findCoachText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
});
