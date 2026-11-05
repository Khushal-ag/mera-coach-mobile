import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontFamily,
  HitSlop,
  IconSize,
  PressOpacity,
  Spacing,
} from '../../constants/theme';
import AuthAtmosphereLayout from '../../components/auth/AuthAtmosphereLayout';
import AuthCtaButton from '../../components/auth/AuthCtaButton';
import AuthFormHeader from '../../components/auth/AuthFormHeader';
import { authFormStyles } from '../../components/auth/authFormStyles';
import FormErrorBanner from '../../components/FormErrorBanner';
import { requestPasswordReset, resetPassword } from '../../api/authApi';
import { toUserMessage } from '../../api/client';
import { passwordPolicyError, sanitizeEmailInput } from '../../utils/validation';
import { useFormFieldErrors } from '../../hooks/useFormFieldErrors';
import type { RootScreenProps } from '../../types/navigation';
import { appAlert } from '../../utils/appDialog';

type Step = 'request' | 'confirm';

export default function ForgotPasswordScreen({ navigation }: RootScreenProps<'ForgotPassword'>) {
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [resendIn, setResendIn] = useState(0);
  const { errorFields, formErrorBanner, clearFieldError, clearAllErrors, setBanner } =
    useFormFieldErrors();

  const goToLogin = () => navigation.navigate('Login');

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn(n => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const handleSendReset = async () => {
    if (submittingRef.current) return;
    const trimmed = email.trim();
    if (!trimmed) {
      setBanner('Enter your email or mobile number.');
      return;
    }

    clearAllErrors();
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await requestPasswordReset(trimmed);
      setStep('confirm');
      setResendIn(30);
    } catch (err) {
      setBanner(toUserMessage(err, 'Password reset could not be started. Please try again.'));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (submittingRef.current || resendIn > 0) return;
    clearAllErrors();
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await requestPasswordReset(email.trim());
      setResendIn(30);
      appAlert(
        'Code sent',
        'If the account has an email, a new reset code is on its way. Check spam too.',
        undefined,
        { tone: 'success' },
      );
    } catch (err) {
      setBanner(toUserMessage(err, 'Could not send the code again. Please try again.'));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleReset = async () => {
    if (submittingRef.current) return;
    const token = code.replace(/\D/g, '');
    if (token.length !== 6) {
      setBanner('Enter the 6-digit reset code from your email.');
      return;
    }
    const passwordError = passwordPolicyError(newPassword);
    if (passwordError) {
      setBanner(passwordError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setBanner('New passwords do not match.');
      return;
    }

    clearAllErrors();
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await resetPassword({ token, newPassword });
      appAlert(
        'Password updated',
        'Sign in with your new password.',
        [{ text: 'OK', onPress: goToLogin }],
        {
          tone: 'success',
        },
      );
    } catch (err) {
      setBanner(toUserMessage(err, 'Password reset could not be completed. Please try again.'));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <AuthAtmosphereLayout>
      <AuthFormHeader
        onBack={() => {
          if (step === 'confirm') {
            clearAllErrors();
            setStep('request');
            return;
          }
          goToLogin();
        }}
        backAccessibilityLabel={step === 'confirm' ? 'Back to reset request' : 'Back to login'}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={authFormStyles.form}>
          <FormErrorBanner message={formErrorBanner} />

          {step === 'request' ? (
            <>
              <Text style={authFormStyles.title}>Forgot Password?</Text>
              <Text style={authFormStyles.sub}>
                Enter your email or mobile number. If that account has an email, we&apos;ll send a
                6-digit reset code.
              </Text>

              <View
                style={[
                  authFormStyles.inputWrap,
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
                  placeholder="Email or Mobile Number"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={v => {
                    setEmail(sanitizeEmailInput(v));
                    clearFieldError('email');
                  }}
                  accessibilityLabel="Email or mobile number"
                />
              </View>

              <AuthCtaButton
                variant="authPrimary"
                label="Send Reset Code"
                onPress={() => void handleSendReset()}
                loading={submitting}
                style={authFormStyles.ctaBtn}
              />
            </>
          ) : (
            <>
              <Text style={authFormStyles.title}>Set a new password</Text>
              <Text style={authFormStyles.sub}>
                Enter the 6-digit code we emailed you. It expires in 30 minutes and works once.
                Check your spam folder if it does not arrive.
              </Text>

              <View style={authFormStyles.inputWrap}>
                <Ionicons
                  name="keypad-outline"
                  size={IconSize.md}
                  color={Colors.authCtaGradientStart}
                  style={authFormStyles.inputIcon}
                />
                <TextInput
                  style={authFormStyles.input}
                  placeholder="6-digit reset code"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="number-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={6}
                  value={code}
                  onChangeText={v => setCode(v.replace(/\D/g, '').slice(0, 6))}
                  accessibilityLabel="6-digit reset code"
                />
              </View>

              <View style={authFormStyles.inputWrap}>
                <Ionicons
                  name="lock-closed-outline"
                  size={IconSize.md}
                  color={Colors.authCtaGradientStart}
                  style={authFormStyles.inputIcon}
                />
                <TextInput
                  style={[authFormStyles.input, styles.flexInput]}
                  placeholder="New password"
                  placeholderTextColor={Colors.textLight}
                  secureTextEntry={!showNew}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  accessibilityLabel="New password"
                />
                <TouchableOpacity
                  onPress={() => setShowNew(v => !v)}
                  style={authFormStyles.eyeBtn}
                  hitSlop={HitSlop.sm}
                  activeOpacity={PressOpacity.default}
                  accessibilityRole="button"
                  accessibilityLabel={showNew ? 'Hide new password' : 'Show new password'}
                >
                  <Ionicons
                    name={showNew ? 'eye-off-outline' : 'eye-outline'}
                    size={IconSize.md}
                    color={Colors.textLight}
                  />
                </TouchableOpacity>
              </View>

              <View style={authFormStyles.inputWrap}>
                <Ionicons
                  name="lock-closed-outline"
                  size={IconSize.md}
                  color={Colors.authCtaGradientStart}
                  style={authFormStyles.inputIcon}
                />
                <TextInput
                  style={[authFormStyles.input, styles.flexInput]}
                  placeholder="Confirm new password"
                  placeholderTextColor={Colors.textLight}
                  secureTextEntry={!showConfirm}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  accessibilityLabel="Confirm new password"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirm(v => !v)}
                  style={authFormStyles.eyeBtn}
                  hitSlop={HitSlop.sm}
                  activeOpacity={PressOpacity.default}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showConfirm ? 'Hide confirm password' : 'Show confirm password'
                  }
                >
                  <Ionicons
                    name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                    size={IconSize.md}
                    color={Colors.textLight}
                  />
                </TouchableOpacity>
              </View>

              <AuthCtaButton
                variant="authPrimary"
                label="Update Password"
                onPress={() => void handleReset()}
                loading={submitting}
                style={authFormStyles.ctaBtn}
              />

              <TouchableOpacity
                onPress={() => void handleResend()}
                disabled={resendIn > 0 || submitting}
                style={styles.resend}
                hitSlop={HitSlop.sm}
                activeOpacity={PressOpacity.default}
                accessibilityRole="button"
                accessibilityState={{ disabled: resendIn > 0 || submitting }}
                accessibilityLabel="Send the reset code again"
              >
                <Text style={[styles.resendText, resendIn > 0 && styles.resendTextOff]}>
                  {resendIn > 0
                    ? `Didn't get a code? Send again in ${resendIn}s`
                    : "Didn't get a code? Send again"}
                </Text>
              </TouchableOpacity>
            </>
          )}

          <View style={authFormStyles.orRow}>
            <View style={authFormStyles.orLine} />
            <Text style={authFormStyles.orText}>OR</Text>
            <View style={authFormStyles.orLine} />
          </View>

          <AuthCtaButton
            variant="authBack"
            label="Back to login"
            backArrow
            onPress={goToLogin}
            style={authFormStyles.ctaBtn}
          />
        </View>
      </ScrollView>
    </AuthAtmosphereLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, width: '100%' },
  scrollContent: { alignItems: 'center', paddingBottom: Spacing.lg },
  flexInput: { flex: 1 },
  resend: {
    alignSelf: 'center',
    paddingVertical: Spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  resendText: { fontSize: 13, fontFamily: FontFamily.bold, color: Colors.authCtaGradientStart },
  resendTextOff: { color: Colors.textLight },
});
