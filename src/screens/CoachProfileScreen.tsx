import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../constants/theme';
import { clearSession } from '../auth/session';
import type { MainTabScreenProps } from '../types/navigation';
import type { IoniconName } from '../types/wizard';

interface MenuItem {
  icon: IoniconName;
  label: string;
  color: string;
}

const menuItems: MenuItem[] = [
  { icon: 'person-outline', label: 'Edit Profile', color: Colors.secondary },
  { icon: 'notifications-outline', label: 'Notifications', color: Colors.primary },
  { icon: 'shield-checkmark-outline', label: 'Privacy & Security', color: '#7c3aed' },
  { icon: 'help-circle-outline', label: 'Help & Support', color: Colors.accent },
  { icon: 'document-text-outline', label: 'Terms & Conditions', color: Colors.textLight },
  { icon: 'log-out-outline', label: 'Logout', color: '#dc2626' },
];

const stats = [
  { label: 'Clients', value: '48' },
  { label: 'Leads', value: '12' },
  { label: 'Experience', value: '5 yrs' },
];

export default function CoachProfileScreen({ navigation }: MainTabScreenProps<'Profile'>) {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Profile</Text>
        <TouchableOpacity style={styles.settingsBtn}>
          <Ionicons name="settings-outline" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>AC</Text>
        </View>
        <Text style={styles.name}>Amit Chaudhary</Text>
        <Text style={styles.role}>Certified Health Coach</Text>
        <Text style={styles.location}>
          <Ionicons name="location-outline" size={12} color={Colors.textLight} /> Mumbai, India
        </Text>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {stats.map((s, i) => (
            <React.Fragment key={i}>
              {i > 0 && <View style={styles.statDivider} />}
              <View style={styles.stat}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* Specializations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Specializations</Text>
        <View style={styles.tags}>
          {['Weight Loss', 'Diabetes', 'PCOD', 'Heart Health', 'Sports Nutrition'].map((tag, i) => (
            <View key={i} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Menu */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        {menuItems.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.menuItem, item.label === 'Logout' && styles.menuItemLast]}
            onPress={async () => {
              if (item.label !== 'Logout') return;
              await clearSession();
              navigation.replace('Login');
            }}
          >
            <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
              <Ionicons name={item.icon} size={18} color={item.color} />
            </View>
            <Text style={[styles.menuLabel, item.label === 'Logout' && { color: '#dc2626' }]}>
              {item.label}
            </Text>
            {item.label !== 'Logout' && (
              <Ionicons name="chevron-forward" size={16} color={Colors.border} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.version}>MeraCoach v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.secondary,
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { color: Colors.white, fontSize: 22, fontWeight: '800' },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    backgroundColor: Colors.white,
    margin: 20,
    borderRadius: Radius.lg,
    padding: 24,
    alignItems: 'center',
    ...Shadow.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { color: Colors.white, fontSize: 28, fontWeight: '800' },
  name: { fontSize: 20, fontWeight: '800', color: Colors.textDark },
  role: { fontSize: 13, color: Colors.primary, fontWeight: '600', marginTop: 4 },
  location: { fontSize: 12, color: Colors.textLight, marginTop: 6 },
  statsRow: {
    flexDirection: 'row',
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 16,
    width: '100%',
  },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: Colors.border },
  statValue: { fontSize: 20, fontWeight: '800', color: Colors.textDark },
  statLabel: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  section: { marginHorizontal: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textDark, marginBottom: 10 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: { color: Colors.secondary, fontSize: 12, fontWeight: '600' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: 8,
    ...Shadow.sm,
  },
  menuItemLast: { marginTop: 8 },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textDark },
  version: { textAlign: 'center', color: Colors.textLight, fontSize: 12, paddingVertical: 20 },
});
