import React, { useRef, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { clearSession } from '../../auth/session';
import { registerCoach, getCoachCategories } from '../../api/coachApi';
import { queryKeys } from '../../api/queryKeys';
import {
  Colors,
  FontFamily,
  HitSlop,
  IconSize,
  PressOpacity,
  Radius,
  Spacing,
  TouchTarget,
  Typography,
} from '../../constants/theme';
import { authFormStyles } from '../../components/auth/authFormStyles';
import AuthAtmosphereLayout from '../../components/auth/AuthAtmosphereLayout';
import AuthCtaButton from '../../components/auth/AuthCtaButton';
import AuthFormHeader from '../../components/auth/AuthFormHeader';
import FormErrorBanner from '../../components/FormErrorBanner';
import FormFieldLabel from '../../components/FormFieldLabel';
import PhoneTextInput from '../../components/PhoneTextInput';
import { toUserMessage } from '../../api/client';
import { sanitizeEmailInput, validateCoachRegister } from '../../utils/validation';
import { useFormFieldErrors } from '../../hooks/useFormFieldErrors';
import type { RootScreenProps } from '../../types/navigation';
import { appAlert } from '../../utils/appDialog';

export default function RegisterScreen({ navigation }: RootScreenProps<'Register'>) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [referralMobile, setReferralMobile] = useState('');
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
  const categories = categoriesQuery.data ?? [];
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

      appAlert(
        'Registration Successful',
        `Your account has been created. Your login password has been shared on ${email.trim()}. Please check your email and sign in to continue.`,
        [{ text: 'OK', onPress: () => navigation.replace('Login') }],
        { tone: 'success' },
      );
    } catch (err) {
      setBanner(toUserMessage(err, 'Registration failed. Please try again.'));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <>
      <AuthAtmosphereLayout scrollable>
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
                styles.pickerTrigger,
                errorFields.category && authFormStyles.inputWrapError,
              ]}
              onPress={() => setCategoryOpen(true)}
              activeOpacity={PressOpacity.default}
              accessibilityRole="button"
              accessibilityLabel="Select coach category"
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
                  styles.pickerText,
                  !selectedCategory && styles.placeholderText,
                ]}
                numberOfLines={1}
              >
                {categoriesLoading
                  ? 'Loading categories...'
                  : selectedCategory?.label || 'Select coach category'}
              </Text>
              <Ionicons
                name="chevron-down-outline"
                size={IconSize.sm}
                color={Colors.textLight}
                style={styles.pickerChevron}
              />
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

          <View style={styles.field}>
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

          <View style={styles.fieldLast}>
            <FormFieldLabel style={styles.fieldLabel}>Referred by (mobile)</FormFieldLabel>
            <View
              style={[
                authFormStyles.inputWrap,
                styles.inputNoMargin,
                errorFields.referralMobile && authFormStyles.inputWrapError,
              ]}
            >
              <Ionicons
                name="people-outline"
                size={IconSize.md}
                color={Colors.authCtaGradientStart}
                style={authFormStyles.inputIcon}
              />
              <PhoneTextInput
                style={authFormStyles.input}
                placeholder="Optional 10-digit mobile"
                placeholderTextColor={Colors.textLight}
                value={referralMobile}
                onChangeText={v => {
                  setReferralMobile(v);
                  clearFieldError('referralMobile');
                }}
              />
            </View>
            <Text style={styles.hint}>If someone recommended Mera Coach, enter their mobile</Text>
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
                categories.map(c => {
                  const isSelected = selectedCategory?.code === c.code;
                  return (
                    <TouchableOpacity
                      key={c.code}
                      style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                      onPress={() => {
                        setCategory(c.label);
                        clearFieldError('category');
                        setCategoryOpen(false);
                      }}
                      activeOpacity={PressOpacity.default}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text
                        style={[styles.optionText, isSelected && styles.optionTextSelected]}
                        numberOfLines={1}
                      >
                        {c.label}
                      </Text>
                      {isSelected && (
                        <Ionicons
                          name="checkmark"
                          size={IconSize.md}
                          color={Colors.primary}
                          style={styles.optionCheck}
                        />
                      )}
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

const MASTER_STALE_MS = 60 * 60 * 1000;

const styles = StyleSheet.create({
  field: {
    marginBottom: Spacing.md,
  },
  fieldLast: {
    marginBottom: Spacing.lg,
  },
  fieldLabel: {
    marginBottom: Spacing.xs,
  },
  inputNoMargin: {
    marginBottom: 0,
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerText: {
    flex: 1,
    paddingVertical: 0,
  },
  placeholderText: {
    color: Colors.textLight,
  },
  pickerChevron: {
    marginLeft: Spacing.xs,
  },
  hint: {
    ...Typography.caption,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
    minHeight: TouchTarget.min,
  },
  loginPrompt: {
    ...Typography.body,
    color: Colors.textLight,
  },
  loginHit: {
    minHeight: TouchTarget.min,
    justifyContent: 'center',
  },
  loginLink: {
    ...Typography.body,
    fontFamily: FontFamily.semibold,
    color: Colors.primary,
  },
  backdrop: {
    flex: 1,
    backgroundColor: Colors.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    maxHeight: '70%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  sheetTitle: {
    ...Typography.headline,
    marginBottom: Spacing.md,
  },
  optionList: {
    flexGrow: 0,
  },
  optionListContent: {
    paddingBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textLight,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    minHeight: TouchTarget.min,
  },
  optionRowSelected: {
    borderBottomColor: Colors.primaryLight,
  },
  optionText: {
    ...Typography.body,
    flex: 1,
  },
  optionTextSelected: {
    color: Colors.primary,
    fontFamily: FontFamily.semibold,
  },
  optionCheck: {
    marginLeft: Spacing.sm,
  },
});
