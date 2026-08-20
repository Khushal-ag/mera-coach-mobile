import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../constants/theme';
import DropdownField from '../components/DropdownField';
import { COACHES } from '../data/coachDirectory';
import {
  EXPERTISE_DESC,
  PROCESS_STEPS,
  RECOGNITION_BADGES,
  TESTIMONIALS,
  SERVICE_INQUIRY_FALLBACK,
  DUMMY_WHATSAPP_NUMBER,
} from '../data/coachProfileContent';
import { submitCoachEnquiry } from '../api/coachApi';
import { getErrorMessage } from '../api/client';
import type { RootScreenProps } from '../types/navigation';

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
  const coach = route.params?.coach || COACHES[0]!;
  const [form, setForm] = useState<EnquiryForm>(BLANK_FORM);
  const [submitting, setSubmitting] = useState(false);
  const update = <K extends keyof EnquiryForm>(key: K, val: EnquiryForm[K]) =>
    setForm(f => ({ ...f, [key]: val }));

  const initials = coach.name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('');
  const serviceOptions = [...coach.tags, SERVICE_INQUIRY_FALLBACK];

  const openWhatsApp = () => {
    Linking.openURL(`https://wa.me/${DUMMY_WHATSAPP_NUMBER}`).catch(() => {
      Alert.alert('Unable to open WhatsApp');
    });
  };

  const submitEnquiry = async () => {
    if (!form.name.trim()) return Alert.alert('Name is required.');
    if (!form.mobile.trim()) return Alert.alert('Mobile number is required.');
    if (!form.service) return Alert.alert('Please select what you are looking for.');

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
        {/* Hero */}
        <View style={styles.hero}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
          </TouchableOpacity>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <View style={styles.tagsRow}>
            <View style={styles.categoryBadge}>
              <Ionicons name="ribbon-outline" size={12} color={Colors.white} />
              <Text style={styles.categoryBadgeText}>{coach.category}</Text>
            </View>
            {coach.online && (
              <View style={styles.availBadge}>
                <View style={styles.availDot} />
                <Text style={styles.availText}>Available Now</Text>
              </View>
            )}
          </View>

          <Text style={styles.name}>{coach.name}</Text>

          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color={Colors.accent} />
            <Text style={styles.ratingVal}>{coach.rating}</Text>
            <Text style={styles.ratingCount}>from {coach.clients}+ clients</Text>
          </View>

          <Text style={styles.bio}>{coach.bio}</Text>

          <View style={styles.specialtyWrap}>
            {coach.tags.map(tag => (
              <View key={tag} style={styles.specialtyTag}>
                <Ionicons name="checkmark" size={11} color="rgba(255,255,255,0.85)" />
                <Text style={styles.specialtyText}>{tag}</Text>
              </View>
            ))}
          </View>

          <View style={styles.heroCtas}>
            <TouchableOpacity style={styles.bookBtn} onPress={submitEnquiry} disabled={submitting}>
              <Ionicons name="calendar-outline" size={16} color={Colors.white} />
              <Text style={styles.bookBtnText}>Book Free Consultation</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.waBtn} onPress={openWhatsApp}>
              <Ionicons name="logo-whatsapp" size={18} color={Colors.white} />
              <Text style={styles.waBtnText}>WhatsApp Me</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats strip */}
        <View style={styles.statsStrip}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{coach.clients}+</Text>
            <Text style={styles.statLabel}>Happy Clients</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{coach.experience}+</Text>
            <Text style={styles.statLabel}>Years Exp.</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{coach.tags.length}</Text>
            <Text style={styles.statLabel}>Services</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{coach.rating}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        {/* Expertise */}
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
                <Text style={styles.expertiseDesc}>{EXPERTISE_DESC}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Platform Recognition */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Platform Recognition</Text>
          <View style={styles.badgeList}>
            {RECOGNITION_BADGES.map(b => (
              <View key={b.title} style={styles.badgeRow}>
                <View style={styles.badgeIcon}>
                  <Ionicons name={b.icon} size={16} color={Colors.accent} />
                </View>
                <View>
                  <Text style={styles.badgeTitle}>{b.title}</Text>
                  <Text style={styles.badgeSubtitle}>{b.subtitle}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Consultation form */}
        <View style={[styles.section, styles.formSection]}>
          <View style={styles.sectionTag}>
            <Ionicons name="calendar-outline" size={12} color={Colors.secondary} />
            <Text style={styles.sectionTagText}>Get In Touch</Text>
          </View>
          <Text style={styles.sectionTitle}>Book Your Free Consultation</Text>
          <Text style={styles.sectionSubtitle}>
            {coach.name} personally responds within 24 hours, zero cost, zero commitment.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Your Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Full name"
              placeholderTextColor={Colors.textLight}
              value={form.name}
              onChangeText={v => update('name', v)}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Mobile Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="+91 98765 00000"
              placeholderTextColor={Colors.textLight}
              keyboardType="phone-pad"
              value={form.mobile}
              onChangeText={v => update('mobile', v)}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={Colors.textLight}
              keyboardType="email-address"
              value={form.email}
              onChangeText={v => update('email', v)}
            />
          </View>
          <DropdownField
            label="I'm Looking For"
            value={form.service}
            options={serviceOptions}
            onChange={v => update('service', v)}
            placeholder="Select a service..."
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

          <View style={styles.trustRow}>
            <Text style={styles.trustItem}>🔒 100% Free</Text>
            <Text style={styles.trustItem}>⏱ 24-hr Reply</Text>
            <Text style={styles.trustItem}>🛡 No Commitment</Text>
          </View>
        </View>

        {/* How I Coach You */}
        <View style={styles.section}>
          <View style={styles.sectionTag}>
            <Ionicons name="git-branch-outline" size={12} color={Colors.secondary} />
            <Text style={styles.sectionTagText}>My Process</Text>
          </View>
          <Text style={styles.sectionTitle}>How I Coach You</Text>
          {PROCESS_STEPS.map(step => (
            <View key={step.num} style={styles.stepRow}>
              <Text style={styles.stepNum}>{step.num}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepText}>{step.text}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Testimonials */}
        <View style={styles.section}>
          <View style={styles.sectionTag}>
            <Ionicons name="trophy-outline" size={12} color={Colors.secondary} />
            <Text style={styles.sectionTagText}>Success Stories</Text>
          </View>
          <Text style={styles.sectionTitle}>Real Clients, Real Results</Text>
          {TESTIMONIALS.map(t => (
            <View key={t.name} style={styles.testiCard}>
              <View style={styles.testiStars}>
                {[0, 1, 2, 3, 4].map(i => (
                  <Ionicons key={i} name="star" size={12} color={Colors.accent} />
                ))}
              </View>
              <Text style={styles.testiText}>&ldquo;{t.text}&rdquo;</Text>
              <View style={styles.testiFooter}>
                <View style={styles.testiAvatar}>
                  <Text style={styles.testiAvatarText}>{t.name[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.testiName}>{t.name}</Text>
                  <Text style={styles.testiMeta}>
                    {t.location} · {t.program}
                  </Text>
                </View>
                <Text style={styles.testiResult}>{t.result}</Text>
              </View>
              <View style={styles.beforeAfter}>
                <Text style={styles.baText}>
                  Before <Text style={styles.baBold}>{t.before}</Text>
                </Text>
                <Ionicons name="arrow-forward" size={12} color={Colors.textLight} />
                <Text style={styles.baText}>
                  After <Text style={styles.baBold}>{t.after}</Text>
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: {
    backgroundColor: Colors.secondary,
    paddingTop: 56,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
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
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
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
  availBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(34,197,94,0.18)',
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  availDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  availText: { color: '#4ade80', fontSize: 11, fontWeight: '700' },
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
    backgroundColor: '#25D366',
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
  expertiseTitle: { fontSize: 14, fontWeight: '700', color: Colors.textDark, marginBottom: 4 },
  expertiseDesc: { fontSize: 12, color: Colors.textLight, lineHeight: 17 },
  badgeList: { gap: 10, marginTop: 14 },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 14,
    ...Shadow.sm,
  },
  badgeIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTitle: { fontSize: 13, fontWeight: '700', color: Colors.textDark },
  badgeSubtitle: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textDark, marginBottom: 6 },
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
    paddingVertical: 14,
    marginTop: 6,
    ...Shadow.sm,
  },
  submitText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  trustRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16 },
  trustItem: { fontSize: 11, color: Colors.textLight, fontWeight: '600' },
  stepRow: { flexDirection: 'row', gap: 14, marginTop: 16 },
  stepNum: { fontSize: 22, fontWeight: '800', color: Colors.border, width: 36 },
  stepTitle: { fontSize: 14, fontWeight: '700', color: Colors.textDark, marginBottom: 4 },
  stepText: { fontSize: 12, color: Colors.textLight, lineHeight: 18 },
  testiCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 16,
    marginTop: 14,
    ...Shadow.sm,
  },
  testiStars: { flexDirection: 'row', gap: 2, marginBottom: 10 },
  testiText: {
    fontSize: 13,
    color: Colors.textDark,
    lineHeight: 19,
    fontStyle: 'italic',
    marginBottom: 14,
  },
  testiFooter: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  testiAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testiAvatarText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  testiName: { fontSize: 13, fontWeight: '700', color: Colors.textDark },
  testiMeta: { fontSize: 11, color: Colors.textLight, marginTop: 1 },
  testiResult: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  beforeAfter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.background,
    paddingTop: 12,
  },
  baText: { fontSize: 12, color: Colors.textLight },
  baBold: { fontWeight: '800', color: Colors.textDark },
});
