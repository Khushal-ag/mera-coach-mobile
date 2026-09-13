import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, PressOpacity, Radius, Shadow, Spacing } from '../../constants/theme';
import PersonAvatar from '../../components/PersonAvatar';
import ReloadState from '../../components/ReloadState';
import BrandLogo from '../../components/BrandLogo';
import TabRootHeader from '../../components/TabRootHeader';
import { APP_DISPLAY_NAME } from '../../config/appConfig';
import { openAccountDeletionEmail, openSupportEmail } from '../../utils/support';
import { formatExperienceDisplay } from '../../utils/experience';
import { resolveCoachPhotoUrl } from '../../utils/mediaUrl';
import { refreshControlTheme } from '../../hooks/useRefreshControl';
import { clearSession, getCurrentCoachCode } from '../../auth/session';
import { getCoachProfile } from '../../api/coachApi';
import { getClientList } from '../../api/clientApi';
import { queryKeys } from '../../api/queryKeys';
import { getErrorMessage } from '../../api/client';
import type { ProfileStackParamList, ProfileStackScreenProps } from '../../types/navigation';
import type { IoniconName } from '../../types/icons';
import { navigateToDashboard } from '../../utils/navigationBack';

interface MenuItem {
  icon: IoniconName;
  label: string;
  color: string;
  route?: keyof ProfileStackParamList;
  action?: 'support' | 'deleteAccount' | 'logout';
}

const publicProfileItems: MenuItem[] = [
  {
    icon: 'images-outline',
    label: 'Photo gallery',
    color: Colors.secondary,
    route: 'EditGallery',
  },
  {
    icon: 'pricetags-outline',
    label: 'Packages',
    color: Colors.accent,
    route: 'EditPackages',
  },
  {
    icon: 'calendar-outline',
    label: 'Events',
    color: Colors.primary,
    route: 'EditEvents',
  },
];

// "Notifications" isn't listed here — it's already reachable via the bell icon on
// DashboardScreen. "Privacy & Terms" merges what would otherwise be two near-identical
// static-content screens (see LegalScreen). "Privacy & Security" as a separate settings hub
// isn't listed since its only concrete sub-feature for this app is Change Password.
const settingsItems: MenuItem[] = [
  { icon: 'person-outline', label: 'Edit Profile', color: Colors.secondary, route: 'EditProfile' },
  {
    icon: 'key-outline',
    label: 'Change Password',
    color: Colors.accent,
    route: 'ChangePassword',
  },
  {
    icon: 'help-circle-outline',
    label: 'Help & Support',
    color: Colors.primary,
    action: 'support',
  },
  {
    icon: 'shield-checkmark-outline',
    label: 'Privacy & Terms',
    color: Colors.secondary,
    route: 'Legal',
  },
  {
    icon: 'trash-outline',
    label: 'Delete Account',
    color: Colors.destructiveOrange,
    action: 'deleteAccount',
  },
  { icon: 'log-out-outline', label: 'Logout', color: Colors.destructive, action: 'logout' },
];

function MenuRow({
  item,
  isLast,
  onPress,
}: {
  item: MenuItem;
  isLast?: boolean;
  onPress: () => void;
}) {
  const isLogout = item.action === 'logout';
  return (
    <TouchableOpacity
      style={[styles.menuItem, isLast && styles.menuItemLast]}
      accessibilityRole="button"
      accessibilityLabel={item.label}
      onPress={onPress}
      activeOpacity={PressOpacity.default}
    >
      <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
        <Ionicons name={item.icon} size={18} color={item.color} />
      </View>
      <Text style={[styles.menuLabel, isLogout && { color: Colors.destructive }]}>
        {item.label}
      </Text>
      {!isLogout ? <Ionicons name="chevron-forward" size={16} color={Colors.border} /> : null}
    </TouchableOpacity>
  );
}

export default function CoachProfileScreen({ navigation }: ProfileStackScreenProps<'ProfileHome'>) {
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

  const photoUri = resolveCoachPhotoUrl(profile ?? {});

  // Prefer live ClientList length; fall back to happyClientCount only when the list isn't loaded.
  const clientCountDisplay =
    clientsQuery.data != null
      ? String(clientsQuery.data.length)
      : profile?.clients != null
        ? String(profile.clients)
        : clientsQuery.isPending || profileQuery.isPending
          ? '-'
          : '0';

  const experienceDisplay = formatExperienceDisplay(profile?.experience, profile?.createdAt);
  const ratingDisplay =
    profile?.rating != null && profile.rating > 0 ? String(profile.rating) : '-';

  const handleMenuPress = async (item: MenuItem) => {
    if (item.route) {
      navigation.navigate(item.route);
      return;
    }
    switch (item.action) {
      case 'support':
        return openSupportEmail();
      case 'deleteAccount':
        return openAccountDeletionEmail();
      case 'logout':
        // AppNavigator's useAuthState reacts to the session store and swaps back to
        // the public screen tree on its own — no navigation call needed here.
        await clearSession();
    }
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...refreshControlTheme} />
      }
    >
      <TabRootHeader title="My Profile" onBack={() => navigateToDashboard(navigation)} />

      {profileQuery.isPending ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : errorMessage ? (
        <ReloadState
          title="Could not load profile"
          message={errorMessage}
          onRetry={() => void profileQuery.refetch()}
          loading={profileQuery.isFetching}
        />
      ) : (
        <>
          <View style={styles.profileCard}>
            <PersonAvatar uri={photoUri} size={80} style={styles.avatar} />
            <Text style={styles.name}>{profile?.name || 'Unable to load profile'}</Text>
            <Text style={styles.role}>{profile?.category || ''}</Text>
            {profile?.city ? (
              <Text style={styles.location}>
                <Ionicons name="location-outline" size={12} color={Colors.textLight} />{' '}
                {profile.city}
              </Text>
            ) : null}

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
        </>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Public profile</Text>
        <Text style={styles.sectionHint}>
          Photos, packages, and events show on your public page for prospective clients.
        </Text>
        {publicProfileItems.map(item => (
          <MenuRow key={item.label} item={item} onPress={() => void handleMenuPress(item)} />
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        {settingsItems.map((item, i) => (
          <MenuRow
            key={item.label}
            item={item}
            isLast={i === settingsItems.length - 1}
            onPress={() => void handleMenuPress(item)}
          />
        ))}
      </View>

      <View style={styles.brandLockup}>
        <BrandLogo size={64} variant="full" />
        <Text style={styles.version}>{APP_DISPLAY_NAME} v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  profileCard: {
    backgroundColor: Colors.white,
    margin: Spacing.lg,
    borderRadius: Radius.lg,
    padding: 24,
    alignItems: 'center',
    ...Shadow.md,
  },
  avatar: {
    marginBottom: Spacing.sm,
    marginRight: 0,
  },
  name: {
    fontSize: 20,
    fontFamily: FontFamily.extraBold,
    color: Colors.textDark,
    textAlign: 'center',
  },
  role: { fontSize: 13, color: Colors.primary, fontFamily: FontFamily.semibold, marginTop: 4 },
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
  statValue: { fontSize: 20, fontFamily: FontFamily.extraBold, color: Colors.textDark },
  statLabel: { fontSize: 11, fontFamily: FontFamily.medium, color: Colors.textLight, marginTop: 2 },
  section: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  sectionTitle: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    color: Colors.textDark,
    marginBottom: 6,
  },
  sectionHint: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    lineHeight: 17,
    marginBottom: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm + 2,
    marginBottom: Spacing.xs,
    minHeight: 56,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
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
  menuLabel: { flex: 1, fontSize: 14, fontFamily: FontFamily.semibold, color: Colors.textDark },
  brandLockup: { alignItems: 'center', paddingVertical: Spacing.lg, gap: Spacing.sm },
  version: {
    textAlign: 'center',
    color: Colors.textLight,
    fontSize: 12,
    fontFamily: FontFamily.medium,
  },
});
