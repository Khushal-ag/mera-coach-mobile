import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PublicHomeHeader from '../../components/home/PublicHomeHeader';
import BmiGaugeArt from '../../components/home/BmiGaugeArt';
import FormErrorBanner from '../../components/FormErrorBanner';
import FormFieldLabel from '../../components/FormFieldLabel';
import PhoneTextInput from '../../components/PhoneTextInput';
import KeyboardSafeScroll from '../../components/KeyboardSafeScroll';
import { submitCoachEnquiry } from '../../api/coachApi';
import { getErrorMessage } from '../../api/client';
import {
  Colors,
  FontFamily,
  FormControl,
  IconSize,
  PressOpacity,
  Radius,
  Shadow,
  Spacing,
  formFieldStyles,
  headingFont,
} from '../../constants/theme';
import { validateMobile, validateRequired } from '../../utils/validation';
import type { RootScreenProps } from '../../types/navigation';

export default function PublicBmiScreen({ navigation }: RootScreenProps<'PublicBmi'>) {
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [success, setSuccess] = useState(false);

  const goHome = () => {
    navigation.navigate('Home', { page: 0 });
  };

  const onSubmit = async () => {
    if (submittingRef.current) return;
    const validationError = validateRequired(name, 'Name') || validateMobile(mobile);
    if (validationError) {
      setBanner(validationError);
      setSuccess(false);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setBanner(null);
    try {
      // Figma form only collects name + mobile. submitBmiLead requires height/weight/BMI,
      // so this screen uses the public coach enquiry lead endpoint instead.
      await submitCoachEnquiry({
        clientName: name.trim(),
        clientMobile: mobile.trim(),
        lookingFor: 'BMI discussion',
      });
      setSuccess(true);
    } catch (err) {
      setBanner(getErrorMessage(err, 'Could not submit your details. Please try again.'));
      setSuccess(false);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const bannerH = Math.min(150, Math.max(128, screenW * 0.38));

  return (
    <View style={styles.screen}>
      <KeyboardSafeScroll
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

        <View style={[styles.hero, { height: bannerH, marginTop: Spacing.md }]}>
          <View style={styles.heroText}>
            <Text style={styles.heroCheck}>Check Your</Text>
            <Text style={styles.heroBmi}>BMI</Text>
            <View style={styles.heroRule} />
            <Text style={styles.heroSub}>Add your details to see your result</Text>
          </View>
          <BmiGaugeArt size={112} style={styles.heroArt} />
        </View>

        <View style={styles.revealBar}>
          <Text style={styles.revealBarText}>Enter your name and mobile to reveal your BMI</Text>
        </View>

        <Text style={styles.helper}>
          Share your name and mobile. A top-rated coach will call you back.{' '}
          <Text style={styles.helperStrong}>Free, no commitment.</Text>
        </Text>

        <FormErrorBanner message={banner} />
        {success ? (
          <View style={styles.successBox} accessibilityRole="text">
            <Ionicons name="checkmark-circle" size={IconSize.lg} color={Colors.secondary} />
            <Text style={styles.successText}>
              Thanks! A coach will reach out to discuss your BMI.
            </Text>
          </View>
        ) : null}

        <View style={styles.field}>
          <FormFieldLabel required>Your Name</FormFieldLabel>
          <View style={styles.inputWrap}>
            <Ionicons
              name="person-outline"
              size={IconSize.md}
              color={Colors.textLight}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Your full name"
              placeholderTextColor={Colors.textLight}
              value={name}
              onChangeText={v => {
                setName(v);
                setBanner(null);
                setSuccess(false);
              }}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>
        </View>

        <View style={styles.field}>
          <FormFieldLabel required>Mobile Number</FormFieldLabel>
          <View style={styles.inputWrap}>
            <Ionicons
              name="call-outline"
              size={IconSize.md}
              color={Colors.textLight}
              style={styles.inputIcon}
            />
            <PhoneTextInput
              style={styles.input}
              placeholder="10-digit-mobile number"
              placeholderTextColor={Colors.textLight}
              value={mobile}
              onChangeText={v => {
                setMobile(v);
                setBanner(null);
                setSuccess(false);
              }}
              returnKeyType="done"
              onSubmitEditing={() => void onSubmit()}
            />
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.submitBtn, pressed && styles.pressed]}
          onPress={() => void onSubmit()}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityLabel="Discuss Your BMI with Coaches"
        >
          {submitting ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Text style={styles.submitText}>Discuss Your BMI with Coaches</Text>
              <View style={styles.submitArrow}>
                <Ionicons name="arrow-forward" size={14} color={Colors.brandCoach} />
              </View>
            </>
          )}
        </Pressable>
      </KeyboardSafeScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.exploreCanvas,
  },
  content: {
    paddingHorizontal: Spacing.md,
  },
  pressed: {
    opacity: PressOpacity.default,
  },
  hero: {
    borderRadius: Radius.lg,
    backgroundColor: Colors.exploreBanner,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.md,
    paddingRight: Spacing.sm,
  },
  heroText: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingRight: Spacing.xs,
  },
  heroCheck: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    lineHeight: 22,
    color: Colors.white,
  },
  heroBmi: {
    fontFamily: headingFont.bold,
    fontSize: 22,
    lineHeight: 28,
    color: Colors.exploreBannerAccent,
  },
  heroRule: {
    width: 56,
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: Colors.onDarkBorderStrong,
    marginVertical: Spacing.xs,
  },
  heroSub: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.onDarkNearWhite,
  },
  heroArt: {
    marginRight: Spacing.xs,
  },
  revealBar: {
    marginTop: Spacing.md,
    backgroundColor: Colors.secondary,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
  },
  revealBarText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.white,
    textAlign: 'center',
  },
  helper: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 20,
    color: Colors.textDark,
    textAlign: 'center',
    paddingHorizontal: Spacing.xs,
  },
  helperStrong: {
    fontFamily: FontFamily.bold,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  successText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.secondaryDark,
  },
  field: {
    marginBottom: Spacing.md,
  },
  inputWrap: {
    ...formFieldStyles.wrap,
    ...formFieldStyles.wrapSurface,
    borderRadius: Radius.sm,
    height: FormControl.height,
  },
  inputIcon: {
    ...formFieldStyles.inputIcon,
  },
  input: {
    ...formFieldStyles.input,
    height: '100%',
  },
  submitBtn: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.brandCoach,
    borderRadius: Radius.pill,
    minHeight: 56,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    ...Shadow.md,
  },
  submitText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.white,
    flexShrink: 1,
    textAlign: 'center',
  },
  submitArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
