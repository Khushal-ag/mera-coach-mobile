import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  Animated,
  AccessibilityInfo,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Colors,
  FontFamily,
  HitSlop,
  IconSize,
  PressOpacity,
  Radius,
  ScreenPad,
  Shadow,
  Spacing,
  TouchTarget,
  Typography,
  headingFont,
} from '../../constants/theme';
import FormErrorBanner from '../../components/FormErrorBanner';
import DashboardCarousel from '../../components/dashboard/DashboardCarousel';
import PersonAvatar from '../../components/PersonAvatar';
import { getClientList, getEnquiryLeads, getRecheckupList } from '../../api/clientApi';
import { getCoachProfile, getCoachProfileFull } from '../../api/coachApi';
import { queryKeys } from '../../api/queryKeys';
import { getCurrentCoachCode, getCurrentCoachName } from '../../auth/session';
import { isSubscriptionRequired } from '../../config/appConfig';
import { getErrorMessage } from '../../api/client';
import { refreshControlTheme, useQueriesRefreshControl } from '../../hooks/useRefreshControl';
import { describeValidity } from '../../utils/validity';
import { getProfileCompletion } from '../../utils/profileCompletion';
import { resolveCoachPhotoUrl } from '../../utils/mediaUrl';
import ProfileCompletionCard from '../../components/profile/ProfileCompletionCard';
import type { DashboardStackScreenProps } from '../../types/navigation';
import type { IoniconName } from '../../types/icons';
import { RETURN_TO_DASHBOARD } from '../../utils/navigationBack';
import { useAutoFillLocation } from '../../hooks/useAutoFillLocation';
import { useOpenAddClient } from '../../hooks/useOpenAddClient';

function greetingFor(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

/** A tappable summary tile: the count and the shortcut to its list in one card. */
interface SummaryTile {
  label: string;
  sub: string;
  icon: IoniconName;
  value: string;
  pending: boolean;
  cardBg: string;
  iconColor: string;
  onPress: () => void;
}

/** Below this width the three summary tiles use a smaller label so it is not cut off. */
const COMPACT_WIDTH = 360;

export default function DashboardScreen({
  navigation,
}: DashboardStackScreenProps<'DashboardHome'>) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const compact = screenWidth < COMPACT_WIDTH;
  const coachCode = getCurrentCoachCode();
  const { openAddClient, checkingSubscription, subscriptionError } = useOpenAddClient();
  useAutoFillLocation();
  const [heroFade] = useState(() => new Animated.Value(0));
  const [heroSlide] = useState(() => new Animated.Value(14));
  const [metricsFade] = useState(() => new Animated.Value(0));
  const [metricsSlide] = useState(() => new Animated.Value(18));

  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then(reduceMotion => {
      if (cancelled) return;
      if (reduceMotion) {
        heroFade.setValue(1);
        heroSlide.setValue(0);
        metricsFade.setValue(1);
        metricsSlide.setValue(0);
        return;
      }
      Animated.stagger(90, [
        Animated.parallel([
          Animated.timing(heroFade, { toValue: 1, duration: 420, useNativeDriver: true }),
          Animated.timing(heroSlide, { toValue: 0, duration: 420, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(metricsFade, { toValue: 1, duration: 380, useNativeDriver: true }),
          Animated.timing(metricsSlide, { toValue: 0, duration: 380, useNativeDriver: true }),
        ]),
      ]).start();
    });
    return () => {
      cancelled = true;
    };
  }, [heroFade, heroSlide, metricsFade, metricsSlide]);

  const clientsQuery = useQuery({
    queryKey: queryKeys.clientList(coachCode),
    queryFn: () => getClientList(),
  });
  const recheckupQuery = useQuery({
    queryKey: queryKeys.recheckupList(coachCode),
    queryFn: () => getRecheckupList({ coachCode }),
  });
  const leadsQuery = useQuery({
    queryKey: queryKeys.enquiryLeads(coachCode),
    queryFn: () => getEnquiryLeads(coachCode),
  });
  const profileQuery = useQuery({
    queryKey: queryKeys.coachProfile,
    queryFn: getCoachProfile,
  });
  const profileFullQuery = useQuery({
    queryKey: queryKeys.coachProfileFull,
    queryFn: getCoachProfileFull,
  });
  const clients = clientsQuery.data ?? null;
  const coachName = profileQuery.data?.name || getCurrentCoachName() || 'Coach';
  const coachPhotoUri = resolveCoachPhotoUrl(profileQuery.data ?? profileFullQuery.data ?? {});
  const greeting = greetingFor();
  // With the subscription limit off, validity gates nothing, so the pill (and its Renew prompt) stays hidden.
  const validity = isSubscriptionRequired() ? describeValidity(profileQuery.data?.validUpto) : null;
  // Renewing goes through the Subscription screen, which applies the platform payment rules and confirms the payment.
  const renew = () => navigation.navigate('Premium');
  const profileCompletion = useMemo(
    () => (profileFullQuery.data ? getProfileCompletion(profileFullQuery.data) : null),
    [profileFullQuery.data],
  );

  const { refreshing, onRefresh, refreshError } = useQueriesRefreshControl([
    clientsQuery,
    recheckupQuery,
    leadsQuery,
    profileQuery,
    profileFullQuery,
  ]);

  const statsErrors = [
    clientsQuery.isError && !clients
      ? getErrorMessage(clientsQuery.error, 'Could not load client count.')
      : null,
    leadsQuery.isError && leadsQuery.data == null
      ? getErrorMessage(leadsQuery.error, 'Could not load leads.')
      : null,
    recheckupQuery.isError && recheckupQuery.data == null
      ? getErrorMessage(recheckupQuery.error, 'Could not load checkups due.')
      : null,
  ].filter((message): message is string => !!message);
  const statsError = [...new Set(statsErrors)].join('\n');

  const dueCount = useMemo(
    () => (recheckupQuery.data ? recheckupQuery.data.length : null),
    [recheckupQuery.data],
  );

  const activeLeadsCount = useMemo(() => {
    if (!leadsQuery.data) return null;
    return leadsQuery.data.filter(l => !l.isContacted).length;
  }, [leadsQuery.data]);

  const summaryTiles: SummaryTile[] = [
    {
      label: 'Clients',
      sub: 'View all',
      icon: 'people',
      value: clients ? String(clients.length) : '-',
      pending: clientsQuery.isPending && !clients,
      cardBg: Colors.cardTintGreen,
      iconColor: Colors.cardIconGreen,
      onPress: () => navigation.navigate('ClientListHome'),
    },
    {
      label: 'Leads',
      sub: 'Follow up',
      icon: 'funnel',
      value: activeLeadsCount != null ? String(activeLeadsCount) : '-',
      pending: leadsQuery.isPending && leadsQuery.data == null,
      cardBg: Colors.cardTintBlue,
      iconColor: Colors.cardIconBlue,
      onPress: () => navigation.navigate('Leads'),
    },
    {
      label: 'Checkups',
      sub: 'Due soon',
      icon: 'clipboard',
      value: dueCount != null ? String(dueCount) : '-',
      pending: recheckupQuery.isPending && recheckupQuery.data == null,
      cardBg: Colors.cardTintPurple,
      iconColor: Colors.cardIconPurple,
      onPress: () => navigation.navigate('CheckupListHome'),
    },
  ];

  function goAddClient() {
    void openAddClient({ returnTo: RETURN_TO_DASHBOARD });
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: ScreenPad.tabBarClearance }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...refreshControlTheme} />
      }
    >
      <View style={[styles.hero, { paddingTop: insets.top + Spacing.sm }]}>
        <Animated.View
          style={[styles.heroTop, { opacity: heroFade, transform: [{ translateY: heroSlide }] }]}
        >
          <View style={styles.heroBrandRow}>
            <View style={styles.brandBlock} accessibilityRole="text" accessibilityLabel="MeraCoach">
              <Text style={styles.brandTitle}>
                <Text style={styles.brandMera}>Mera</Text>
                <Text style={styles.brandCoach}>Coach</Text>
              </Text>
              <Text style={styles.guideLine}>
                <Text style={styles.guideWord}>Guide</Text>
                <Text style={styles.guideDot}> • </Text>
                <Text style={styles.guideWord}>Support</Text>
                <Text style={styles.guideDot}> • </Text>
                <Text style={styles.guideWord}>transform</Text>
              </Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.chromeIconBtn}
                onPress={() => navigation.navigate('Home', { page: 0 })}
                accessibilityRole="button"
                accessibilityLabel="Home"
                activeOpacity={PressOpacity.default}
                hitSlop={HitSlop.sm}
              >
                <Ionicons name="home-outline" size={IconSize.xxl} color={Colors.secondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.chromeIconBtn}
                onPress={() => navigation.navigate('Notifications')}
                accessibilityRole="button"
                accessibilityLabel="Notifications"
                activeOpacity={PressOpacity.default}
                hitSlop={HitSlop.sm}
              >
                <Ionicons
                  name="notifications-outline"
                  size={IconSize.xxl}
                  color={Colors.secondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.profileBtn}
                onPress={() => navigation.navigate('Profile')}
                accessibilityRole="button"
                accessibilityLabel="Profile"
                activeOpacity={PressOpacity.default}
                hitSlop={HitSlop.sm}
              >
                {coachPhotoUri ? (
                  <PersonAvatar uri={coachPhotoUri} size={TouchTarget.header} />
                ) : (
                  <View style={styles.profilePlaceholder} />
                )}
                <View style={styles.profileStatus} />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.greetingLine}>{greeting}</Text>
          <Text style={styles.coachName} numberOfLines={1}>
            {coachName}
          </Text>
          <Text style={styles.heroSub}>Clients, leads, and checkup</Text>
          {validity ? (
            <TouchableOpacity
              style={[
                styles.validityPill,
                validity.tone === 'soon' && styles.validityPillSoon,
                validity.tone === 'expired' && styles.validityPillExpired,
              ]}
              onPress={validity.tone === 'ok' ? undefined : renew}
              disabled={validity.tone === 'ok'}
              accessibilityRole={validity.tone === 'ok' ? 'text' : 'button'}
              accessibilityLabel={
                validity.tone === 'expired'
                  ? `Validity expired on ${validity.dateLabel}. Tap to renew.`
                  : `Valid till ${validity.dateLabel}`
              }
            >
              <Text
                style={[
                  styles.validityText,
                  validity.tone === 'soon' && styles.validityTextSoon,
                  validity.tone === 'expired' && styles.validityTextExpired,
                ]}
              >
                {validity.tone === 'expired'
                  ? `Validity expired on ${validity.dateLabel}. Renew`
                  : validity.tone === 'soon'
                    ? `Valid till ${validity.dateLabel} (${validity.daysLeft} day${validity.daysLeft === 1 ? '' : 's'} left). Renew`
                    : `Valid till ${validity.dateLabel}`}
              </Text>
            </TouchableOpacity>
          ) : null}
        </Animated.View>
      </View>

      <Animated.View
        style={[
          styles.metricsOverlap,
          { opacity: metricsFade, transform: [{ translateY: metricsSlide }] },
        ]}
      >
        <FormErrorBanner message={refreshError} />
        {statsError ? <Text style={styles.statsError}>{statsError}</Text> : null}
        <View style={styles.summaryRow}>
          {summaryTiles.map(tile => (
            <TouchableOpacity
              key={tile.label}
              style={[
                styles.summaryTile,
                compact && styles.summaryTileCompact,
                // 26 = about 15% alpha on the 6-digit hex icon colour.
                { backgroundColor: tile.cardBg, borderColor: `${tile.iconColor}26` },
              ]}
              onPress={tile.onPress}
              activeOpacity={PressOpacity.strong}
              accessibilityRole="button"
              accessibilityLabel={`${tile.label}: ${tile.pending ? 'Loading' : tile.value}. ${tile.sub}`}
            >
              <View style={styles.summaryTop}>
                <View style={styles.summaryCount}>
                  {tile.pending ? (
                    <ActivityIndicator
                      color={tile.iconColor}
                      size="small"
                      style={styles.summaryPending}
                    />
                  ) : (
                    <Text
                      style={[styles.summaryValue, compact && styles.summaryValueCompact]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.6}
                    >
                      {tile.value}
                    </Text>
                  )}
                </View>
                {compact ? null : (
                  <View style={styles.summaryIcon}>
                    <Ionicons name={tile.icon} size={IconSize.md} color={tile.iconColor} />
                  </View>
                )}
              </View>
              <Text
                style={[styles.summaryLabel, compact && styles.summaryLabelCompact]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {tile.label}
              </Text>
              <Text style={styles.summarySub} numberOfLines={1}>
                {tile.sub}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      <View style={styles.actionsSection}>
        {profileCompletion &&
        (!profileCompletion.isPublicReady || profileCompletion.percent < 100) ? (
          <View style={styles.completionSlot}>
            <ProfileCompletionCard
              completion={profileCompletion}
              onPress={() => navigation.navigate('Profile', { screen: 'EditProfile' })}
            />
          </View>
        ) : null}

        <FormErrorBanner message={subscriptionError} />
        <TouchableOpacity
          style={styles.primaryCta}
          onPress={goAddClient}
          disabled={checkingSubscription}
          activeOpacity={PressOpacity.default}
          accessibilityRole="button"
          accessibilityLabel="Add Client"
          accessibilityState={{ disabled: checkingSubscription, busy: checkingSubscription }}
        >
          <View style={styles.primaryCtaIcon}>
            <Ionicons name="person-add" size={IconSize.xl} color={Colors.white} />
          </View>
          <View style={styles.primaryCtaCopy}>
            <Text style={styles.primaryCtaTitle} numberOfLines={1}>
              Add Client
            </Text>
            <Text style={styles.primaryCtaSub} numberOfLines={1}>
              {checkingSubscription
                ? isSubscriptionRequired()
                  ? 'Checking your subscription'
                  : 'Just a moment'
                : 'Start a new assessment'}
            </Text>
          </View>
          {checkingSubscription ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Ionicons name="chevron-forward" size={IconSize.lg} color={Colors.white} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.carouselSection}>
        <DashboardCarousel onStartNow={goAddClient} onViewAll={goAddClient} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: {
    backgroundColor: Colors.background,
    overflow: 'hidden',
    paddingHorizontal: ScreenPad.horizontal,
  },
  heroTop: { zIndex: 1 },
  heroBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  brandBlock: {
    flexShrink: 1,
    paddingRight: Spacing.sm,
  },
  brandTitle: {
    ...Typography.title,
    letterSpacing: -0.4,
  },
  brandMera: {
    color: Colors.secondary,
    fontFamily: headingFont.extraBold,
  },
  brandCoach: {
    color: Colors.brandCoach,
    fontFamily: headingFont.extraBold,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flexShrink: 0,
  },
  guideLine: {
    ...Typography.caption,
    marginTop: Spacing.xxs,
  },
  guideWord: {
    color: Colors.greetingMuted,
    fontFamily: FontFamily.medium,
  },
  guideDot: {
    color: Colors.brandCoach,
    fontFamily: FontFamily.medium,
  },
  greetingLine: {
    ...Typography.body,
    color: Colors.greetingMuted,
  },
  coachName: {
    ...Typography.headline,
    marginTop: Spacing.xxs,
  },
  validityPill: {
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    backgroundColor: Colors.metricClientsBg,
  },
  validityPillSoon: { backgroundColor: Colors.accentLight },
  validityPillExpired: { backgroundColor: Colors.destructiveSoft },
  validityText: { ...Typography.caption, color: Colors.tipsPanel },
  validityTextSoon: { color: Colors.destructiveOrange },
  validityTextExpired: { color: Colors.destructive },
  heroSub: {
    ...Typography.caption,
    marginTop: Spacing.xxs,
  },
  chromeIconBtn: {
    width: IconSize.xxl,
    height: IconSize.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBtn: {
    width: TouchTarget.header,
    height: TouchTarget.header,
    borderRadius: TouchTarget.header / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePlaceholder: {
    width: TouchTarget.header,
    height: TouchTarget.header,
    borderRadius: TouchTarget.header / 2,
    backgroundColor: Colors.disabledBg,
  },
  profileStatus: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.secondary,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  metricsOverlap: {
    marginTop: Spacing.lg,
    marginHorizontal: ScreenPad.horizontal,
    zIndex: 2,
  },
  statsError: {
    ...Typography.caption,
    color: Colors.accent,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  actionsSection: {
    paddingHorizontal: ScreenPad.horizontal,
    paddingTop: Spacing.lg,
  },
  completionSlot: {
    marginBottom: Spacing.lg,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 60,
    borderRadius: Radius.md,
    backgroundColor: Colors.addClientBanner,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Shadow.sm,
  },
  primaryCtaIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    backgroundColor: Colors.onDarkOverlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCtaCopy: { flex: 1, minWidth: 0 },
  primaryCtaTitle: {
    ...Typography.tileValue,
    color: Colors.white,
  },
  primaryCtaSub: {
    ...Typography.caption,
    color: Colors.onDarkCaption,
    marginTop: Spacing.xxs,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.sm,
  },
  summaryTile: {
    flex: 1,
    minWidth: 0,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
  },
  // Narrow phones: the tile is only ~64px wide inside, so drop the icon chip and tighten the padding.
  summaryTileCompact: {
    paddingHorizontal: Spacing.xs,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.xxs,
  },
  summaryCount: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    minHeight: 32,
  },
  summaryValue: {
    fontFamily: headingFont.extraBold,
    fontSize: 26,
    lineHeight: 32,
    color: Colors.textDark,
    fontVariant: ['tabular-nums'],
  },
  summaryValueCompact: {
    fontSize: 24,
    lineHeight: 28,
  },
  summaryPending: {
    alignSelf: 'flex-start',
  },
  summaryIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  summaryLabel: {
    ...Typography.section,
    marginTop: 6,
    maxWidth: '100%',
  },
  summaryLabelCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  summarySub: {
    ...Typography.caption,
    maxWidth: '100%',
  },
  carouselSection: {
    paddingTop: Spacing.lg,
  },
});
