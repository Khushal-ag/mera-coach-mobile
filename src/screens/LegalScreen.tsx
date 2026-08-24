import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../constants/theme';
import { PRIVACY_POLICY_URL } from '../config/appConfig';
import { LEGAL_UPDATED, PRIVACY_POLICY_SECTIONS, TERMS_SECTIONS } from '../data/legalContent';
import { openAccountDeletionEmail, openPrivacyPolicyUrl } from '../utils/support';
import type { RootScreenProps } from '../types/navigation';

type Tab = 'privacy' | 'terms';

export default function LegalScreen({ navigation }: RootScreenProps<'Legal'>) {
  const [tab, setTab] = useState<Tab>('privacy');
  const sections = tab === 'privacy' ? PRIVACY_POLICY_SECTIONS : TERMS_SECTIONS;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Terms</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, tab === 'privacy' && styles.tabActive]}
          onPress={() => setTab('privacy')}
        >
          <Text style={[styles.tabText, tab === 'privacy' && styles.tabTextActive]}>
            Privacy Policy
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'terms' && styles.tabActive]}
          onPress={() => setTab('terms')}
        >
          <Text style={[styles.tabText, tab === 'terms' && styles.tabTextActive]}>
            Terms & Conditions
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.updated}>{LEGAL_UPDATED}</Text>

        <View style={styles.actions}>
          {PRIVACY_POLICY_URL ? (
            <TouchableOpacity style={styles.actionBtn} onPress={() => openPrivacyPolicyUrl()}>
              <Ionicons name="open-outline" size={16} color={Colors.secondary} />
              <Text style={styles.actionText}>View privacy policy online</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.actionBtn} onPress={() => openAccountDeletionEmail()}>
            <Ionicons name="mail-outline" size={16} color={Colors.secondary} />
            <Text style={styles.actionText}>Request account deletion</Text>
          </TouchableOpacity>
        </View>

        {sections.map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.secondary,
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: Colors.white, fontSize: 18, fontWeight: '700' },
  headerSpacer: { width: 36, height: 36 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    margin: 20,
    marginBottom: 0,
    borderRadius: Radius.pill,
    padding: 4,
    ...Shadow.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: Colors.secondary },
  tabText: { fontSize: 13, fontWeight: '700', color: Colors.textLight },
  tabTextActive: { color: Colors.white },
  body: { flex: 1 },
  bodyContent: { padding: 20, paddingBottom: 40 },
  updated: { fontSize: 12, color: Colors.textLight, marginBottom: 12, fontStyle: 'italic' },
  actions: { gap: 8, marginBottom: 16 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 14,
    ...Shadow.sm,
  },
  actionText: { fontSize: 14, fontWeight: '600', color: Colors.secondary },
  section: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 16,
    marginBottom: 12,
    ...Shadow.sm,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textDark, marginBottom: 8 },
  sectionBody: { fontSize: 13, color: Colors.textLight, lineHeight: 20 },
});
