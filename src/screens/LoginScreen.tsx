import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Shadow } from '../constants/theme';
import FormErrorBanner from '../components/FormErrorBanner';
import FormFieldLabel from '../components/FormFieldLabel';
import KeyboardSafeScroll, { useScrollLowerFieldsIntoView } from '../components/KeyboardSafeScroll';
import { HeaderBackButton } from '../components/ScreenHeader';
import { login } from '../api/authApi';
import { saveSession } from '../auth/session';
import { getErrorMessage } from '../api/client';
import { sanitizeEmailInput, validateLogin } from '../utils/validation';
import { useFormFieldErrors } from '../hooks/useFormFieldErrors';
import type { RootScreenProps } from '../types/navigation';

export default function LoginScreen({ navigation }: RootScreenProps<'Login'>) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const scrollLowerFieldsIntoView = useScrollLowerFieldsIntoView(scrollRef);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
      const session = await login({ userName: email.trim(), password });
      await saveSession(session);
    } catch (err) {
      setBanner(getErrorMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardSafeScroll
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.inner}
    >
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <HeaderBackButton onPress={() => navigation.goBack()} style={styles.headerBack} />
        <View style={styles.logoBox}>
          <Ionicons name="fitness" size={32} color={Colors.white} />
        </View>
        <Text style={styles.brand}>Mera Coach</Text>
        <Text style={styles.tagline}>Wellness Platform</Text>
      </View>

      <View style={styles.card}>
        <FormErrorBanner message={formErrorBanner} />

        <Text style={styles.cardTitle}>Coach Login</Text>
        <Text style={styles.cardSub}>Sign in to manage your clients</Text>

        <View style={styles.field}>
          <FormFieldLabel required>Email Address</FormFieldLabel>
          <View style={[styles.inputWrap, errorFields.email && styles.inputWrapError]}>
            <Ionicons
              name="mail-outline"
              size={18}
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
            />
          </View>
        </View>

        <View style={styles.field}>
          <FormFieldLabel required>Password</FormFieldLabel>
          <View style={[styles.inputWrap, errorFields.password && styles.inputWrapError]}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
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
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
              <Ionicons
                name={showPass ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={Colors.textLight}
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.loginBtn, submitting && styles.loginBtnDisabled]}
          onPress={handleLogin}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Text style={styles.loginBtnText}>Sign In</Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.white} />
            </>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.registerLink}>
          New coach? <Text style={styles.registerLinkBold}>Create an account →</Text>
        </Text>
      </TouchableOpacity>

      <Text style={styles.footer}>MeraCoach © 2024 · Wellness Platform</Text>
    </KeyboardSafeScroll>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.secondary },
  inner: { flexGrow: 1, alignItems: 'center' },
  header: { alignItems: 'center', paddingBottom: 40, width: '100%', paddingHorizontal: 20 },
  headerBack: { alignSelf: 'flex-start', marginBottom: 16 },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.onDarkOverlay,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  brand: { fontSize: 28, fontWeight: '800', color: Colors.white },
  tagline: {
    fontSize: 12,
    color: Colors.onDarkMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  card: {
    width: '90%',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 28,
    ...Shadow.lg,
  },
  cardTitle: { fontSize: 22, fontWeight: '700', color: Colors.textDark, marginBottom: 4 },
  cardSub: { fontSize: 13, color: Colors.textLight, marginBottom: 24 },
  field: { marginBottom: 16 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    height: 50,
  },
  inputWrapError: { borderColor: Colors.destructive },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14, color: Colors.textDark },
  eyeBtn: { padding: 4 },
  loginBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Shadow.md,
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  registerLink: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 24 },
  registerLinkBold: { color: Colors.white, fontWeight: '700' },
  footer: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 16 },
});
