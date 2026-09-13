import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FormErrorBanner from '../FormErrorBanner';
import FormFieldLabel from '../FormFieldLabel';
import PhoneTextInput from '../PhoneTextInput';
import SectionHeading from './SectionHeading';
import {
  Colors,
  FontFamily,
  FormControl,
  Radius,
  Shadow,
  Spacing,
  buttonStyles,
} from '../../constants/theme';
import { submitBmiLead } from '../../api/coachApi';
import { getErrorMessage } from '../../api/client';
import { getBmi, getBmiCategory } from '../../utils/bmi';
import {
  HEIGHT_CM_MAX,
  HEIGHT_CM_MIN,
  cmToFeetInches,
  feetInchesToCm,
  validateHeight,
  validateMobile,
  validateRequired,
  validateWeight,
} from '../../utils/validation';
import type { BmiCategory } from '../../types/models';

type HeightUnit = 'cm' | 'ftin';

const BMI_EXPLAINS: Record<string, string> = {
  Underweight:
    'Your BMI is below the healthy range. A nutrition or fitness coach can help you build weight safely.',
  Normal: 'Your BMI is in the healthy range. A wellness or yoga coach can help you keep it there.',
  Overweight:
    'Your BMI is above the healthy range. Even a small amount of weight loss helps. A lifestyle coach can help you plan.',
  Obese:
    'Your BMI suggests obesity. A weight management or nutrition coach can help you work on this step by step.',
};

type Props = {
  onFindCoach?: () => void;
  onFieldFocus?: () => void;
  style?: StyleProp<ViewStyle>;
};

export default function PublicBmiCard({ onFindCoach, onFieldFocus, style }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [heightUnit, setHeightUnit] = useState<HeightUnit>('cm');
  const [heightCm, setHeightCm] = useState('');
  const [feetText, setFeetText] = useState('');
  const [inchesText, setInchesText] = useState('');
  const [weight, setWeight] = useState('');
  const [banner, setBanner] = useState<string | null>(null);
  const [result, setResult] = useState<{
    bmi: number;
    category: BmiCategory;
    heightCm: number;
    weightKg: number;
  } | null>(null);
  const [leadName, setLeadName] = useState('');
  const [leadMobile, setLeadMobile] = useState('');
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState(false);

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
      setLeadSuccess(false);
      return;
    }
    setBanner(null);
    const bmi = getBmi(h, weight);
    const category = getBmiCategory(bmi);
    if (bmi == null || !category) {
      setBanner('Could not calculate BMI. Check your height and weight.');
      setResult(null);
      setLeadSuccess(false);
      return;
    }
    setLeadName('');
    setLeadMobile('');
    setLeadSuccess(false);
    setResult({
      bmi,
      category,
      heightCm: parseFloat(h),
      weightKg: parseFloat(weight),
    });
  };

  const submitLead = async () => {
    if (!result) return;
    const validationError = validateRequired(leadName, 'Name') || validateMobile(leadMobile);
    if (validationError) {
      setBanner(validationError);
      return;
    }

    setLeadSubmitting(true);
    setBanner(null);
    try {
      await submitBmiLead({
        clientName: leadName.trim(),
        clientMobile: leadMobile.trim(),
        heightCm: result.heightCm,
        weightKg: result.weightKg,
        bmiValue: result.bmi,
        bmiCategory: result.category.label,
      });
      setLeadSuccess(true);
    } catch (err) {
      setBanner(getErrorMessage(err, 'Could not submit your details. Please try again.'));
    } finally {
      setLeadSubmitting(false);
    }
  };

  return (
    <View style={[styles.section, style]}>
      <SectionHeading title="Know Your BMI" icon="calculator-outline" />
      <Text style={styles.sectionSubtitle}>
        Get your BMI in seconds. Share your details after to hear from a coach.
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
              <View style={styles.resultReveal}>
                {leadSuccess ? (
                  <View style={styles.resultContent}>
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
                  </View>
                ) : (
                  <View
                    style={styles.gatePanel}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  >
                    <View style={styles.gateMessage}>
                      <Ionicons name="lock-closed-outline" size={22} color={Colors.white} />
                      <Text style={styles.gateTitle}>Add your details to see your result</Text>
                      <Text style={styles.gateSubtitle}>
                        Enter your name and mobile to reveal your BMI
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {leadSuccess ? (
                <View style={styles.leadSuccess}>
                  <Ionicons name="checkmark-circle" size={22} color={Colors.white} />
                  <Text style={styles.leadSuccessText}>
                    Thanks! A wellness coach will reach out to you soon.
                  </Text>
                  {onFindCoach ? (
                    <TouchableOpacity style={styles.findCoachBtn} onPress={onFindCoach}>
                      <Ionicons name="search" size={16} color={Colors.white} />
                      <Text style={styles.findCoachText}>Browse Coaches</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : (
                <View style={styles.leadForm}>
                  <Text style={styles.leadPrompt}>
                    Share your name and mobile. A top-rated coach will call you back.{' '}
                    <Text style={styles.leadPromptStrong}>Free, no commitment.</Text>
                  </Text>
                  <View style={styles.leadField}>
                    <FormFieldLabel required style={styles.leadLabel}>
                      Your Name
                    </FormFieldLabel>
                    <TextInput
                      style={styles.leadInput}
                      placeholder="Your name"
                      placeholderTextColor={Colors.onDarkBorderStrong}
                      value={leadName}
                      onChangeText={v => {
                        setLeadName(v);
                        setBanner(null);
                      }}
                      onFocus={onFieldFocus}
                    />
                  </View>
                  <View style={styles.leadField}>
                    <FormFieldLabel required style={styles.leadLabel}>
                      Mobile Number
                    </FormFieldLabel>
                    <PhoneTextInput
                      style={styles.leadInput}
                      placeholder="10-digit mobile number"
                      placeholderTextColor={Colors.onDarkBorderStrong}
                      value={leadMobile}
                      onChangeText={v => {
                        setLeadMobile(v);
                        setBanner(null);
                      }}
                      onFocus={onFieldFocus}
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.leadBtn, leadSubmitting && styles.leadBtnDisabled]}
                    onPress={submitLead}
                    disabled={leadSubmitting}
                  >
                    {leadSubmitting ? (
                      <ActivityIndicator color={Colors.textDark} />
                    ) : (
                      <>
                        <Ionicons name="chatbubbles-outline" size={16} color={Colors.textDark} />
                        <Text style={styles.leadBtnText}>Discuss Your BMI with Coaches</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadow.md,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 0,
    marginBottom: 2,
    lineHeight: 18,
    paddingHorizontal: 4,
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: Spacing.md,
    backgroundColor: Colors.accent,
    borderRadius: Radius.pill,
    paddingVertical: 13,
    paddingHorizontal: 20,
    ...Shadow.sm,
  },
  openBtnText: { color: Colors.white, fontFamily: FontFamily.bold, fontSize: 14 },
  form: { width: '100%', marginTop: Spacing.md },
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
  unitBtnText: { fontSize: 11, fontFamily: FontFamily.bold, color: Colors.textLight },
  unitBtnTextActive: { color: Colors.white },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.textDark,
    paddingVertical: 10,
  },
  unitSuffix: {
    fontSize: 12,
    fontFamily: FontFamily.semibold,
    color: Colors.textLight,
    marginLeft: 4,
  },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  calcBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: Radius.pill,
    paddingVertical: 13,
    marginTop: 4,
    ...Shadow.sm,
  },
  calcBtnText: { color: Colors.white, fontSize: 14, fontFamily: FontFamily.bold },
  resultCard: {
    backgroundColor: Colors.secondary,
    borderRadius: Radius.lg,
    padding: 20,
    marginTop: Spacing.md,
    alignItems: 'center',
    ...Shadow.md,
  },
  resultReveal: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: Radius.md,
  },
  resultContent: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  gatePanel: {
    width: '100%',
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    borderRadius: Radius.md,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  gateMessage: {
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  gateTitle: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: FontFamily.bold,
    textAlign: 'center',
    lineHeight: 21,
  },
  gateSubtitle: {
    color: Colors.onDarkBright,
    fontSize: 12,
    fontFamily: FontFamily.regular,
    textAlign: 'center',
    lineHeight: 17,
  },
  resultCaption: {
    color: Colors.onDarkCaption,
    fontSize: 12,
    fontFamily: FontFamily.semibold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  resultValue: {
    fontSize: 44,
    fontFamily: FontFamily.extraBold,
    color: Colors.white,
    marginTop: 4,
  },
  categoryBadge: {
    marginTop: 10,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  categoryText: { fontSize: 13, fontFamily: FontFamily.bold },
  explain: {
    color: Colors.onDarkBright,
    fontSize: 13,
    fontFamily: FontFamily.regular,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 14,
  },
  leadForm: { width: '100%', marginTop: Spacing.md },
  leadPrompt: {
    color: Colors.onDarkBright,
    fontSize: 13,
    fontFamily: FontFamily.regular,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  leadPromptStrong: { fontFamily: FontFamily.bold, color: Colors.white },
  leadField: { marginBottom: Spacing.md },
  leadLabel: {
    color: Colors.onDarkNearWhite,
    marginBottom: 10,
  },
  leadInput: {
    backgroundColor: Colors.onDarkSubtle,
    borderWidth: 1,
    borderColor: Colors.onDarkBorderMid,
    borderRadius: FormControl.radius,
    paddingHorizontal: FormControl.paddingHorizontal,
    height: FormControl.height - 2,
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.white,
  },
  leadBtn: {
    ...buttonStyles.compact,
    backgroundColor: Colors.accent,
    marginTop: 6,
    paddingHorizontal: Spacing.md + 2,
    minHeight: 44,
  },
  leadBtnDisabled: buttonStyles.disabled,
  leadBtnText: {
    color: Colors.textDark,
    fontFamily: FontFamily.bold,
    fontSize: 14,
  },
  leadSuccess: { alignItems: 'center', marginTop: Spacing.md, gap: 10 },
  leadSuccessText: {
    color: Colors.onDarkNearWhite,
    fontSize: 13,
    fontFamily: FontFamily.regular,
    textAlign: 'center',
    lineHeight: 19,
  },
  findCoachBtn: {
    ...buttonStyles.compact,
    backgroundColor: Colors.accent,
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.lg - 2,
    minHeight: 44,
  },
  findCoachText: {
    color: Colors.white,
    fontFamily: FontFamily.bold,
    fontSize: 14,
  },
});
