import React, { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontFamily,
  HitSlop,
  IconSize,
  PressOpacity,
  Radius,
  Spacing,
  TouchTarget,
} from '../../constants/theme';
import { AuthLayout } from '../../constants/authLayout';
import AuthAtmosphereLayout from '../../components/auth/AuthAtmosphereLayout';
import AuthCtaButton from '../../components/auth/AuthCtaButton';
import AuthFormHeader from '../../components/auth/AuthFormHeader';
import { authFormStyles } from '../../components/auth/authFormStyles';
import FormErrorBanner from '../../components/FormErrorBanner';
import { login } from '../../api/authApi';
import { getLastLoginId, markMpinUnlocked, rememberLoginId } from '../../auth/mpin';
import { didSessionExpireOnRestore, saveSession } from '../../auth/session';
import { clearAppQueryCache } from '../../api/queryClient';
import { toUserMessage } from '../../api/client';
import { sanitizeEmailInput, validateLogin } from '../../utils/validation';
import { useFormFieldErrors } from '../../hooks/useFormFieldErrors';
import type { RootScreenProps } from '../../types/navigation';

export default function LoginScreen({ navigation }: RootScreenProps<'Login'>) {
  const [email, setEmail] = useState(() => getLastLoginId() ?? '');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [sessionHint] = useState(() =>
    didSessionExpireOnRestore()
      ? 'Your session expired. Sign in once, then use your MPIN next time.'
      : null,
  );
  const {
    errorFields,
    formErrorBanner,
    clearFieldError,
    clearAllErrors,
    applyValidation,
    setBanner,
  } = useFormFieldErrors();

  const handleLogin = async () => {
    if (submittingRef.current) return;
    if (applyValidation(validateLogin({ email, password }))) return;

    clearAllErrors();
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const trimmed = email.trim();
      const session = await login({ userName: trimmed, password });
      await rememberLoginId(trimmed);
      clearAppQueryCache();
      await saveSession({
        ...session,
        email: session.email?.trim() || trimmed,
      });
      markMpinUnlocked();
    } catch (err) {
      setBanner(toUserMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <AuthAtmosphereLayout scrollable>
      <AuthFormHeader
        onBack={() => navigation.navigate('Home')}
        backAccessibilityLabel="Back to home"
      />

      <View style={authFormStyles.form}>
        <FormErrorBanner message={formErrorBanner} />
        {sessionHint && !formErrorBanner ? (
          <Text style={styles.sessionHint}>{sessionHint}</Text>
        ) : null}

        <Text style={authFormStyles.title}>Coach Login</Text>
        <Text style={authFormStyles.sub}>
          Sign in to manage your clients, track progress and make an impact.
        </Text>

        <View
          style={[authFormStyles.inputWrap, errorFields.email && authFormStyles.inputWrapError]}
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

        <View
          style={[authFormStyles.inputWrap, errorFields.password && authFormStyles.inputWrapError]}
        >
          <Ionicons
            name="lock-closed-outline"
            size={IconSize.md}
            color={Colors.authCtaGradientStart}
            style={authFormStyles.inputIcon}
          />
          <TextInput
            style={[authFormStyles.input, { flex: 1 }]}
            placeholder="Password"
            placeholderTextColor={Colors.textLight}
            secureTextEntry={!showPass}
            value={password}
            onChangeText={v => {
              setPassword(v);
              clearFieldError('password');
            }}
            accessibilityLabel="Password"
          />
          <TouchableOpacity
            onPress={() => setShowPass(!showPass)}
            style={authFormStyles.eyeBtn}
            hitSlop={HitSlop.sm}
            activeOpacity={PressOpacity.default}
            accessibilityRole="button"
            accessibilityLabel={showPass ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={showPass ? 'eye-off-outline' : 'eye-outline'}
              size={IconSize.md}
              color={Colors.textLight}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate('ForgotPassword')}
          activeOpacity={PressOpacity.soft}
          accessibilityRole="button"
          accessibilityLabel="Forgot Password"
          hitSlop={HitSlop.sm}
          style={styles.forgotWrap}
        >
          <Text style={styles.forgot}>Forgot Password?</Text>
        </TouchableOpacity>

        <View style={styles.registerRow}>
          <Text style={styles.registerPrompt}>New here? </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            activeOpacity={PressOpacity.soft}
            accessibilityRole="button"
            accessibilityLabel="Create Account"
            hitSlop={HitSlop.sm}
            style={styles.linkHit}
          >
            <Text style={styles.registerLink}>Create Account</Text>
          </TouchableOpacity>
        </View>

        <AuthCtaButton
          variant="authPrimary"
          label="Login"
          onPress={() => void handleLogin()}
          loading={submitting}
          style={authFormStyles.ctaBtn}
        />

        <View style={authFormStyles.orRow}>
          <View style={authFormStyles.orLine} />
          <Text style={authFormStyles.orText}>OR</Text>
          <View style={authFormStyles.orLine} />
        </View>

        <AuthCtaButton
          variant="authSecondary"
          label="Find A coach"
          leftIcon="person-outline"
          onPress={() => navigation.navigate('CoachList')}
          style={authFormStyles.ctaBtn}
        />
      </View>
    </AuthAtmosphereLayout>
  );
}

const styles = StyleSheet.create({
  sessionHint: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    color: Colors.secondary,
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.sm,
    padding: Spacing.xs,
    marginBottom: AuthLayout.fieldGap,
    lineHeight: 16,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    justifyContent: 'center',
    minHeight: TouchTarget.min,
    marginBottom: Spacing.xxs,
    marginTop: -Spacing.xxs,
  },
  forgot: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    color: Colors.authCtaGradientStart,
  },
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TouchTarget.min,
    marginBottom: AuthLayout.buttonGap,
  },
  linkHit: {
    justifyContent: 'center',
    minHeight: TouchTarget.min,
  },
  registerPrompt: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
  },
  registerLink: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    color: Colors.authCtaGradientStart,
  },
});
