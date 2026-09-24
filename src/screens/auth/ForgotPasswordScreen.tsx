import React, { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, IconSize } from '../../constants/theme';
import AuthAtmosphereLayout from '../../components/auth/AuthAtmosphereLayout';
import AuthCtaButton from '../../components/auth/AuthCtaButton';
import AuthFormHeader from '../../components/auth/AuthFormHeader';
import { authFormStyles } from '../../components/auth/authFormStyles';
import FormErrorBanner from '../../components/FormErrorBanner';
import { sanitizeEmailInput } from '../../utils/validation';
import { useFormFieldErrors } from '../../hooks/useFormFieldErrors';
import type { RootScreenProps } from '../../types/navigation';

/** No password-reset endpoint yet — Send Reset Link stays UI-only. */
export default function ForgotPasswordScreen({ navigation }: RootScreenProps<'ForgotPassword'>) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { errorFields, formErrorBanner, clearFieldError, clearAllErrors, setBanner } =
    useFormFieldErrors();

  const handleSendReset = () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setBanner('Enter your email or mobile number.');
      return;
    }

    clearAllErrors();
    setSubmitting(true);
    setBanner('Password reset is not available in the app yet. Please contact support.');
    setSubmitting(false);
  };

  return (
    <AuthAtmosphereLayout>
      <AuthFormHeader
        onBack={() => navigation.navigate('Login')}
        backAccessibilityLabel="Back to login"
      />

      <View style={authFormStyles.form}>
        <FormErrorBanner message={formErrorBanner} />

        <Text style={authFormStyles.title}>Forgot Password?</Text>
        <Text style={authFormStyles.sub}>
          No worries! Enter Your email or mobile number we&apos;ll send you a reset link.
        </Text>

        <View style={[authFormStyles.inputWrap, errorFields.email && authFormStyles.inputWrapError]}>
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
          label="Send Reset Link"
          onPress={handleSendReset}
          loading={submitting}
          style={authFormStyles.ctaBtn}
        />

        <View style={authFormStyles.orRow}>
          <View style={authFormStyles.orLine} />
          <Text style={authFormStyles.orText}>OR</Text>
          <View style={authFormStyles.orLine} />
        </View>

        <AuthCtaButton
          variant="authBack"
          label="Back to login"
          backArrow
          onPress={() => navigation.navigate('Login')}
          style={authFormStyles.ctaBtn}
        />
      </View>
    </AuthAtmosphereLayout>
  );
}
