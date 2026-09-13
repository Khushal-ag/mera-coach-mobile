import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontFamily,
  IconSize,
  PressOpacity,
  Radius,
  Shadow,
  Spacing,
  Typography,
} from '../../constants/theme';
import { PRIVACY_POLICY_URL } from '../../config/appConfig';
import { LEGAL_UPDATED, PRIVACY_POLICY_SECTIONS, TERMS_SECTIONS } from '../../data/legalContent';
import { openAccountDeletionEmail, openPrivacyPolicyUrl } from '../../utils/support';
import ScreenHeader from '../../components/ScreenHeader';
import type { ProfileStackScreenProps } from '../../types/navigation';

type Tab = 'privacy' | 'terms';

export default function LegalScreen({ navigation }: ProfileStackScreenProps<'Legal'>) {
  const [tab, setTab] = useState<Tab>('privacy');
  const sections = tab === 'privacy' ? PRIVACY_POLICY_SECTIONS : TERMS_SECTIONS;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Privacy & Terms" onBack={() => navigation.goBack()} />

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, tab === 'privacy' && styles.tabActive]}
          onPress={() => setTab('privacy')}
          activeOpacity={PressOpacity.default}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === 'privacy' }}
        >
          <Text style={[styles.tabText, tab === 'privacy' && styles.tabTextActive]}>
            Privacy Policy
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'terms' && styles.tabActive]}
          onPress={() => setTab('terms')}
          activeOpacity={PressOpacity.default}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === 'terms' }}
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
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => openPrivacyPolicyUrl()}
              activeOpacity={PressOpacity.default}
            >
              <Ionicons name="open-outline" size={IconSize.sm} color={Colors.secondary} />
              <Text style={styles.actionText}>View privacy policy online</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openAccountDeletionEmail()}
            activeOpacity={PressOpacity.default}
          >
            <Ionicons name="mail-outline" size={IconSize.sm} color={Colors.secondary} />
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    margin: Spacing.lg - 4,
    marginBottom: 0,
    borderRadius: Radius.pill,
    padding: Spacing.xxs,
    ...Shadow.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm - 2,
    minHeight: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: { backgroundColor: Colors.secondary },
  tabText: { ...Typography.label, color: Colors.textLight, fontFamily: FontFamily.bold },
  tabTextActive: { color: Colors.white },
  body: { flex: 1 },
  bodyContent: { padding: Spacing.lg - 4, paddingBottom: Spacing.xxl },
  updated: {
    ...Typography.caption,
    marginBottom: Spacing.sm,
    fontStyle: 'italic',
  },
  actions: { gap: Spacing.xs, marginBottom: Spacing.md },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.sm + 2,
    ...Shadow.sm,
  },
  actionText: { ...Typography.body, fontFamily: FontFamily.semibold, color: Colors.secondary },
  section: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  sectionTitle: { ...Typography.section, marginBottom: Spacing.xs },
  sectionBody: {
    ...Typography.label,
    color: Colors.textLight,
    lineHeight: 20,
    fontFamily: FontFamily.regular,
  },
});
