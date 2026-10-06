import React, { useMemo } from 'react';
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
import {
  Colors,
  FontFamily,
  IconSize,
  PressOpacity,
  Radius,
  ScreenPad,
  Shadow,
  Spacing,
  Typography,
  headingFont,
} from '../../constants/theme';
import PersonAvatar from '../../components/PersonAvatar';
import ReloadState from '../../components/ReloadState';
import WaveScreenHeader from '../../components/WaveScreenHeader';
import ProfileCompletionCard from '../../components/profile/ProfileCompletionCard';
import { APP_DISPLAY_NAME } from '../../config/appConfig';
import { openAccountDeletionEmail, openSupportEmail } from '../../utils/support';
import { formatExperienceDisplay } from '../../utils/experience';
import { resolveCoachPhotoUrl } from '../../utils/mediaUrl';
import { getProfileCompletion } from '../../utils/profileCompletion';
import { refreshControlTheme, useQueriesRefreshControl } from '../../hooks/useRefreshControl';
import { getCurrentCoachCode } from '../../auth/session';
import { logoutLocal } from '../../auth/logout';
import { getCoachProfile, getCoachProfileFull } from '../../api/coachApi';
import { getClientList } from '../../api/clientApi';
import { queryKeys } from '../../api/queryKeys';
import { getErrorMessage } from '../../api/client';
import type { ProfileStackParamList, ProfileStackScreenProps } from '../../types/navigation';
import type { IoniconName } from '../../types/icons';
import { navigateToDashboard } from '../../utils/navigationBack';

interface MenuItem {
  icon: IoniconName;
  label: string;
  route?: keyof ProfileStackParamList;
  /** Cross-tab destinations (Packages / Events tabs). */
  tab?: 'Packages' | 'Events';
  action?: 'support' | 'deleteAccount' | 'logout';
}

const publicProfileItems: MenuItem[] = [
  {
    icon: 'images-outline',
    label: 'Photo gallery',
    route: 'GalleryHome',
  },
  {
    icon: 'pricetags-outline',
    label: 'Packages',
    tab: 'Packages',
  },
  {
    icon: 'calendar-outline',
    label: 'Events',
    tab: 'Events',
  },
];

// "Notifications" isn't listed here — it's already reachable via the bell icon on
// DashboardScreen. "Privacy & Terms" merges what would otherwise be two near-identical
// static-content screens (see LegalScreen). "Privacy & Security" as a separate settings hub
// isn't listed since its only concrete sub-feature for this app is Change Password.
const settingsItems: MenuItem[] = [
  { icon: 'person-outline', label: 'Edit Profile', route: 'EditProfile' },
  {
    icon: 'key-outline',
    label: 'Change Password',
    route: 'ChangePassword',
  },
  {
    icon: 'keypad-outline',
    label: 'MPIN',
    route: 'ChangeMpin',
  },
  {
    icon: 'help-circle-outline',
    label: 'Help & Support',
    action: 'support',
  },
  {
    icon: 'shield-checkmark-outline',
    label: 'Privacy & Terms',
    route: 'Legal',
  },
  {
    icon: 'trash-outline',
    label: 'Delete Account',
    action: 'deleteAccount',
  },
  { icon: 'log-out-outline', label: 'Logout', action: 'logout' },
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
  const isDelete = item.action === 'deleteAccount';
  const iconColor = isLogout
    ? Colors.destructive
    : isDelete
      ? Colors.destructiveOrange
      : Colors.accentInk;
  return (
    <TouchableOpacity
      style={[styles.menuItem, !isLast && styles.menuItemBorder]}
      accessibilityRole="button"
      accessibilityLabel={item.label}
      onPress={onPress}
      activeOpacity={PressOpacity.default}
    >
      <Ionicons name={item.icon} size={IconSize.lg} color={iconColor} />
      <Text style={[styles.menuLabel, isLogout && styles.menuLabelDanger]}>{item.label}</Text>
      {!isLogout ? (
        <Ionicons name="chevron-forward-outline" size={IconSize.lg} color={Colors.accentInk} />
      ) : null}
    </TouchableOpacity>
  );
}

export default function CoachProfileScreen({ navigation }: ProfileStackScreenProps<'ProfileHome'>) {
  const profileQuery = useQuery({
    queryKey: queryKeys.coachProfile,
    queryFn: getCoachProfile,
  });
  const profileFullQuery = useQuery({
    queryKey: queryKeys.coachProfileFull,
    queryFn: getCoachProfileFull,
  });
  // Live roster — Dashboard / Clients use the same key. Profile API's happyClientCount is
  // a separate self-reported marketing field and is often 0 even when clients exist.
  const clientsQuery = useQuery({
    queryKey: queryKeys.clientList(getCurrentCoachCode()),
    queryFn: () => getClientList(),
  });
  const profile = profileQuery.data;
  const profileCompletion = useMemo(
    () => (profileFullQuery.data ? getProfileCompletion(profileFullQuery.data) : null),
    [profileFullQuery.data],
  );

  const { refreshing, onRefresh } = useQueriesRefreshControl([
    profileQuery,
    profileFullQuery,
    clientsQuery,
  ]);

  // Only shown with no cached profile — a background refetch failure leaves stale data as-is.
  const errorMessage =
    profileQuery.isError && !profile
      ? getErrorMessage(profileQuery.error, 'Could not load profile. Pull down to try again.')
      : null;

  const photoUri = resolveCoachPhotoUrl(profile ?? {});

  const clientsFailed = clientsQuery.isError && clientsQuery.data == null;
  // Prefer live ClientList length. Fall back to happyClientCount only while the roster
  // has not loaded. A failed roster request stays blank instead of that marketing count.
  const clientCountDisplay =
    clientsQuery.data != null
      ? String(clientsQuery.data.length)
      : clientsFailed
        ? '-'
        : profile?.clients != null
          ? String(profile.clients)
          : clientsQuery.isPending || profileQuery.isPending
            ? '-'
            : '0';
  const clientsPendingBlank =
    clientsQuery.isPending && clientsQuery.data == null && profile?.clients == null;
  const clientsError = clientsFailed
    ? getErrorMessage(clientsQuery.error, 'Could not load client count.')
    : null;
  const completionError =
    profileFullQuery.isError && !profileFullQuery.data
      ? getErrorMessage(profileFullQuery.error, 'Could not load profile completion.')
      : null;

  const experienceDisplay = formatExperienceDisplay(profile?.experience, profile?.createdAt);
  const ratingDisplay =
    profile?.rating != null && profile.rating > 0 ? String(profile.rating) : '-';

  const handleMenuPress = async (item: MenuItem) => {
    if (item.tab === 'Packages') {
      navigation.navigate('Packages', { screen: 'PackagesHome' });
      return;
    }
    if (item.tab === 'Events') {
      navigation.navigate('Events', { screen: 'EventsHome' });
      return;
    }
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
        try {
          await logoutLocal();
        } catch (err) {
          Alert.alert('Could not log out', getErrorMessage(err, 'Please try again.'));
        }
        return;
    }
  };

  return (
    <View style={styles.container}>
      <WaveScreenHeader
        title="Profile"
        showBack={false}
        onHome={() => navigateToDashboard(navigation)}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: ScreenPad.tabBarClearance }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...refreshControlTheme} />
        }
      >
        {profileQuery.isPending ? (
          <ActivityIndicator color={Colors.secondary} style={{ marginTop: 40 }} />
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
                  <Ionicons name="location-outline" size={IconSize.sm} color={Colors.accentInk} />{' '}
                  {profile.city}
                </Text>
              ) : null}

              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  {clientsPendingBlank ? (
                    <ActivityIndicator color={Colors.secondary} size="small" />
                  ) : (
                    <Text style={styles.statValue}>{clientCountDisplay}</Text>
                  )}
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
              {clientsError ? <Text style={styles.rosterError}>{clientsError}</Text> : null}
            </View>

            {completionError ? (
              <Text style={[styles.rosterError, styles.completionError]}>{completionError}</Text>
            ) : null}

            {profileCompletion &&
            (!profileCompletion.isPublicReady || profileCompletion.percent < 100) ? (
              <View style={styles.completionSlot}>
                <ProfileCompletionCard
                  completion={profileCompletion}
                  variant="detailed"
                  onPress={() => navigation.navigate('EditProfile')}
                />
              </View>
            ) : null}
          </>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Public profile</Text>
          <View style={styles.underline} />
          <Text style={styles.sectionHint}>
            Photos, packages, and events show on your public page for prospective clients.
          </Text>
          <View style={styles.menuCard}>
            {publicProfileItems.map((item, i) => (
              <MenuRow
                key={item.label}
                item={item}
                isLast={i === publicProfileItems.length - 1}
                onPress={() => void handleMenuPress(item)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.underline} />
          <View style={styles.menuCard}>
            {settingsItems.map((item, i) => (
              <MenuRow
                key={item.label}
                item={item}
                isLast={i === settingsItems.length - 1}
                onPress={() => void handleMenuPress(item)}
              />
            ))}
          </View>
        </View>

        <View style={styles.brandLockup}>
          <Text style={styles.version}>{APP_DISPLAY_NAME} v1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const CANVAS = '#F3FAF7';
const UNDERLINE = '#F08A2C';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CANVAS },
  scroll: { flex: 1, backgroundColor: CANVAS },
  profileCard: {
    backgroundColor: Colors.white,
    marginHorizontal: ScreenPad.horizontal,
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  completionSlot: {
    marginHorizontal: ScreenPad.horizontal,
    marginTop: Spacing.sm,
  },
  avatar: {
    marginBottom: Spacing.sm,
    marginRight: 0,
  },
  name: {
    ...Typography.headline,
    fontFamily: headingFont.extraBold,
    fontSize: 20,
    textAlign: 'center',
  },
  role: {
    ...Typography.label,
    color: Colors.primary,
    marginTop: Spacing.xxs,
  },
  location: {
    ...Typography.caption,
    fontFamily: FontFamily.regular,
    marginTop: 6,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
    width: '100%',
  },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
  statValue: { fontSize: 20, fontFamily: headingFont.extraBold, color: Colors.textDark },
  statLabel: { ...Typography.micro, marginTop: 2 },
  section: {
    marginHorizontal: ScreenPad.horizontal,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.title,
  },
  underline: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: UNDERLINE,
    marginTop: Spacing.xxs,
    marginBottom: Spacing.sm,
  },
  sectionHint: {
    ...Typography.body,
    color: Colors.textLight,
    marginBottom: Spacing.sm,
  },
  menuCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    paddingHorizontal: Spacing.md,
    ...Shadow.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 56,
  },
  menuItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  menuLabel: { flex: 1, ...Typography.bodyStrong },
  menuLabelDanger: { color: Colors.destructive },
  rosterError: {
    ...Typography.caption,
    color: Colors.accent,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  completionError: {
    marginHorizontal: ScreenPad.horizontal,
  },
  brandLockup: { alignItems: 'center', paddingVertical: Spacing.lg, gap: Spacing.sm },
  version: {
    ...Typography.caption,
    textAlign: 'center',
  },
});
