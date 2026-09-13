import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Colors,
  FontFamily,
  IconSize,
  PressOpacity,
  Radius,
  Shadow,
  Spacing,
  formFieldStyles,
} from '../../constants/theme';
import { BrandImages } from '../../constants/images';
import AppButton from '../../components/AppButton';
import BrandLockup from '../../components/BrandLockup';
import PhoneTextInput from '../../components/PhoneTextInput';
import DropdownField from '../../components/DropdownField';
import FormErrorBanner from '../../components/FormErrorBanner';
import FormFieldLabel from '../../components/FormFieldLabel';
import KeyboardSafeScroll, {
  useScrollLowerFieldsIntoView,
} from '../../components/KeyboardSafeScroll';
import { HeaderBackButton } from '../../components/ScreenHeader';
import { COACH_CATEGORIES as FALLBACK_CATEGORIES } from '../../data/homeContent';
import { getCoachCategories, registerCoach } from '../../api/coachApi';
import { clearSession } from '../../auth/session';
import { getErrorMessage } from '../../api/client';
import { sanitizeEmailInput, validateCoachRegister } from '../../utils/validation';
import { useFormFieldErrors } from '../../hooks/useFormFieldErrors';
import type { RootScreenProps } from '../../types/navigation';
import type { CoachCategory } from '../../types/models';

export default function RegisterScreen({ navigation }: RootScreenProps<'Register'>) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const scrollLowerFieldsIntoView = useScrollLowerFieldsIntoView(scrollRef);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [referralMobile, setReferralMobile] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const {
    errorFields,
    formErrorBanner,
    clearFieldError,
    clearAllErrors,
    applyValidation,
    setBanner,
  } = useFormFieldErrors();

  const [categories, setCategories] = useState<CoachCategory[]>(FALLBACK_CATEGORIES);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => {
    getCoachCategories()
      .then(list => {
        if (list.length) setCategories(list);
      })
      .catch(() => {
        /* keep fallback list on network failure */
      })
      .finally(() => setCategoriesLoading(false));
  }, []);

  const categoryLabels = categories.map(c => c.label);

  const handleRegister = async () => {
    if (applyValidation(validateCoachRegister({ name, category, mobile, email, referralMobile }))) {
      return;
    }

    const coachTypeCode = categories.find(c => c.label === category)?.code;
    const referrer = referralMobile.trim();
    clearAllErrors();
    setSubmitting(true);
    try {
      await registerCoach({
        coachName: name.trim(),
        coachTypeCode,
        mobile: mobile.trim(),
        email: email.trim(),
        ...(referrer ? { referrerMobile: referrer } : {}),
      });

      // Never auto-login after register — credentials are emailed; user must sign in themselves.
      await clearSession();

      Alert.alert(
        'Registration Successful',
        `Your account has been created. Your login password has been shared on ${email.trim()}. Please check your email and sign in to continue.`,
        [{ text: 'OK', onPress: () => navigation.replace('Login') }],
      );
    } catch (err) {
      setBanner(getErrorMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ImageBackground source={BrandImages.loginAtmosphere} style={styles.bg} resizeMode="cover">
      <View style={styles.scrim} />
      <KeyboardSafeScroll
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.inner}
        keyboardPadding={180}
      >
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <HeaderBackButton onPress={() => navigation.goBack()} style={styles.headerBack} />
          <BrandLockup size="lg" style={styles.logo} />
        </View>

        <View style={styles.card}>
          <FormErrorBanner message={formErrorBanner} />

          <Text style={styles.cardTitle}>Create Account</Text>
          <Text style={styles.cardSub}>Register as a coach in a few steps</Text>

          <View style={styles.infoBanner}>
            <Ionicons name="mail-open-outline" size={18} color={Colors.secondary} />
            <View style={styles.infoCopy}>
              <Text style={styles.infoTitle}>We&apos;ll email your login password</Text>
              <Text style={styles.infoText}>
                After you register, finish your profile details once you sign in.
              </Text>
            </View>
          </View>

          <View style={styles.field}>
            <FormFieldLabel required>Coach Name</FormFieldLabel>
            <View style={[styles.inputWrap, errorFields.name && styles.inputWrapError]}>
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
                  clearFieldError('name');
                }}
              />
            </View>
          </View>

          <DropdownField
            label="Coach Category"
            value={category}
            options={categoryLabels}
            onChange={v => {
              setCategory(v);
              clearFieldError('category');
            }}
            placeholder={categoriesLoading ? 'Loading categories...' : 'Select a category'}
            required
            hasError={!!errorFields.category}
          />

          <View style={styles.field}>
            <FormFieldLabel required>Mobile Number</FormFieldLabel>
            <View style={[styles.inputWrap, errorFields.mobile && styles.inputWrapError]}>
              <Ionicons
                name="call-outline"
                size={IconSize.md}
                color={Colors.textLight}
                style={styles.inputIcon}
              />
              <PhoneTextInput
                style={styles.input}
                placeholder="10-digit mobile number"
                placeholderTextColor={Colors.textLight}
                value={mobile}
                onChangeText={v => {
                  setMobile(v);
                  clearFieldError('mobile');
                }}
                onFocus={scrollLowerFieldsIntoView}
              />
            </View>
          </View>

          <View style={styles.field}>
            <FormFieldLabel required>Email Address</FormFieldLabel>
            <View style={[styles.inputWrap, errorFields.email && styles.inputWrapError]}>
              <Ionicons
                name="mail-outline"
                size={IconSize.md}
                color={Colors.textLight}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={Colors.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={v => {
                  setEmail(sanitizeEmailInput(v));
                  clearFieldError('email');
                }}
                onFocus={scrollLowerFieldsIntoView}
              />
            </View>
            <Text style={styles.hint}>Password will be sent to this email</Text>
          </View>

          <View style={styles.field}>
            <FormFieldLabel>Referred by (mobile)</FormFieldLabel>
            <View style={[styles.inputWrap, errorFields.referralMobile && styles.inputWrapError]}>
              <Ionicons
                name="people-outline"
                size={IconSize.md}
                color={Colors.textLight}
                style={styles.inputIcon}
              />
              <PhoneTextInput
                style={styles.input}
                placeholder="Optional 10-digit mobile"
                placeholderTextColor={Colors.textLight}
                value={referralMobile}
                onChangeText={v => {
                  setReferralMobile(v);
                  clearFieldError('referralMobile');
                }}
                onFocus={scrollLowerFieldsIntoView}
              />
            </View>
            {errorFields.referralMobile ? (
              <Text style={styles.fieldError}>{errorFields.referralMobile}</Text>
            ) : (
              <Text style={styles.hint}>If someone recommended Mera Coach, enter their mobile</Text>
            )}
          </View>

          <AppButton
            label="Create Account"
            onPress={() => void handleRegister()}
            loading={submitting}
            icon="arrow-forward"
            style={styles.registerBtn}
          />
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          activeOpacity={PressOpacity.soft}
          accessibilityRole="button"
          accessibilityLabel="Sign in"
        >
          <Text style={styles.footerLink}>
            Already registered? <Text style={styles.footerLinkBold}>Sign in</Text>
          </Text>
        </TouchableOpacity>

        <Text style={styles.footer}>Mera Coach © 2026 · Health & wellness coaching</Text>
      </KeyboardSafeScroll>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: Colors.secondary },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.authScrim,
  },
  container: { flex: 1, backgroundColor: 'transparent', zIndex: 1 },
  inner: { flexGrow: 1, alignItems: 'center', paddingBottom: Spacing.lg },
  header: {
    alignItems: 'center',
    paddingBottom: Spacing.lg,
    width: '100%',
    paddingHorizontal: Spacing.lg,
  },
  headerBack: { alignSelf: 'flex-start', marginBottom: Spacing.sm },
  logo: { marginBottom: Spacing.sm },
  card: {
    width: '90%',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadow.lg,
  },
  cardTitle: { fontSize: 22, fontFamily: FontFamily.bold, color: Colors.textDark, marginBottom: 4 },
  cardSub: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    marginBottom: Spacing.md,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  infoCopy: { flex: 1 },
  infoTitle: { fontSize: 13, fontFamily: FontFamily.bold, color: Colors.secondary },
  infoText: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.secondary,
    marginTop: 2,
    lineHeight: 17,
    opacity: 0.85,
  },
  field: { marginBottom: Spacing.md },
  inputWrap: formFieldStyles.wrap,
  inputWrapError: formFieldStyles.wrapError,
  inputIcon: formFieldStyles.inputIcon,
  input: formFieldStyles.input,
  hint: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    marginTop: 6,
  },
  fieldError: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
    color: Colors.destructive,
    marginTop: 6,
  },
  registerBtn: {
    marginTop: Spacing.xs,
  },
  footerLink: {
    color: Colors.onDarkMuted,
    fontSize: 13,
    fontFamily: FontFamily.regular,
    marginTop: Spacing.lg,
  },
  footerLinkBold: { color: Colors.white, fontFamily: FontFamily.bold },
  footer: {
    color: Colors.onDarkSoft,
    fontSize: 12,
    fontFamily: FontFamily.medium,
    marginTop: Spacing.md,
  },
});
