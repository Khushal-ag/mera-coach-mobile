import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ImageBackground,
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
  Shadow,
  Spacing,
  formFieldStyles,
} from '../../constants/theme';
import { BrandImages } from '../../constants/images';
import AppButton from '../../components/AppButton';
import BrandLockup from '../../components/BrandLockup';
import FormErrorBanner from '../../components/FormErrorBanner';
import FormFieldLabel from '../../components/FormFieldLabel';
import KeyboardSafeScroll, {
  useScrollLowerFieldsIntoView,
} from '../../components/KeyboardSafeScroll';
import { HeaderBackButton } from '../../components/ScreenHeader';
import { login } from '../../api/authApi';
import { getLastLoginId, markMpinUnlocked, rememberLoginId } from '../../auth/mpin';
import { didSessionExpireOnRestore, saveSession } from '../../auth/session';
import { toUserMessage } from '../../api/client';
import { sanitizeEmailInput, validateLogin } from '../../utils/validation';
import { useFormFieldErrors } from '../../hooks/useFormFieldErrors';
import type { RootScreenProps } from '../../types/navigation';

export default function LoginScreen({ navigation }: RootScreenProps<'Login'>) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const scrollLowerFieldsIntoView = useScrollLowerFieldsIntoView(scrollRef);
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
      await saveSession(session);
      // Password already proved identity for this process — skip unlock gate until next cold start.
      markMpinUnlocked();
    } catch (err) {
      setBanner(toUserMessage(err, 'Something went wrong. Please try again.'));
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
      >
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <HeaderBackButton onPress={() => navigation.goBack()} style={styles.headerBack} />
          <BrandLockup size="lg" style={styles.logo} />
        </View>

        <View style={styles.card}>
          <FormErrorBanner message={formErrorBanner} />
          {sessionHint && !formErrorBanner ? (
            <Text style={styles.sessionHint}>{sessionHint}</Text>
          ) : null}

          <Text style={styles.cardTitle}>Coach Login</Text>
          <Text style={styles.cardSub}>Sign in to manage clients, leads, and your listing</Text>

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
                placeholder="coach@meracoach.com"
                placeholderTextColor={Colors.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={v => {
                  setEmail(sanitizeEmailInput(v));
                  clearFieldError('email');
                }}
                accessibilityLabel="Email address"
              />
            </View>
          </View>

          <View style={styles.field}>
            <FormFieldLabel required>Password</FormFieldLabel>
            <View style={[styles.inputWrap, errorFields.password && styles.inputWrapError]}>
              <Ionicons
                name="lock-closed-outline"
                size={IconSize.md}
                color={Colors.textLight}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Enter your password"
                placeholderTextColor={Colors.textLight}
                secureTextEntry={!showPass}
                value={password}
                onChangeText={v => {
                  setPassword(v);
                  clearFieldError('password');
                }}
                onFocus={scrollLowerFieldsIntoView}
                accessibilityLabel="Password"
              />
              <TouchableOpacity
                onPress={() => setShowPass(!showPass)}
                style={styles.eyeBtn}
                hitSlop={HitSlop.sm}
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
          </View>

          <AppButton
            label="Sign In"
            onPress={() => void handleLogin()}
            loading={submitting}
            icon="arrow-forward"
          />
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate('Register')}
          activeOpacity={PressOpacity.soft}
          accessibilityRole="button"
          accessibilityLabel="Create an account"
        >
          <Text style={styles.registerLink}>
            New coach? <Text style={styles.registerLinkBold}>Create an account</Text>
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
  inner: { flexGrow: 1, alignItems: 'center' },
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
    marginBottom: Spacing.lg,
    lineHeight: 18,
  },
  sessionHint: {
    fontSize: 13,
    fontFamily: FontFamily.medium,
    color: Colors.secondary,
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  field: { marginBottom: Spacing.md },
  inputWrap: formFieldStyles.wrap,
  inputWrapError: formFieldStyles.wrapError,
  inputIcon: formFieldStyles.inputIcon,
  input: formFieldStyles.input,
  eyeBtn: formFieldStyles.eyeBtn,
  registerLink: {
    color: Colors.onDarkMuted,
    fontSize: 13,
    fontFamily: FontFamily.regular,
    marginTop: Spacing.lg,
  },
  registerLinkBold: { color: Colors.white, fontFamily: FontFamily.bold },
  footer: {
    color: Colors.onDarkSoft,
    fontSize: 12,
    fontFamily: FontFamily.medium,
    marginTop: Spacing.md,
  },
});
