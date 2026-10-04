import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Colors,
  FontFamily,
  HitSlop,
  IconSize,
  PressOpacity,
  Radius,
  Shadow,
  Spacing,
  TouchTarget,
  headingFont,
} from '../../constants/theme';
import { AuthLayout } from '../../constants/authLayout';
import AuthAtmosphereLayout from '../../components/auth/AuthAtmosphereLayout';
import AuthCtaButton from '../../components/auth/AuthCtaButton';
import AuthFormHeader from '../../components/auth/AuthFormHeader';
import { authFormStyles } from '../../components/auth/authFormStyles';
import PhoneTextInput from '../../components/PhoneTextInput';
import FormErrorBanner from '../../components/FormErrorBanner';
import FormFieldLabel from '../../components/FormFieldLabel';
import { COACH_CATEGORIES as FALLBACK_CATEGORIES } from '../../data/homeContent';
import { getCoachCategories, registerCoach } from '../../api/coachApi';
import { MASTER_STALE_MS } from '../../api/queryClient';
import { queryKeys } from '../../api/queryKeys';
import { clearSession } from '../../auth/session';
import { toUserMessage } from '../../api/client';
import { sanitizeEmailInput, validateCoachRegister } from '../../utils/validation';
import { useFormFieldErrors } from '../../hooks/useFormFieldErrors';
import type { RootScreenProps } from '../../types/navigation';

export default function RegisterScreen({ navigation }: RootScreenProps<'Register'>) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  /** Optional API field; hidden from the Create Account UI. */
  const [referralMobile] = useState('');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const {
    errorFields,
    formErrorBanner,
    clearFieldError,
    clearAllErrors,
    applyValidation,
    setBanner,
  } = useFormFieldErrors();

  const categoriesQuery = useQuery({
    queryKey: queryKeys.coachCategories,
    queryFn: getCoachCategories,
    staleTime: MASTER_STALE_MS,
  });
  const categories = categoriesQuery.data?.length ? categoriesQuery.data : FALLBACK_CATEGORIES;
  const categoriesLoading = categoriesQuery.isPending;
  const selectedCategory = categories.find(c => c.label === category || c.code === category);

  const handleRegister = async () => {
    if (submittingRef.current) return;
    if (applyValidation(validateCoachRegister({ name, category, mobile, email, referralMobile }))) {
      return;
    }

    const coachTypeCode = categories.find(c => c.label === category || c.code === category)?.code;
    const referrer = referralMobile.trim();
    clearAllErrors();
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await registerCoach({
        coachName: name.trim(),
        coachTypeCode,
        mobile: mobile.trim(),
        email: email.trim(),
        ...(referrer ? { referrerMobile: referrer } : {}),
      });

      await clearSession();

      Alert.alert(
        'Registration Successful',
        `Your account has been created. Your login password has been shared on ${email.trim()}. Please check your email and sign in to continue.`,
        [{ text: 'OK', onPress: () => navigation.replace('Login') }],
      );
    } catch (err) {
      setBanner(toUserMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <>
      <AuthAtmosphereLayout>
        <AuthFormHeader
          onBack={() => navigation.navigate('Home')}
          backAccessibilityLabel="Back to home"
        />

        <View style={authFormStyles.form}>
          <FormErrorBanner message={formErrorBanner} />

          <Text style={authFormStyles.title}>Create Account</Text>
          <Text style={authFormStyles.sub}>Register as a coach in a few steps.</Text>

          <View style={styles.field}>
            <FormFieldLabel required style={styles.fieldLabel}>
              Coach Name
            </FormFieldLabel>
            <View
              style={[
                authFormStyles.inputWrap,
                styles.inputNoMargin,
                errorFields.name && authFormStyles.inputWrapError,
              ]}
            >
              <Ionicons
                name="person-outline"
                size={IconSize.md}
                color={Colors.authCtaGradientStart}
                style={authFormStyles.inputIcon}
              />
              <TextInput
                style={authFormStyles.input}
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

          <View style={styles.field}>
            <FormFieldLabel required style={styles.fieldLabel}>
              Coach Category
            </FormFieldLabel>
            <TouchableOpacity
              style={[
                authFormStyles.inputWrap,
                styles.inputNoMargin,
                errorFields.category && authFormStyles.inputWrapError,
              ]}
              onPress={() => setCategoryOpen(true)}
              activeOpacity={PressOpacity.default}
              accessibilityRole="button"
              accessibilityLabel={`Coach Category: ${selectedCategory?.label || 'Select a category'}`}
            >
              <Ionicons
                name="grid-outline"
                size={IconSize.md}
                color={Colors.authCtaGradientStart}
                style={authFormStyles.inputIcon}
              />
              <Text
                style={[
                  authFormStyles.input,
                  selectedCategory ? styles.valueText : styles.placeholderText,
                ]}
                numberOfLines={1}
              >
                {selectedCategory?.label ||
                  (categoriesLoading ? 'Loading categories...' : 'Select a category')}
              </Text>
              <Ionicons name="chevron-down" size={16} color={Colors.textLight} />
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <FormFieldLabel required style={styles.fieldLabel}>
              Email Address
            </FormFieldLabel>
            <View
              style={[
                authFormStyles.inputWrap,
                styles.inputNoMargin,
                errorFields.email && authFormStyles.inputWrapError,
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={IconSize.md}
                color={Colors.authCtaGradientStart}
                style={authFormStyles.inputIcon}
              />
              <TextInput
                style={authFormStyles.input}
                placeholder="your@example.com"
                placeholderTextColor={Colors.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={v => {
                  setEmail(sanitizeEmailInput(v));
                  clearFieldError('email');
                }}
              />
            </View>
            <Text style={styles.hint}>Password will be sent to this email</Text>
          </View>

          <View style={styles.fieldLast}>
            <FormFieldLabel required style={styles.fieldLabel}>
              Mobile Number
            </FormFieldLabel>
            <View
              style={[
                authFormStyles.inputWrap,
                styles.inputNoMargin,
                errorFields.mobile && authFormStyles.inputWrapError,
              ]}
            >
              <Ionicons
                name="call-outline"
                size={IconSize.md}
                color={Colors.authCtaGradientStart}
                style={authFormStyles.inputIcon}
              />
              <PhoneTextInput
                style={authFormStyles.input}
                placeholder="10-digit-mobile number"
                placeholderTextColor={Colors.textLight}
                value={mobile}
                onChangeText={v => {
                  setMobile(v);
                  clearFieldError('mobile');
                }}
              />
            </View>
          </View>

          <AuthCtaButton
            variant="authPrimary"
            label="Create Account"
            onPress={() => void handleRegister()}
            loading={submitting}
            style={authFormStyles.ctaBtn}
          />

          <View style={styles.loginRow}>
            <Text style={styles.loginPrompt}>Already have an account? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              activeOpacity={PressOpacity.soft}
              accessibilityRole="button"
              accessibilityLabel="Login"
              hitSlop={HitSlop.sm}
              style={styles.loginHit}
            >
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </AuthAtmosphereLayout>

      <Modal
        visible={categoryOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryOpen(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setCategoryOpen(false)}
        >
          <View
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Coach Category</Text>
            <ScrollView
              style={styles.optionList}
              contentContainerStyle={styles.optionListContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {categories.length === 0 ? (
                <Text style={styles.emptyText}>No options available</Text>
              ) : (
                categories.map(opt => {
                  const active = opt.code === category || opt.label === category;
                  return (
                    <TouchableOpacity
                      key={opt.code}
                      style={styles.option}
                      onPress={() => {
                        setCategory(opt.label);
                        clearFieldError('category');
                        setCategoryOpen(false);
                      }}
                    >
                      <Text style={[styles.optionText, active && styles.optionTextActive]}>
                        {opt.label}
                      </Text>
                      {active ? (
                        <Ionicons name="checkmark" size={18} color={Colors.secondary} />
                      ) : null}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: AuthLayout.fieldGap },
  fieldLast: { marginBottom: AuthLayout.buttonGap },
  fieldLabel: {
    fontFamily: headingFont.semibold,
    fontSize: 13,
    color: Colors.textDark,
    marginBottom: AuthLayout.labelGap,
  },
  inputNoMargin: { marginBottom: 0 },
  valueText: { color: Colors.textDark },
  placeholderText: { color: Colors.textLight },
  hint: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    marginTop: 2,
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TouchTarget.min,
    marginTop: Spacing.xxs,
  },
  loginHit: {
    justifyContent: 'center',
    minHeight: TouchTarget.min,
  },
  loginPrompt: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
  },
  loginLink: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    color: Colors.authCtaGradientStart,
  },
  backdrop: { flex: 1, backgroundColor: Colors.scrim, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    maxHeight: '70%',
    ...Shadow.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  sheetTitle: {
    fontSize: 16,
    fontFamily: headingFont.bold,
    color: Colors.textDark,
    marginBottom: Spacing.sm,
  },
  optionList: { maxHeight: 360 },
  optionListContent: { paddingBottom: Spacing.xs },
  emptyText: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  optionText: {
    flex: 1,
    marginRight: Spacing.sm,
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.textDark,
    textAlign: 'left',
  },
  optionTextActive: { color: Colors.secondary, fontFamily: FontFamily.bold },
});
