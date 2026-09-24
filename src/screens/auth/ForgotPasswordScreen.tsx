import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Colors,
  FontFamily,
  IconSize,
  Radius,
  Spacing,
  formFieldStyles,
  headingFont,
} from '../../constants/theme';
import AuthAtmosphereLayout from '../../components/auth/AuthAtmosphereLayout';
import AuthCtaButton from '../../components/auth/AuthCtaButton';
import BrandLogo from '../../components/BrandLogo';
import FormErrorBanner from '../../components/FormErrorBanner';
import { sanitizeEmailInput } from '../../utils/validation';
import { useFormFieldErrors } from '../../hooks/useFormFieldErrors';
import { authLogoHeight } from '../../constants/images';
import type { RootScreenProps } from '../../types/navigation';

/** No password-reset endpoint yet — Send Reset Link stays UI-only. */
export default function ForgotPasswordScreen({ navigation }: RootScreenProps<'ForgotPassword'>) {
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const logoSize = authLogoHeight(screenW);
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
      <View style={[styles.header, { paddingTop: insets.top + Spacing.xxs }]}>
        <BrandLogo variant="full" size={logoSize} style={styles.logo} />
      </View>

      <View style={styles.form}>
        <FormErrorBanner message={formErrorBanner} />

        <Text style={styles.title}>Forgot Password?</Text>
        <Text style={styles.sub}>
          No worries! Enter Your email or mobile number we&apos;ll send you a reset link.
        </Text>

        <View style={[styles.inputWrap, errorFields.email && styles.inputWrapError]}>
          <Ionicons
            name="mail-outline"
            size={IconSize.md}
            color={Colors.authCtaGradientStart}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
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
          style={styles.ctaBtn}
        />

        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>OR</Text>
          <View style={styles.orLine} />
        </View>

        <AuthCtaButton
          variant="authBack"
          label="Back to login"
          backArrow
          onPress={() => navigation.navigate('Login')}
          style={styles.ctaBtn}
        />
      </View>
    </AuthAtmosphereLayout>
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
  inputWrap: {
    ...formFieldStyles.wrap,
    backgroundColor: Colors.white,
    marginBottom: Spacing.xs,
    height: 50,
    borderRadius: Radius.md,
    borderColor: Colors.border,
    borderWidth: 1,
  },
  inputWrapError: formFieldStyles.wrapError,
  inputIcon: formFieldStyles.inputIcon,
  input: formFieldStyles.input,
  ctaBtn: {
    height: 48,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  orText: {
    fontSize: 12,
    fontFamily: FontFamily.semibold,
    color: Colors.textLight,
  },
});
