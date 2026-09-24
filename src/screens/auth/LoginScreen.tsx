import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Colors,
  FontFamily,
  HitSlop,
  IconSize,
  PressOpacity,
  Radius,
  Spacing,
  TouchTarget,
  formFieldStyles,
  headingFont,
} from '../../constants/theme';
import AuthAtmosphereLayout from '../../components/auth/AuthAtmosphereLayout';
import AuthCtaButton from '../../components/auth/AuthCtaButton';
import BrandLogo from '../../components/BrandLogo';
import FormErrorBanner from '../../components/FormErrorBanner';
import { authLogoHeight } from '../../constants/images';
import { login } from '../../api/authApi';
import { getLastLoginId, markMpinUnlocked, rememberLoginId } from '../../auth/mpin';
import { didSessionExpireOnRestore, saveSession } from '../../auth/session';
import { clearAppQueryCache } from '../../api/queryClient';
import { toUserMessage } from '../../api/client';
import { sanitizeEmailInput, validateLogin } from '../../utils/validation';
import { useFormFieldErrors } from '../../hooks/useFormFieldErrors';
import type { RootScreenProps } from '../../types/navigation';

export default function LoginScreen({ navigation }: RootScreenProps<'Login'>) {
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const logoSize = authLogoHeight(screenW);
  const [email, setEmail] = useState(() => getLastLoginId() ?? '');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
    if (applyValidation(validateLogin({ email, password }))) return;

    clearAllErrors();
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
      setSubmitting(false);
    }
  };

  return (
    <AuthAtmosphereLayout>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.xxs }]}>
        <BrandLogo variant="full" size={logoSize} style={styles.logo} />
      </View>

      <View style={styles.form}>
        <FormErrorBanner message={formErrorBanner} />
        {sessionHint && !formErrorBanner ? (
          <Text style={styles.sessionHint}>{sessionHint}</Text>
        ) : null}

        <Text style={styles.title}>Coach Login</Text>
        <Text style={styles.sub}>
          Sign in to manage your clients, track progress and make an impact.
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

        <View style={[styles.inputWrap, errorFields.password && styles.inputWrapError]}>
          <Ionicons
            name="lock-closed-outline"
            size={IconSize.md}
            color={Colors.authCtaGradientStart}
            style={styles.inputIcon}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
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
            style={styles.eyeBtn}
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
          style={styles.ctaBtn}
        />

        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>OR</Text>
          <View style={styles.orLine} />
        </View>

        <AuthCtaButton
          variant="authSecondary"
          label="Find A coach"
          leftIcon="person-outline"
          onPress={() => navigation.navigate('CoachList')}
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
  sessionHint: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    color: Colors.secondary,
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.sm,
    padding: Spacing.xs,
    marginBottom: Spacing.xs,
    lineHeight: 16,
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
  eyeBtn: formFieldStyles.eyeBtn,
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
    marginBottom: Spacing.xs,
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
