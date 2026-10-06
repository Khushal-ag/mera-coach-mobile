import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PublicHomeHeader from '../../components/home/PublicHomeHeader';
import FormErrorBanner from '../../components/FormErrorBanner';
import FormFieldLabel from '../../components/FormFieldLabel';
import PhoneTextInput from '../../components/PhoneTextInput';
import KeyboardSafeScroll from '../../components/KeyboardSafeScroll';
import { submitCoachEnquiry } from '../../api/coachApi';
import { getErrorMessage } from '../../api/client';
import { BrandImages, PUBLIC_BMI_BANNER_ASPECT } from '../../constants/images';
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

  const contentWidth = screenW - Spacing.md * 2;
  const heroHeight = contentWidth / PUBLIC_BMI_BANNER_ASPECT;

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

        <View style={styles.revealBar}>
          <Text style={styles.revealBarText}>Enter your name and mobile to reveal your BMI</Text>
        </View>

        <Text style={styles.helper}>
          Share your name and mobile. A top-rated coach will call you back.
        </Text>
        <Text style={styles.helperStrong}>Free, no commitment.</Text>

        <FormErrorBanner message={banner} />
        {success ? (
          <View style={styles.successBox} accessibilityRole="text">
            <Ionicons name="checkmark-circle-outline" size={IconSize.lg} color={Colors.secondary} />
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
              color={Colors.secondary}
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
              color={Colors.secondary}
              style={styles.inputIcon}
            />
            <PhoneTextInput
              style={styles.input}
              placeholder="10-digit mobile number"
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
          accessibilityState={{ disabled: submitting, busy: submitting }}
        >
          {submitting ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Text style={styles.submitLine}>Discuss Your BMI</Text>
              <Text style={styles.submitLine}>with Coaches</Text>
              <View style={styles.submitArrow}>
                <Ionicons
                  name="arrow-forward-outline"
                  size={IconSize.sm}
                  color={Colors.brandCoach}
                />
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
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  revealBar: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.accentInk,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
  },
  revealBarText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.white,
    textAlign: 'center',
  },
  helper: {
    marginTop: Spacing.md,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textDark,
    textAlign: 'center',
    paddingHorizontal: Spacing.xs,
  },
  helperStrong: {
    marginTop: Spacing.xxs,
    marginBottom: Spacing.md,
    fontFamily: FontFamily.bold,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textDark,
    textAlign: 'center',
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
    borderRadius: Radius.md,
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
    minHeight: 68,
    borderRadius: Radius.pill,
    backgroundColor: Colors.brandCoach,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: 52,
    ...Shadow.md,
  },
  submitLine: {
    fontFamily: headingFont.bold,
    fontSize: 16,
    lineHeight: 21,
    color: Colors.white,
    textAlign: 'center',
  },
  submitArrow: {
    position: 'absolute',
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
