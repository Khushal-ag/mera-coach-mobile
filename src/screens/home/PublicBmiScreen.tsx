import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PublicHomeHeader from '../../components/home/PublicHomeHeader';
import BmiGauge from '../../components/home/BmiGauge';
import FormErrorBanner from '../../components/FormErrorBanner';
import PhoneTextInput from '../../components/PhoneTextInput';
import KeyboardSafeScroll from '../../components/KeyboardSafeScroll';
import { submitBmiLead } from '../../api/coachApi';
import { getErrorMessage } from '../../api/client';
import { BMI_LEGEND } from '../../constants/publicBmi';
import { BrandImages, PUBLIC_BMI_BANNER_ASPECT } from '../../constants/images';
import {
  Colors,
  FontFamily,
  IconSize,
  PressOpacity,
  Radius,
  Shadow,
  Spacing,
  headingFont,
} from '../../constants/theme';
import { calculatePublicBmi, type HeightUnit, type PublicBmiResult } from '../../utils/publicBmi';
import { stripNonDigits, validateMobile } from '../../utils/validation';
import type { RootScreenProps } from '../../types/navigation';

type Gender = 'male' | 'female';

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

const PANEL = Colors.tipsPanel;
const FIELD_BG = 'rgba(255,255,255,0.1)';
const FIELD_BORDER = 'rgba(255,255,255,0.2)';
const FIELD_PLACEHOLDER = 'rgba(255,255,255,0.4)';
const FEATURES = [
  { icon: 'speedometer-outline', text: 'Instant BMI calculation with health category' },
  { icon: 'bulb-outline', text: 'Personalized wellness suggestions based on results' },
  { icon: 'people-outline', text: 'Connect with the right coach immediately after' },
  { icon: 'lock-closed-outline', text: '100% private and secure, no data stored' },
] as const;

/**
 * Public BMI check, same flow as the web home page:
 * enter measurements, calculate, then leave a name and mobile to unlock the result and get a coach callback.
 */
export default function PublicBmiScreen({ navigation }: RootScreenProps<'PublicBmi'>) {
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const resultY = useRef(0);

  const [gender, setGender] = useState<Gender | ''>('');
  const [age, setAge] = useState('');
  const [unit, setUnit] = useState<HeightUnit>('cm');
  const [heightCm, setHeightCm] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [result, setResult] = useState<PublicBmiResult | null>(null);
  const [leadName, setLeadName] = useState('');
  const [leadMobile, setLeadMobile] = useState('');
  const [leadError, setLeadError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const sendingRef = useRef(false);

  const goHome = () => {
    navigation.navigate('Home', { page: 0 });
  };

  const calculate = () => {
    const outcome = calculatePublicBmi({ unit, heightCm, heightFt, heightIn, weightKg });
    if (!outcome.ok) {
      setFormError(outcome.errors.join('\n'));
      return;
    }
    setFormError(null);
    // A new calculation starts a new lead: the result locks again.
    setSent(false);
    setLeadName('');
    setLeadMobile('');
    setLeadError(null);
    setResult(outcome.result);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, resultY.current - Spacing.md), animated: true });
    }, 100);
  };

  const submitLead = async () => {
    if (sendingRef.current || !result) return;
    const name = leadName.trim();
    if (!name) {
      setLeadError('Please enter your name.');
      return;
    }
    const mobileError = validateMobile(leadMobile);
    if (mobileError) {
      setLeadError(mobileError);
      return;
    }

    sendingRef.current = true;
    setSending(true);
    setLeadError(null);
    try {
      const parsedAge = Number.parseInt(age, 10);
      await submitBmiLead({
        clientName: name,
        clientMobile: stripNonDigits(leadMobile).slice(-10),
        ...(gender ? { gender } : {}),
        age: Number.isFinite(parsedAge) ? parsedAge : null,
        heightCm: result.heightCm,
        weightKg: result.weightKg,
        bmiValue: Number.parseFloat(result.bmi),
        bmiCategory: result.label,
      });
      setSent(true);
    } catch (err) {
      setLeadError(getErrorMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const contentWidth = screenW - Spacing.md * 2;
  const heroHeight = contentWidth / PUBLIC_BMI_BANNER_ASPECT;

  return (
    <View style={styles.screen}>
      <KeyboardSafeScroll
        ref={scrollRef}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.xs,
            paddingBottom: Math.max(insets.bottom, Spacing.lg) + Spacing.md,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <PublicHomeHeader onHomePress={goHome} />

        <View style={[styles.hero, { width: contentWidth, height: heroHeight }]}>
          <Image
            source={BrandImages.publicBmiBanner}
            style={{ width: contentWidth, height: heroHeight }}
            resizeMode="stretch"
            accessibilityRole="image"
            accessibilityLabel="Check Your BMI"
            accessibilityIgnoresInvertColors
          />
        </View>

        <View style={styles.intro}>
          <View style={styles.tag}>
            <Ionicons name="calculator-outline" size={IconSize.sm} color="#c9882a" />
            <Text style={styles.tagText}>Free Health Tool</Text>
          </View>
          <Text style={styles.title}>Know Your BMI, Know Your Health</Text>
          <Text style={styles.subtitle}>
            Use our free BMI calculator to understand your health baseline and get connected with
            the right coach for your wellness goals.
          </Text>
          {FEATURES.map(f => (
            <View key={f.text} style={styles.feature}>
              <Ionicons name={f.icon} size={IconSize.md} color={Colors.secondary} />
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="heart-outline" size={IconSize.lg} color={Colors.accent} />
            <Text style={styles.cardTitle}>BMI Calculator</Text>
          </View>
          <Text style={styles.cardSub}>Enter your details for an instant health check</Text>

          <Text style={styles.label}>Gender</Text>
          <View style={styles.pillRow}>
            {GENDERS.map(g => {
              const active = gender === g.value;
              return (
                <Pressable
                  key={g.value}
                  style={[styles.pill, active && styles.pillActive]}
                  onPress={() => setGender(active ? '' : g.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={g.label}
                >
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>{g.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={v => setAge(stripNonDigits(v).slice(0, 3))}
                placeholder="Years"
                placeholderTextColor={FIELD_PLACEHOLDER}
                keyboardType="number-pad"
                accessibilityLabel="Age in years"
              />
            </View>
            <View style={styles.col}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Height</Text>
                <View style={styles.unitToggle}>
                  {(['cm', 'ft'] as const).map(u => (
                    <Pressable
                      key={u}
                      style={[styles.unitBtn, unit === u && styles.unitBtnActive]}
                      onPress={() => setUnit(u)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: unit === u }}
                      accessibilityLabel={u === 'cm' ? 'Centimetres' : 'Feet and inches'}
                    >
                      <Text style={[styles.unitText, unit === u && styles.unitTextActive]}>
                        {u === 'cm' ? 'cm' : 'ft / in'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              {unit === 'cm' ? (
                <TextInput
                  style={styles.input}
                  value={heightCm}
                  onChangeText={setHeightCm}
                  placeholder="e.g. 165"
                  placeholderTextColor={FIELD_PLACEHOLDER}
                  keyboardType="decimal-pad"
                  accessibilityLabel="Height in centimetres"
                />
              ) : (
                <View style={styles.ftRow}>
                  <TextInput
                    style={[styles.input, styles.ftInput]}
                    value={heightFt}
                    onChangeText={v => setHeightFt(stripNonDigits(v).slice(0, 1))}
                    placeholder="ft"
                    placeholderTextColor={FIELD_PLACEHOLDER}
                    keyboardType="number-pad"
                    accessibilityLabel="Height, feet"
                  />
                  <TextInput
                    style={[styles.input, styles.ftInput]}
                    value={heightIn}
                    onChangeText={v => setHeightIn(stripNonDigits(v).slice(0, 2))}
                    placeholder="in"
                    placeholderTextColor={FIELD_PLACEHOLDER}
                    keyboardType="number-pad"
                    accessibilityLabel="Height, inches"
                  />
                </View>
              )}
            </View>
          </View>

          <Text style={styles.label}>Weight (kg)</Text>
          <TextInput
            style={styles.input}
            value={weightKg}
            onChangeText={setWeightKg}
            placeholder="e.g. 70"
            placeholderTextColor={FIELD_PLACEHOLDER}
            keyboardType="decimal-pad"
            returnKeyType="done"
            onSubmitEditing={calculate}
            accessibilityLabel="Weight in kilograms"
          />

          <View style={styles.banner}>
            <FormErrorBanner message={formError} />
          </View>

          <Pressable
            style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
            onPress={calculate}
            accessibilityRole="button"
            accessibilityLabel="Calculate My BMI"
          >
            <Ionicons name="calculator-outline" size={IconSize.md} color={Colors.white} />
            <Text style={styles.ctaText}>Calculate My BMI</Text>
          </Pressable>
        </View>

        {result ? (
          <View
            style={styles.card}
            onLayout={(e: LayoutChangeEvent) => {
              resultY.current = e.nativeEvent.layout.y;
            }}
          >
            <BmiGauge bmi={Number.parseFloat(result.bmi)} locked={!sent} label={result.label} />
            <View style={styles.legend}>
              {BMI_LEGEND.map(item => (
                <View key={item.label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={styles.legendText}>{item.label}</Text>
                </View>
              ))}
            </View>

            {sent ? (
              <View style={styles.resultBody}>
                <Text style={[styles.headline, { color: result.color }]}>
                  BMI {result.bmi}: {result.label}
                </Text>
                <Text style={styles.explain}>{result.explanation}</Text>
                <View style={styles.success}>
                  <Ionicons name="checkmark-circle" size={IconSize.xl} color="#22c55e" />
                  <Text style={styles.successText}>
                    Thank you! Your result is unlocked above. A top-rated wellness coach will
                    contact you shortly.
                  </Text>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
                  onPress={() => navigation.navigate('CoachList')}
                  accessibilityRole="button"
                  accessibilityLabel="Browse All Coaches"
                >
                  <Ionicons name="search-outline" size={IconSize.md} color={Colors.white} />
                  <Text style={styles.ctaText}>Browse All Coaches</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.resultBody}>
                <View style={styles.lockBadge}>
                  <Ionicons name="lock-closed-outline" size={IconSize.sm} color={Colors.white} />
                  <Text style={styles.lockBadgeText}>Your result is ready</Text>
                </View>
                <Text style={styles.lockTitle}>Unlock your BMI result</Text>
                <Text style={styles.explain}>
                  Enter your name and mobile number to unlock your BMI result. A top-rated wellness
                  coach will also reach out with personalised guidance.{' '}
                  <Text style={styles.strong}>Free. No commitments.</Text>
                </Text>
                <TextInput
                  style={[styles.input, styles.leadInput]}
                  value={leadName}
                  onChangeText={v => {
                    setLeadName(v);
                    setLeadError(null);
                  }}
                  placeholder="Your Name"
                  placeholderTextColor={FIELD_PLACEHOLDER}
                  maxLength={100}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  accessibilityLabel="Your Name"
                />
                <PhoneTextInput
                  style={[styles.input, styles.leadInput]}
                  value={leadMobile}
                  onChangeText={v => {
                    setLeadMobile(v);
                    setLeadError(null);
                  }}
                  placeholder="Mobile Number"
                  placeholderTextColor={FIELD_PLACEHOLDER}
                  returnKeyType="done"
                  onSubmitEditing={() => void submitLead()}
                  accessibilityLabel="Mobile Number"
                />
                <View style={styles.banner}>
                  <FormErrorBanner message={leadError} />
                </View>
                <Pressable
                  style={({ pressed }) => [styles.cta, (pressed || sending) && styles.pressed]}
                  onPress={() => void submitLead()}
                  disabled={sending}
                  accessibilityRole="button"
                  accessibilityLabel="Unlock My BMI Result"
                  accessibilityState={{ disabled: sending, busy: sending }}
                >
                  {sending ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <>
                      <Ionicons name="lock-open-outline" size={IconSize.md} color={Colors.white} />
                      <Text style={styles.ctaText}>Unlock My BMI Result</Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        ) : null}
      </KeyboardSafeScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.exploreCanvas },
  content: { paddingHorizontal: Spacing.md },
  pressed: { opacity: PressOpacity.default },
  banner: { marginTop: Spacing.sm },
  hero: { marginTop: Spacing.md, borderRadius: Radius.lg, overflow: 'hidden' },
  intro: { marginTop: Spacing.md, marginBottom: Spacing.md },
  tag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.pill,
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
  },
  tagText: { fontFamily: FontFamily.semibold, fontSize: 12, color: '#c9882a' },
  title: {
    marginTop: Spacing.sm,
    fontFamily: headingFont.extraBold,
    fontSize: 24,
    lineHeight: 31,
    color: Colors.textDark,
  },
  subtitle: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textLight,
  },
  feature: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 4 },
  featureText: { flex: 1, fontFamily: FontFamily.medium, fontSize: 13, color: Colors.textDark },
  card: {
    backgroundColor: PANEL,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.md,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  cardTitle: { fontFamily: headingFont.bold, fontSize: 20, color: Colors.white },
  cardSub: {
    marginTop: 2,
    marginBottom: Spacing.xs,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  label: {
    marginTop: Spacing.sm,
    marginBottom: 6,
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  row: { flexDirection: 'row', gap: Spacing.sm },
  col: { flex: 1 },
  input: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    backgroundColor: FIELD_BG,
    paddingHorizontal: 14,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.white,
  },
  leadInput: { marginTop: Spacing.sm },
  ftRow: { flexDirection: 'row', gap: Spacing.xs },
  ftInput: { flex: 1 },
  pillRow: { flexDirection: 'row', gap: Spacing.sm },
  pill: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    backgroundColor: FIELD_BG,
  },
  pillActive: { backgroundColor: Colors.white, borderColor: Colors.white },
  pillText: { fontFamily: FontFamily.semibold, fontSize: 14, color: Colors.white },
  pillTextActive: { color: PANEL },
  unitToggle: {
    flexDirection: 'row',
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    marginTop: Spacing.sm,
    marginBottom: 6,
  },
  unitBtn: { paddingHorizontal: 8, paddingVertical: 3 },
  unitBtnActive: { backgroundColor: Colors.white },
  unitText: { fontFamily: FontFamily.semibold, fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  unitTextActive: { color: PANEL },
  cta: {
    marginTop: Spacing.md,
    minHeight: 52,
    borderRadius: Radius.pill,
    backgroundColor: Colors.brandCoach,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  ctaText: { fontFamily: headingFont.bold, fontSize: 15, color: Colors.white },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontFamily: FontFamily.medium, fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  resultBody: { marginTop: Spacing.md },
  lockBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(201,136,42,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(201,136,42,0.45)',
    borderRadius: Radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  lockBadgeText: { fontFamily: FontFamily.semibold, fontSize: 12, color: Colors.white },
  lockTitle: {
    marginTop: Spacing.sm,
    fontFamily: headingFont.bold,
    fontSize: 20,
    color: Colors.white,
  },
  headline: { fontFamily: headingFont.extraBold, fontSize: 22, lineHeight: 28 },
  explain: {
    marginTop: Spacing.xs,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.85)',
  },
  strong: { fontFamily: FontFamily.bold, color: Colors.white },
  success: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
  },
  successText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.white,
  },
});
