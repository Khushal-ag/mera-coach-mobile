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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Shadow } from '../constants/theme';
import PhoneTextInput from '../components/PhoneTextInput';
import DropdownField from '../components/DropdownField';
import FormErrorBanner from '../components/FormErrorBanner';
import FormFieldLabel from '../components/FormFieldLabel';
import { HeaderBackButton } from '../components/ScreenHeader';
import { COACH_CATEGORIES as FALLBACK_CATEGORIES } from '../data/homeContent';
import { getCoachCategories, registerCoach } from '../api/coachApi';
import { login } from '../api/authApi';
import { saveSession } from '../auth/session';
import { getErrorMessage } from '../api/client';
import { sanitizeEmailInput, validateCoachRegister } from '../utils/validation';
import { useFormFieldErrors } from '../hooks/useFormFieldErrors';
import type { RootScreenProps } from '../types/navigation';
import type { CoachCategory } from '../types/models';

export default function RegisterScreen({ navigation }: RootScreenProps<'Register'>) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const {
    errorFields,
    formErrorBanner,
    clearFieldError,
    clearAllErrors,
    applyValidation,
    setBanner,
  } = useFormFieldErrors();

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
    if (applyValidation(validateCoachRegister({ name, category, mobile, email }))) {
      return;
    }

    const coachTypeCode = categories.find(c => c.label === category)?.code;
    clearAllErrors();
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
      } catch {
        // Registration still succeeded even if auto-login failed — send to Login instead.
        Alert.alert('Registration Successful', 'Your login password has been emailed to you.');
        navigation.replace('Login');
      }
    } catch (err) {
      setBanner(getErrorMessage(err, 'Something went wrong. Please try again.'));
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
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <HeaderBackButton onPress={() => navigation.goBack()} style={styles.headerBack} />
          <View style={styles.logoBox}>
            <Ionicons name="person-add" size={28} color={Colors.white} />
          </View>
          <Text style={styles.brand}>Register as a Coach</Text>
          <Text style={styles.tagline}>Join Mera Coach in minutes</Text>
        </View>

        <View style={styles.card}>
          <FormErrorBanner message={formErrorBanner} />

          <View style={styles.cardHead}>
            <View style={styles.cardHeadIcon}>
              <Ionicons name="person-circle-outline" size={22} color={Colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Create Your Account</Text>
              <Text style={styles.cardSub}>Just 4 fields, your account is ready instantly</Text>
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
            <FormFieldLabel required>Coach Name</FormFieldLabel>
            <TextInput
              style={[styles.input, errorFields.name && styles.inputError]}
              placeholder="Your full name"
              placeholderTextColor={Colors.textLight}
              value={name}
              onChangeText={v => {
                setName(v);
                clearFieldError('name');
              }}
            />
          </View>

          <DropdownField
            label="Coach Category"
            value={category}
            options={categoryLabels}
            onChange={v => {
              setCategory(v);
              clearFieldError('category');
            }}
            placeholder={categoriesLoading ? 'Loading categories...' : '-- Select a category --'}
            required
            hasError={!!errorFields.category}
          />

          <View style={styles.field}>
            <FormFieldLabel required>Mobile Number</FormFieldLabel>
            <PhoneTextInput
              style={[styles.input, errorFields.mobile && styles.inputError]}
              placeholder="10-digit mobile number"
              placeholderTextColor={Colors.textLight}
              value={mobile}
              onChangeText={v => {
                setMobile(v);
                clearFieldError('mobile');
              }}
            />
          </View>

          <View style={styles.field}>
            <FormFieldLabel required>Email Address</FormFieldLabel>
            <TextInput
              style={[styles.input, errorFields.email && styles.inputError]}
              placeholder="you@example.com"
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
    paddingBottom: 28,
    width: '100%',
    paddingHorizontal: 20,
    backgroundColor: Colors.secondary,
  },
  headerBack: { alignSelf: 'flex-start', marginBottom: 12 },
  logoBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: Colors.onDarkOverlay,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  brand: { fontSize: 20, fontWeight: '800', color: Colors.white },
  tagline: { fontSize: 12, color: Colors.onDarkMuted, marginTop: 4 },
  card: {
    width: '90%',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 22,
    marginTop: -18,
    ...Shadow.lg,
  },
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
  inputError: { borderColor: Colors.destructive },
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
