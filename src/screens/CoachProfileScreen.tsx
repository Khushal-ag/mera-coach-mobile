import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Shadow } from '../constants/theme';
import { HeaderHomeButton } from '../components/ScreenHeader';
import { APP_DISPLAY_NAME } from '../config/appConfig';
import { openAccountDeletionEmail, openSupportEmail } from '../utils/support';
import { formatExperienceDisplay } from '../utils/experience';
import { resolveMediaUrl } from '../utils/mediaUrl';
import { nameInitials } from '../utils/initials';
import { refreshControlTheme } from '../hooks/useRefreshControl';
import { clearSession, getCurrentCoachCode } from '../auth/session';
import { getCoachProfile } from '../api/coachApi';
import { getClientList } from '../api/clientApi';
import { queryKeys } from '../api/queryKeys';
import { getErrorMessage } from '../api/client';
import type { MainTabScreenProps } from '../types/navigation';
import type { IoniconName } from '../types/wizard';

interface MenuItem {
  icon: IoniconName;
  label: string;
  color: string;
}

// "Notifications" isn't listed here — it's already reachable via the bell icon on
// DashboardScreen. "Privacy & Terms" merges what would otherwise be two near-identical
// static-content screens (see LegalScreen). "Privacy & Security" as a separate settings hub
// isn't listed since its only concrete sub-feature for this app is Change Password.
const menuItems: MenuItem[] = [
  { icon: 'person-outline', label: 'Edit Profile', color: Colors.secondary },
  { icon: 'key-outline', label: 'Change Password', color: Colors.accent },
  { icon: 'help-circle-outline', label: 'Help & Support', color: Colors.primary },
  { icon: 'shield-checkmark-outline', label: 'Privacy & Terms', color: Colors.purple },
  { icon: 'trash-outline', label: 'Delete Account', color: Colors.destructiveOrange },
  { icon: 'log-out-outline', label: 'Logout', color: Colors.destructive },
];

export default function CoachProfileScreen({ navigation }: MainTabScreenProps<'Profile'>) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const profileQuery = useQuery({
    queryKey: queryKeys.coachProfile,
    queryFn: getCoachProfile,
  });
  // Live roster — Dashboard / Clients use the same key. Profile API's happyClientCount is
  // a separate self-reported marketing field and is often 0 even when clients exist.
  const clientsQuery = useQuery({
    queryKey: queryKeys.clientList(getCurrentCoachCode()),
    queryFn: () => getClientList(),
  });
  const profile = profileQuery.data;

  // Explicit pull only — do not bind RefreshControl to query.isRefetching (offscreen spinner).
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([profileQuery.refetch(), clientsQuery.refetch()])
      .then(([profileResult]) => {
        if (profileResult.isError) {
          Alert.alert('Refresh failed', getErrorMessage(profileResult.error, 'Please try again.'));
        }
      })
      .finally(() => setRefreshing(false));
  }, [profileQuery, clientsQuery]);

  // Only shown with no cached profile — a background refetch failure leaves stale data as-is.
  const errorMessage =
    profileQuery.isError && !profile
      ? getErrorMessage(profileQuery.error, 'Could not load profile. Pull down to try again.')
      : null;

  const initials = profile?.name ? nameInitials(profile.name) : '?';

  // Prefer live ClientList length; fall back to happyClientCount only when the list isn't loaded.
  const clientCountDisplay =
    clientsQuery.data != null
      ? String(clientsQuery.data.length)
      : profile?.clients != null
        ? String(profile.clients)
        : clientsQuery.isPending || profileQuery.isPending
          ? '—'
          : '0';

  const experienceDisplay = formatExperienceDisplay(profile?.experience, profile?.createdAt);
  const ratingDisplay =
    profile?.rating != null && profile.rating > 0 ? String(profile.rating) : '—';
  const photoUri = resolveMediaUrl(profile?.profilePicUrl);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...refreshControlTheme} />
      }
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>My Profile</Text>
        <HeaderHomeButton />
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
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
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
                <Text style={styles.statValue}>{clientCountDisplay}</Text>
                <Text style={styles.statLabel}>Clients</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{experienceDisplay}</Text>
                <Text style={styles.statLabel}>Experience</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{ratingDisplay}</Text>
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
            style={[styles.menuItem, item.label === 'Logout' && styles.menuItemLast]}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            onPress={async () => {
              switch (item.label) {
                case 'Edit Profile':
                  return navigation.navigate('EditProfile');
                case 'Change Password':
                  return navigation.navigate('ChangePassword');
                case 'Help & Support':
                  return openSupportEmail();
                case 'Privacy & Terms':
                  return navigation.navigate('Legal');
                case 'Delete Account':
                  return openAccountDeletionEmail();
                case 'Logout':
                  // AppNavigator's useAuthState reacts to the session store and swaps back to
                  // the public screen tree on its own — no navigation call needed here.
                  await clearSession();
              }
            }}
          >
            <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
              <Ionicons name={item.icon} size={18} color={item.color} />
            </View>
            <Text
              style={[styles.menuLabel, item.label === 'Logout' && { color: Colors.destructive }]}
            >
              {item.label}
            </Text>
            {item.label !== 'Logout' && (
              <Ionicons name="chevron-forward" size={16} color={Colors.border} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.version}>{APP_DISPLAY_NAME} v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.secondary,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { color: Colors.white, fontSize: 22, fontWeight: '800' },
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
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
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
