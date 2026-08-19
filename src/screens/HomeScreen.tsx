import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../constants/theme';
import { HOME_STATS, COACH_CATEGORIES } from '../data/homeContent';
import type { RootScreenProps } from '../types/navigation';

export default function HomeScreen({ navigation }: RootScreenProps<'Home'>) {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <View style={styles.hero}>
        <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginLinkText}>Log In</Text>
        </TouchableOpacity>

        <View style={styles.logoBox}>
          <Ionicons name="fitness" size={30} color={Colors.white} />
        </View>
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>India&rsquo;s #1 Coach Management Platform</Text>
        </View>
        <Text style={styles.heroTitle}>
          Grow Your{'\n'}Health Coaching{'\n'}
          <Text style={styles.heroTitleItalic}>Business</Text>
        </Text>
        <Text style={styles.heroSubtitle}>
          Manage clients, track progress and build your coaching brand — all in one powerful
          platform.
        </Text>

        <View style={styles.ctaRow}>
          <TouchableOpacity
            style={styles.ctaPrimary}
            onPress={() => navigation.navigate('Register')}
          >
            <Ionicons name="person" size={16} color={Colors.white} />
            <Text style={styles.ctaPrimaryText}>Start as a Coach</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.ctaSecondary}
            onPress={() => navigation.navigate('CoachList')}
          >
            <Ionicons name="search" size={16} color={Colors.white} />
            <Text style={styles.ctaSecondaryText}>Find a Coach</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats strip */}
      <View style={styles.statsStrip}>
        {HOME_STATS.map((s, i) => (
          <React.Fragment key={i}>
            {i > 0 && <View style={styles.statDivider} />}
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      {/* Categories */}
      <View style={styles.categoriesSection}>
        <View style={styles.sectionTag}>
          <Ionicons name="grid-outline" size={12} color={Colors.secondary} />
          <Text style={styles.sectionTagText}>Explore Categories</Text>
        </View>
        <Text style={styles.sectionTitle}>Coaching for Every Goal</Text>
        <Text style={styles.sectionSubtitle}>
          Whether it&apos;s weight loss, strength, yoga or dance — find the right coach type.
        </Text>

        <View style={styles.categoryGrid}>
          {COACH_CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.code}
              style={styles.categoryCard}
              onPress={() => navigation.navigate('CoachList', { categoryCode: cat.code })}
            >
              <View style={[styles.categoryIcon, { backgroundColor: cat.bg }]}>
                <Ionicons name={cat.icon} size={20} color={cat.color} />
              </View>
              <Text style={styles.categoryLabel} numberOfLines={2}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Bottom CTA */}
      <View style={styles.joinSection}>
        <Text style={styles.joinTitle}>Ready to grow your practice?</Text>
        <TouchableOpacity style={styles.joinBtn} onPress={() => navigation.navigate('Register')}>
          <Ionicons name="person-add" size={18} color={Colors.white} />
          <Text style={styles.joinBtnText}>Join Free as a Coach</Text>
        </TouchableOpacity>
        <Text style={styles.footer}>MeraCoach © 2024 · Wellness Platform</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: {
    backgroundColor: Colors.secondary,
    paddingTop: 56,
    paddingBottom: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  loginLink: { position: 'absolute', top: 56, right: 20, padding: 8 },
  loginLinkText: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  logoBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(201,136,42,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(201,136,42,0.35)',
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 18,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent },
  badgeText: { color: Colors.accent, fontSize: 11, fontWeight: '700' },
  heroTitle: {
    color: Colors.white,
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 36,
  },
  heroTitleItalic: { color: Colors.accent, fontStyle: 'italic' },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  ctaRow: { flexDirection: 'row', gap: 10, marginTop: 24, width: '100%' },
  ctaPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: Radius.pill,
    paddingVertical: 13,
    ...Shadow.md,
  },
  ctaPrimaryText: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  ctaSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: Radius.pill,
    paddingVertical: 13,
  },
  ctaSecondaryText: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    marginTop: -22,
    borderRadius: Radius.lg,
    paddingVertical: 18,
    ...Shadow.lg,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: Colors.border },
  statValue: { fontSize: 17, fontWeight: '800', color: Colors.secondary },
  statLabel: { fontSize: 10, color: Colors.textLight, marginTop: 2, textAlign: 'center' },
  categoriesSection: { padding: 20, paddingTop: 36 },
  sectionTag: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 10,
  },
  sectionTagText: { color: Colors.secondary, fontSize: 11, fontWeight: '700' },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: Colors.textDark, textAlign: 'center' },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 20 },
  categoryCard: {
    width: '47%',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 14,
    ...Shadow.sm,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  categoryLabel: { fontSize: 12, fontWeight: '700', color: Colors.textDark },
  joinSection: { alignItems: 'center', padding: 24, paddingTop: 8 },
  joinTitle: { fontSize: 15, fontWeight: '700', color: Colors.textDark, marginBottom: 14 },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 28,
    ...Shadow.sm,
  },
  joinBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  footer: { color: Colors.textLight, fontSize: 11, marginTop: 20 },
});
