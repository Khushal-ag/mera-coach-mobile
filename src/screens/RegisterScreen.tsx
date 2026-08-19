import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../constants/theme';
import DropdownField from '../components/DropdownField';
import { COACH_CATEGORIES as FALLBACK_CATEGORIES } from '../data/homeContent';
import { getCoachCategories, registerCoach } from '../api/coachApi';
import { login } from '../api/authApi';
import { saveSession } from '../auth/session';
import { ApiError } from '../api/client';
import type { RootScreenProps } from '../types/navigation';
import type { CoachCategory } from '../types/models';

export default function RegisterScreen({ navigation }: RootScreenProps<'Register'>) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [categories, setCategories] = useState<CoachCategory[]>(FALLBACK_CATEGORIES);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => {
    getCoachCategories()
      .then(list => {
        if (list.length) setCategories(list);
      })
      .catch(() => {
        /* keep fallback list on network failure */
      })
      .finally(() => setCategoriesLoading(false));
  }, []);

  const categoryLabels = categories.map(c => c.label);

  const handleRegister = async () => {
    if (!name.trim()) return setError('Coach Name is required.');
    if (!category) return setError('Coach Category is required.');
    if (!mobile.trim() || mobile.trim().length < 10)
      return setError('A valid 10-digit mobile number is required.');
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return setError('A valid email address is required.');

    const coachTypeCode = categories.find(c => c.label === category)?.code;
    setError('');
    setSubmitting(true);
    try {
      const trimmedEmail = email.trim();
      const result = await registerCoach({
        coachName: name.trim(),
        coachTypeCode,
        mobile: mobile.trim(),
        email: trimmedEmail,
      });

      try {
        const session = await login({ userName: trimmedEmail, password: result.plainPassword });
        await saveSession(session);
        Alert.alert('Welcome to Mera Coach!', 'Your coach account is ready to go.');
        navigation.replace('Main');
      } catch {
        // Account was created successfully even if auto-login fails for some reason —
        // fall back to sending them to Login rather than losing the registration.
        Alert.alert('Registration Successful', 'Your login password has been emailed to you.');
        navigation.replace('Login');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.logoBox}>
            <Ionicons name="person-add" size={28} color={Colors.white} />
          </View>
          <Text style={styles.brand}>Register as a Coach</Text>
          <Text style={styles.tagline}>Join Mera Coach in minutes</Text>
        </View>

        <View style={styles.card}>
          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={Colors.primary} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.cardHead}>
            <View style={styles.cardHeadIcon}>
              <Ionicons name="person-circle-outline" size={22} color={Colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Create Your Account</Text>
              <Text style={styles.cardSub}>Just 4 fields — your account is ready instantly</Text>
            </View>
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredText}>* Required</Text>
            </View>
          </View>

          <View style={styles.infoBanner}>
            <Ionicons name="mail-open-outline" size={18} color={Colors.secondary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>We&apos;ll email your login password.</Text>
              <Text style={styles.infoText}>
                Once registered, you can complete the remaining profile details after logging in.
              </Text>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              <Ionicons name="person-outline" size={12} /> Coach Name{' '}
              <Text style={styles.req}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Your full name"
              placeholderTextColor={Colors.border}
              value={name}
              onChangeText={setName}
            />
          </View>

          <DropdownField
            label="Coach Category *"
            value={category}
            options={categoryLabels}
            onChange={setCategory}
            placeholder={categoriesLoading ? 'Loading categories...' : '-- Select a category --'}
          />

          <View style={styles.field}>
            <Text style={styles.label}>
              <Ionicons name="phone-portrait-outline" size={12} /> Mobile Number{' '}
              <Text style={styles.req}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="10-digit mobile number"
              placeholderTextColor={Colors.border}
              keyboardType="phone-pad"
              value={mobile}
              onChangeText={setMobile}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              <Ionicons name="mail-outline" size={12} /> Email Address{' '}
              <Text style={styles.req}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={Colors.border}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <Text style={styles.hint}>
              <Ionicons name="information-circle-outline" size={12} /> Password will be sent to this
              email
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.registerBtn, submitting && styles.registerBtnDisabled]}
            onPress={handleRegister}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Ionicons name="person-add-outline" size={18} color={Colors.white} />
                <Text style={styles.registerBtnText}>Register Now & Continue</Text>
                <Ionicons name="arrow-forward" size={18} color={Colors.white} />
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.footerLink}>
            Already registered? <Text style={styles.footerLinkBold}>Sign in to your account →</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flexGrow: 1, alignItems: 'center', paddingBottom: 40 },
  header: {
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 28,
    width: '100%',
    backgroundColor: Colors.secondary,
  },
  backBtn: {
    position: 'absolute',
    top: 56,
    left: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  brand: { fontSize: 20, fontWeight: '800', color: Colors.white },
  tagline: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 4 },
  card: {
    width: '90%',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 22,
    marginTop: -18,
    ...Shadow.lg,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.sm,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: Colors.primary, fontSize: 13, fontWeight: '600', flex: 1 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  cardHeadIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: Colors.textDark },
  cardSub: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  requiredBadge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  requiredText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.sm,
    padding: 12,
    marginBottom: 18,
  },
  infoTitle: { fontSize: 12.5, fontWeight: '700', color: Colors.secondary },
  infoText: { fontSize: 11, color: Colors.secondary, marginTop: 2, lineHeight: 16, opacity: 0.85 },
  field: { marginBottom: 16 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  req: { color: Colors.primary },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    backgroundColor: Colors.background,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    color: Colors.textDark,
  },
  hint: { fontSize: 10.5, color: Colors.textLight, marginTop: 6 },
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: Radius.pill,
    height: 52,
    marginTop: 8,
    ...Shadow.md,
  },
  registerBtnDisabled: { opacity: 0.7 },
  registerBtnText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  footerLink: { color: Colors.textLight, fontSize: 13, marginTop: 24, textAlign: 'center' },
  footerLinkBold: { color: Colors.primary, fontWeight: '700' },
});
