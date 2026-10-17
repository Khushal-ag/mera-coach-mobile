import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
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
import FormErrorBanner from '../../components/FormErrorBanner';
import ReloadState from '../../components/ReloadState';
import WaveScreenHeader from '../../components/WaveScreenHeader';
import ProfileCompletionCard from '../../components/profile/ProfileCompletionCard';
import SubscriptionStatusCard from '../../components/profile/SubscriptionStatusCard';
import { APP_DISPLAY_NAME, isSubscriptionRequired } from '../../config/appConfig';
import { openAccountDeletionEmail, openSupportEmail } from '../../utils/support';
import { formatExperienceDisplay } from '../../utils/experience';
import { isDegenerateImageSize, resolveMediaUrl } from '../../utils/mediaUrl';
import { getProfileCompletion } from '../../utils/profileCompletion';
import { shareCoachPublicProfile } from '../../utils/sharePublicProfile';
import { refreshControlTheme, useQueriesRefreshControl } from '../../hooks/useRefreshControl';
import { getCurrentCoachCode } from '../../auth/session';
import { logoutLocal } from '../../auth/logout';
import { getCoachPremiumOffer, getCoachProfile, getCoachProfileFull } from '../../api/coachApi';
import { getClientList } from '../../api/clientApi';
import { queryKeys } from '../../api/queryKeys';
import { getErrorMessage } from '../../api/client';
import { subscriptionCheckErrorMessage } from '../../utils/premiumOffer';
import type { ProfileStackParamList, ProfileStackScreenProps } from '../../types/navigation';
import type { IoniconName } from '../../types/icons';
import { navigateToDashboard } from '../../utils/navigationBack';

interface MenuItem {
  icon: IoniconName;
  label: string;
  route?: keyof ProfileStackParamList;
  /** Cross-tab destinations (Packages / Events tabs). */
  tab?: 'Packages' | 'Events';
  action?: 'support' | 'deleteAccount' | 'logout' | 'shareProfile';
}

const publicProfileItems: MenuItem[] = [
  {
    icon: 'share-social-outline',
    label: 'Share profile',
    action: 'shareProfile',
  },
  {
    icon: 'pricetags-outline',
    label: 'Packages',
    tab: 'Packages',
  },
  {
    icon: 'calendar-outline',
    label: 'Gallery & Events',
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
  const [actionError, setActionError] = useState<string | null>(null);
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
  const premiumQuery = useQuery({
    queryKey: queryKeys.coachPremium,
    queryFn: ({ signal }) => getCoachPremiumOffer(signal),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  const profile = profileQuery.data;
  const profileCompletion = useMemo(
    () => (profileFullQuery.data ? getProfileCompletion(profileFullQuery.data) : null),
    [profileFullQuery.data],
  );

  const { refreshing, onRefresh, refreshError } = useQueriesRefreshControl([
    profileQuery,
    profileFullQuery,
    clientsQuery,
    premiumQuery,
  ]);

  // Only shown with no cached profile — a background refetch failure leaves stale data as-is.
  const errorMessage =
    profileQuery.isError && !profile
      ? getErrorMessage(profileQuery.error, 'Could not load profile. Pull down to try again.')
      : null;

  const photoUri = resolveMediaUrl(profile?.profilePicUrl || profileFullQuery.data?.profilePicUrl);
  const coverRaw = profile?.coverUrl || profileFullQuery.data?.coverUrl || '';
  const coverUri = resolveMediaUrl(coverRaw);
  const [coverTrack, setCoverTrack] = useState(coverUri);
  const [failedCoverUri, setFailedCoverUri] = useState<string | null>(null);
  if (coverUri !== coverTrack) {
    setCoverTrack(coverUri);
    setFailedCoverUri(null);
  }
  const showCover = Boolean(coverUri) && failedCoverUri !== coverUri;

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
  // Average of the ratings clients submitted on the feedback form. "-" until the first one.
  const reviewCount = profile?.reviews ?? 0;
  const ratingDisplay = reviewCount > 0 && profile ? profile.rating.toFixed(1) : '-';

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
      case 'shareProfile':
        try {
          await shareCoachPublicProfile({
            coachCode: getCurrentCoachCode(),
            coachName: profile?.name,
          });
        } catch (err) {
          setActionError(getErrorMessage(err, 'Could not share your public profile link.'));
        }
        return;
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
          setActionError(getErrorMessage(err, 'Could not log out. Please try again.'));
        }
        return;
    }
  };

  const openSubscription = () => {
    navigation.navigate('Dashboard', {
      screen: 'Premium',
      params: {
        returnTo: { name: 'Profile', params: { screen: 'ProfileHome' } },
      },
    });
  };

  const subscriptionError =
    premiumQuery.isError && !premiumQuery.data
      ? subscriptionCheckErrorMessage(premiumQuery.error)
      : null;

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
        <View style={styles.bannerPad}>
          <FormErrorBanner message={actionError} />
          <FormErrorBanner message={refreshError} />
        </View>
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
              <View style={styles.profileClip}>
                {showCover ? (
                  <View style={styles.coverFrame} pointerEvents="none">
                    <Image
                      source={{ uri: coverUri }}
                      style={styles.coverImage}
                      resizeMode="cover"
                      accessible={false}
                      onError={() => setFailedCoverUri(coverUri)}
                      onLoad={e => {
                        const { width, height } = e.nativeEvent.source;
                        if (isDegenerateImageSize(width, height)) setFailedCoverUri(coverUri);
                      }}
                    />
                  </View>
                ) : null}
                <View style={[styles.profileBody, showCover && styles.profileBodyOnCover]}>
                  <View style={showCover ? styles.avatarRing : undefined}>
                    <PersonAvatar
                      uri={photoUri}
                      name={profile?.name}
                      size={80}
                      style={showCover ? styles.avatarFlush : styles.avatar}
                    />
                  </View>
                  <Text style={styles.name}>{profile?.name || 'Unable to load profile'}</Text>
                  <Text style={styles.role}>{profile?.category || ''}</Text>
                  {profile?.city ? (
                    <Text style={styles.location}>
                      <Ionicons
                        name="location-outline"
                        size={IconSize.sm}
                        color={Colors.accentInk}
                      />{' '}
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
                      <Text style={styles.statLabel}>
                        {reviewCount > 0 ? `Rating (${reviewCount})` : 'Rating'}
                      </Text>
                    </View>
                  </View>
                  {clientsError ? <Text style={styles.rosterError}>{clientsError}</Text> : null}
                </View>
              </View>
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
          <Text style={styles.sectionTitle}>Subscription</Text>
          <View style={styles.underline} />
          <SubscriptionStatusCard
            subscription={premiumQuery.data?.subscription ?? null}
            loading={premiumQuery.isPending}
            errorMessage={subscriptionError}
            retrying={premiumQuery.isFetching}
            onRetry={() => void premiumQuery.refetch()}
            subscriptionRequired={isSubscriptionRequired()}
            onManage={openSubscription}
          />
        </View>

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
  bannerPad: { paddingHorizontal: ScreenPad.horizontal },
  profileCard: {
    marginHorizontal: ScreenPad.horizontal,
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    ...Shadow.sm,
  },
  profileClip: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    alignItems: 'stretch',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  coverFrame: {
    width: '100%',
    aspectRatio: 2.35,
    backgroundColor: Colors.secondary,
  },
  coverImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  profileBody: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  profileBodyOnCover: {
    paddingTop: 0,
  },
  avatarRing: {
    marginTop: -43,
    marginBottom: Spacing.sm,
    padding: 3,
    borderRadius: 999,
    backgroundColor: Colors.white,
  },
  completionSlot: {
    marginHorizontal: ScreenPad.horizontal,
    marginTop: Spacing.sm,
  },
  avatar: {
    marginBottom: Spacing.sm,
    marginRight: 0,
  },
  avatarFlush: {
    marginRight: 0,
    marginBottom: 0,
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
