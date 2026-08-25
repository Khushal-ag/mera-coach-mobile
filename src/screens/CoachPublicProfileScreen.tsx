import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Shadow } from '../constants/theme';
import PhoneTextInput from '../components/PhoneTextInput';
import DropdownField from '../components/DropdownField';
import EmptyState from '../components/EmptyState';
import FormFieldLabel from '../components/FormFieldLabel';
import { HeaderBackButton } from '../components/ScreenHeader';
import { SERVICE_INQUIRY_FALLBACK } from '../data/coachProfileContent';
import { getCoachProfileByCode, submitCoachEnquiry, whatsAppUrlFromMobile } from '../api/coachApi';
import { queryKeys } from '../api/queryKeys';
import { getErrorMessage } from '../api/client';
import { resolveMediaUrl } from '../utils/mediaUrl';
import {
  validateMobile,
  validateOptionalEmail,
  validateRequired,
  sanitizeEmailInput,
} from '../utils/validation';
import type { RootScreenProps } from '../types/navigation';
import type { Coach } from '../types/models';

interface EnquiryForm {
  name: string;
  mobile: string;
  email: string;
  service: string;
}

const BLANK_FORM: EnquiryForm = { name: '', mobile: '', email: '', service: '' };

export default function CoachPublicProfileScreen({
  navigation,
  route,
}: RootScreenProps<'CoachPublicProfile'>) {
  const insets = useSafeAreaInsets();
  const listCoach = route.params?.coach;
  const coachCode = route.params?.coachCode || listCoach?.id || '';

  const profileQuery = useQuery({
    queryKey: queryKeys.coachProfileByCode(coachCode),
    queryFn: () => getCoachProfileByCode(coachCode),
    enabled: !!coachCode,
  });

  const coach: Coach | undefined = profileQuery.data ?? listCoach;
  const [form, setForm] = useState<EnquiryForm>(BLANK_FORM);
  const [submitting, setSubmitting] = useState(false);
  const update = <K extends keyof EnquiryForm>(key: K, val: EnquiryForm[K]) =>
    setForm(f => (f[key] === val ? f : { ...f, [key]: val }));

  if (!coachCode) {
    return (
      <View style={styles.centered}>
        <HeaderBackButton
          onDark={false}
          onPress={() => navigation.goBack()}
          style={[styles.backOnLight, { top: insets.top + 12 }]}
        />
        <EmptyState
          title="Coach not found"
          message="Open a coach from the directory to view their profile."
        />
      </View>
    );
  }

  if (!coach && profileQuery.isPending) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!coach) {
    return (
      <View style={styles.centered}>
        <HeaderBackButton
          onDark={false}
          onPress={() => navigation.goBack()}
          style={[styles.backOnLight, { top: insets.top + 12 }]}
        />
        <EmptyState
          title="Could not load profile"
          message={getErrorMessage(profileQuery.error, 'Please try again.')}
        />
      </View>
    );
  }

  const initials = coach.name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('');
  const photoUri = resolveMediaUrl(coach.profilePicUrl);
  const serviceOptions = [...(coach.tags.length ? coach.tags : []), SERVICE_INQUIRY_FALLBACK];

  const openWhatsApp = () => {
    const url = whatsAppUrlFromMobile(coach.mobile);
    if (!url) {
      Alert.alert('WhatsApp unavailable', 'This coach has not shared a mobile number yet.');
      return;
    }
    Linking.openURL(url).catch(() => Alert.alert('Unable to open WhatsApp'));
  };

  const submitEnquiry = async () => {
    const validationError =
      validateRequired(form.name, 'Name') ||
      validateMobile(form.mobile) ||
      validateOptionalEmail(form.email) ||
      (!form.service ? 'Please select what you are looking for.' : null);
    if (validationError) return Alert.alert('Validation Error', validationError);

    setSubmitting(true);
    try {
      await submitCoachEnquiry({
        coachCode: coach.id,
        clientName: form.name.trim(),
        clientMobile: form.mobile.trim(),
        clientEmail: form.email.trim() || undefined,
        lookingFor: form.service,
      });
      Alert.alert(
        'Enquiry Sent!',
        `Your enquiry has been sent to ${coach.name}. They usually reply within 24 hours.`,
      );
      setForm(BLANK_FORM);
    } catch (err) {
      Alert.alert('Something went wrong', getErrorMessage(err, 'Please try again.'));
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
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
          <HeaderBackButton onPress={() => navigation.goBack()} style={styles.heroBack} />

          <View style={styles.avatar}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{initials || '?'}</Text>
            )}
          </View>

          <View style={styles.tagsRow}>
            {coach.category ? (
              <View style={styles.categoryBadge}>
                <Ionicons name="ribbon-outline" size={12} color={Colors.white} />
                <Text style={styles.categoryBadgeText}>{coach.category}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.name}>{coach.name}</Text>

          {(coach.rating > 0 || coach.clients > 0) && (
            <View style={styles.ratingRow}>
              {coach.rating > 0 ? (
                <>
                  <Ionicons name="star" size={14} color={Colors.accent} />
                  <Text style={styles.ratingVal}>{coach.rating}</Text>
                </>
              ) : null}
              {coach.clients > 0 ? (
                <Text style={styles.ratingCount}>
                  {coach.rating > 0 ? ' · ' : ''}
                  {coach.clients} clients
                </Text>
              ) : null}
            </View>
          )}

          {coach.bio ? <Text style={styles.bio}>{coach.bio}</Text> : null}

          {coach.tags.length > 0 ? (
            <View style={styles.specialtyWrap}>
              {coach.tags.map(tag => (
                <View key={tag} style={styles.specialtyTag}>
                  <Ionicons name="checkmark" size={11} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.specialtyText}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.heroCtas}>
            <TouchableOpacity style={styles.bookBtn} onPress={submitEnquiry} disabled={submitting}>
              <Ionicons name="calendar-outline" size={16} color={Colors.white} />
              <Text style={styles.bookBtnText}>Book Free Consultation</Text>
            </TouchableOpacity>
            {coach.mobile ? (
              <TouchableOpacity style={styles.waBtn} onPress={openWhatsApp}>
                <Ionicons name="logo-whatsapp" size={18} color={Colors.white} />
                <Text style={styles.waBtnText}>WhatsApp Me</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={styles.statsStrip}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{coach.clients || '—'}</Text>
            <Text style={styles.statLabel}>Happy Clients</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{coach.experience || '—'}</Text>
            <Text style={styles.statLabel}>Years Exp.</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{coach.tags.length || '—'}</Text>
            <Text style={styles.statLabel}>Services</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{coach.rating || '—'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        {coach.tags.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionTag}>
              <Ionicons name="star-outline" size={12} color={Colors.secondary} />
              <Text style={styles.sectionTagText}>Areas of Expertise</Text>
            </View>
            <Text style={styles.sectionTitle}>What I Specialise In</Text>
            <View style={styles.expertiseGrid}>
              {coach.tags.map(tag => (
                <View key={tag} style={styles.expertiseCard}>
                  <View style={styles.expertiseIcon}>
                    <Ionicons name="medal-outline" size={18} color={Colors.primary} />
                  </View>
                  <Text style={styles.expertiseTitle}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={[styles.section, styles.formSection]}>
          <View style={styles.sectionTag}>
            <Ionicons name="calendar-outline" size={12} color={Colors.secondary} />
            <Text style={styles.sectionTagText}>Get In Touch</Text>
          </View>
          <Text style={styles.sectionTitle}>Book Your Free Consultation</Text>
          <Text style={styles.sectionSubtitle}>
            Send a free enquiry to {coach.name}. They usually reply within 24 hours.
          </Text>

          <View style={styles.field}>
            <FormFieldLabel required>Your Name</FormFieldLabel>
            <TextInput
              style={styles.input}
              placeholder="Full name"
              placeholderTextColor={Colors.textLight}
              value={form.name}
              onChangeText={v => update('name', v)}
            />
          </View>
          <View style={styles.field}>
            <FormFieldLabel required>Mobile Number</FormFieldLabel>
            <PhoneTextInput
              style={styles.input}
              placeholder="10-digit mobile number"
              placeholderTextColor={Colors.textLight}
              value={form.mobile}
              onChangeText={v => update('mobile', v)}
            />
          </View>
          <View style={styles.field}>
            <FormFieldLabel>Email Address</FormFieldLabel>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={Colors.textLight}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={form.email}
              onChangeText={v => update('email', sanitizeEmailInput(v))}
            />
          </View>
          <DropdownField
            label="I'm Looking For"
            value={form.service}
            options={serviceOptions}
            onChange={v => update('service', v)}
            placeholder="Select a service..."
            required
          />

          <TouchableOpacity style={styles.submitBtn} onPress={submitEnquiry} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Ionicons name="paper-plane-outline" size={16} color={Colors.white} />
                <Text style={styles.submitText}>Send My Request, It&apos;s Free!</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backOnLight: {
    position: 'absolute',
    left: 20,
    ...Shadow.sm,
  },
  hero: {
    backgroundColor: Colors.secondary,
    paddingBottom: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  heroBack: { alignSelf: 'flex-start', marginBottom: 12 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.onDarkOverlay,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: Colors.white, fontSize: 26, fontWeight: '800' },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  categoryBadgeText: { color: Colors.white, fontSize: 11, fontWeight: '700' },
  name: { color: Colors.white, fontSize: 24, fontWeight: '800', marginBottom: 6 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  ratingVal: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  ratingCount: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  bio: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 14,
    paddingHorizontal: 6,
  },
  specialtyWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 22,
  },
  specialtyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  specialtyText: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600' },
  heroCtas: { width: '100%', gap: 10 },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: Radius.pill,
    paddingVertical: 13,
    ...Shadow.md,
  },
  bookBtnText: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  waBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.whatsapp,
    borderRadius: Radius.pill,
    paddingVertical: 13,
  },
  waBtnText: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    marginTop: -18,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    ...Shadow.lg,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: Colors.border },
  statValue: { fontSize: 16, fontWeight: '800', color: Colors.secondary },
  statLabel: { fontSize: 10, color: Colors.textLight, marginTop: 2, textAlign: 'center' },
  section: { padding: 20, paddingTop: 32 },
  formSection: { backgroundColor: Colors.white, marginHorizontal: 0 },
  sectionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 10,
  },
  sectionTagText: { color: Colors.secondary, fontSize: 11, fontWeight: '700' },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: Colors.textDark, marginBottom: 6 },
  sectionSubtitle: { fontSize: 12, color: Colors.textLight, lineHeight: 18, marginBottom: 18 },
  expertiseGrid: { gap: 10, marginTop: 14 },
  expertiseCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 14,
    ...Shadow.sm,
  },
  expertiseIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  expertiseTitle: { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  field: { marginBottom: 14 },
  input: {
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 48,
    fontSize: 14,
    color: Colors.textDark,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    height: 52,
    marginTop: 8,
    ...Shadow.md,
  },
  submitText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
});
