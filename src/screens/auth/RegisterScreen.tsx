import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
  useWindowDimensions,
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
  formFieldStyles,
  headingFont,
} from '../../constants/theme';
import AuthAtmosphereLayout from '../../components/auth/AuthAtmosphereLayout';
import AuthCtaButton from '../../components/auth/AuthCtaButton';
import BrandLogo from '../../components/BrandLogo';
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
import { authLogoHeight } from '../../constants/images';
import type { RootScreenProps } from '../../types/navigation';

export default function RegisterScreen({ navigation }: RootScreenProps<'Register'>) {
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const logoSize = Math.round(authLogoHeight(screenW) * 0.88);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  /** Optional API field; hidden from the Create Account UI. */
  const [referralMobile] = useState('');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
    if (applyValidation(validateCoachRegister({ name, category, mobile, email, referralMobile }))) {
      return;
    }

    const coachTypeCode = categories.find(
      c => c.label === category || c.code === category,
    )?.code;
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

      await clearSession();

      Alert.alert(
        'Registration Successful',
        `Your account has been created. Your login password has been shared on ${email.trim()}. Please check your email and sign in to continue.`,
        [{ text: 'OK', onPress: () => navigation.replace('Login') }],
      );
    } catch (err) {
      setBanner(toUserMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <AuthAtmosphereLayout>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.xxs }]}>
          <BrandLogo variant="full" size={logoSize} style={styles.logo} />
        </View>

        <View style={styles.form}>
          <FormErrorBanner message={formErrorBanner} />

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.sub}>Register as a coach in a few steps.</Text>

          <View style={styles.field}>
            <FormFieldLabel required style={styles.fieldLabel}>
              Coach Name
            </FormFieldLabel>
            <View style={[styles.inputWrap, errorFields.name && styles.inputWrapError]}>
              <Ionicons
                name="person-outline"
                size={IconSize.md}
                color={Colors.authCtaGradientStart}
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

          <View style={styles.field}>
            <FormFieldLabel required style={styles.fieldLabel}>
              Coach Category
            </FormFieldLabel>
            <TouchableOpacity
              style={[styles.inputWrap, errorFields.category && styles.inputWrapError]}
              onPress={() => setCategoryOpen(true)}
              activeOpacity={PressOpacity.default}
              accessibilityRole="button"
              accessibilityLabel={`Coach Category: ${selectedCategory?.label || 'Select a category'}`}
            >
              <Ionicons
                name="grid-outline"
                size={IconSize.md}
                color={Colors.authCtaGradientStart}
                style={styles.inputIcon}
              />
              <Text
                style={[
                  styles.input,
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
            <View style={[styles.inputWrap, errorFields.email && styles.inputWrapError]}>
              <Ionicons
                name="mail-outline"
                size={IconSize.md}
                color={Colors.authCtaGradientStart}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
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
            <View style={[styles.inputWrap, errorFields.mobile && styles.inputWrapError]}>
              <Ionicons
                name="call-outline"
                size={IconSize.md}
                color={Colors.authCtaGradientStart}
                style={styles.inputIcon}
              />
              <PhoneTextInput
                style={styles.input}
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
            style={styles.createBtn}
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
  header: {
    alignItems: 'center',
    paddingBottom: 0,
    width: '100%',
    paddingHorizontal: Spacing.lg,
  },
  logo: { marginBottom: 0 },
  form: {
    width: '88%',
    maxWidth: 400,
    paddingTop: Spacing.xxs,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 28,
    fontFamily: headingFont.extraBold,
    color: Colors.textDark,
    marginBottom: 2,
  },
  sub: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
    lineHeight: 17,
  },
  field: { marginBottom: Spacing.xs },
  fieldLast: { marginBottom: Spacing.xs },
  fieldLabel: {
    fontFamily: headingFont.semibold,
    fontSize: 13,
    color: Colors.textDark,
    marginBottom: Spacing.xxs,
  },
  inputWrap: {
    ...formFieldStyles.wrap,
    backgroundColor: Colors.white,
    height: 50,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputWrapError: formFieldStyles.wrapError,
  inputIcon: formFieldStyles.inputIcon,
  input: formFieldStyles.input,
  valueText: { color: Colors.textDark },
  placeholderText: { color: Colors.textLight },
  hint: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    marginTop: 2,
  },
  createBtn: {
    height: 48,
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
