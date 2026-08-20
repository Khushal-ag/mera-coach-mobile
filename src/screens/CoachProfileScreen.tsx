import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../constants/theme';
import { clearSession } from '../auth/session';
import { getCoachProfile } from '../api/coachApi';
import { queryKeys } from '../api/queryKeys';
import { useRefreshControl } from '../hooks/useRefreshControl';
import { getErrorMessage } from '../api/client';
import type { MainTabScreenProps } from '../types/navigation';
import type { IoniconName } from '../types/wizard';

interface MenuItem {
  icon: IoniconName;
  label: string;
  color: string;
  disabled?: boolean;
}

const menuItems: MenuItem[] = [
  { icon: 'person-outline', label: 'Edit Profile', color: Colors.secondary, disabled: true },
  { icon: 'notifications-outline', label: 'Notifications', color: Colors.primary },
  { icon: 'shield-checkmark-outline', label: 'Privacy & Security', color: '#7c3aed' },
  { icon: 'help-circle-outline', label: 'Help & Support', color: Colors.accent },
  { icon: 'document-text-outline', label: 'Terms & Conditions', color: Colors.textLight },
  { icon: 'log-out-outline', label: 'Logout', color: '#dc2626' },
];

export default function CoachProfileScreen(_props: MainTabScreenProps<'Profile'>) {
  const profileQuery = useQuery({
    queryKey: queryKeys.coachProfile,
    queryFn: getCoachProfile,
  });
  const profile = profileQuery.data;
  const refreshControl = useRefreshControl(profileQuery);

  // Only shown with no cached profile — a background refetch failure leaves stale data as-is.
  const errorMessage =
    profileQuery.isError && !profile
      ? getErrorMessage(profileQuery.error, 'Could not load profile. Pull down to try again.')
      : null;

  const initials =
    profile?.name
      .split(' ')
      .map(w => w[0])
      .slice(0, 2)
      .join('') || '?';

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshControl.refreshing}
          onRefresh={refreshControl.onRefresh}
          tintColor={Colors.secondary}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Profile</Text>
        <TouchableOpacity style={styles.settingsBtn}>
          <Ionicons name="settings-outline" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {profileQuery.isPending ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : errorMessage ? (
        <Text style={styles.empty}>{errorMessage}</Text>
      ) : (
        <>
          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.name}>{profile?.name || 'Unable to load profile'}</Text>
            <Text style={styles.role}>{profile?.category || ''}</Text>
            {profile?.city ? (
              <Text style={styles.location}>
                <Ionicons name="location-outline" size={12} color={Colors.textLight} />{' '}
                {profile.city}
              </Text>
            ) : null}

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{profile?.clients ?? 0}</Text>
                <Text style={styles.statLabel}>Clients</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{profile?.experience ?? 0} yrs</Text>
                <Text style={styles.statLabel}>Experience</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{profile?.rating ?? '—'}</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
            </View>
          </View>

          {/* Specializations */}
          {profile?.tags.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Specializations</Text>
              <View style={styles.tags}>
                {profile.tags.map(tag => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </>
      )}

      {/* Menu */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        {menuItems.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={[
              styles.menuItem,
              item.label === 'Logout' && styles.menuItemLast,
              item.disabled && styles.menuItemDisabled,
            ]}
            disabled={item.disabled}
            onPress={async () => {
              if (item.label !== 'Logout') return;
              // AppNavigator's useAuthState reacts to the session store and swaps back to
              // the public screen tree on its own — no navigation call needed here.
              await clearSession();
            }}
          >
            <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
              <Ionicons name={item.icon} size={18} color={item.color} />
            </View>
            <Text style={[styles.menuLabel, item.label === 'Logout' && { color: '#dc2626' }]}>
              {item.label}
            </Text>
            {item.label !== 'Logout' && !item.disabled && (
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
  name: { fontSize: 20, fontWeight: '800', color: Colors.textDark, textAlign: 'center' },
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
  menuItemDisabled: { opacity: 0.5 },
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
  empty: { textAlign: 'center', color: Colors.textLight, fontSize: 13, marginTop: 40 },
});
