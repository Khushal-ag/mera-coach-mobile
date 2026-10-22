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
import { getCurrentCoachCode, getCurrentCoachId, getCurrentCoachName } from '../../auth/session';
import { buildCoachPaymentUrl } from '../../utils/premiumOffer';
import { openPaymentUrl } from '../../utils/support';
import { getErrorMessage } from '../../api/client';
import { refreshControlTheme, useQueriesRefreshControl } from '../../hooks/useRefreshControl';
import { describeValidity } from '../../utils/validity';
import { getProfileCompletion } from '../../utils/profileCompletion';
import { resolveCoachPhotoUrl } from '../../utils/mediaUrl';
import ProfileCompletionCard from '../../components/profile/ProfileCompletionCard';
import type { DashboardStackScreenProps } from '../../types/navigation';
import type { IoniconName } from '../../types/icons';
import { RETURN_TO_DASHBOARD } from '../../utils/navigationBack';
import { useOpenAddClient } from '../../hooks/useOpenAddClient';

function greetingFor(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

interface MetricCard {
  label: string;
  value: string;
  pending: boolean;
  tint: string;
  iconBg: string;
}

interface QuickAction {
  label: string;
  sub: string;
  icon: IoniconName;
  cardBg: string;
  iconColor: string;
  onPress: () => void;
}

export default function DashboardScreen({
  navigation,
}: DashboardStackScreenProps<'DashboardHome'>) {
  const insets = useSafeAreaInsets();
  const coachCode = getCurrentCoachCode();
  const { openAddClient, checkingSubscription, subscriptionError } = useOpenAddClient();
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
  const validity = describeValidity(profileQuery.data?.validUpto);
  const renew = () =>
    void openPaymentUrl(
      buildCoachPaymentUrl({ coachId: getCurrentCoachId(), coachCode: getCurrentCoachCode() }),
    );
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

  const metrics: MetricCard[] = [
    {
      label: 'Clients',
      value: clients ? String(clients.length) : '-',
      pending: clientsQuery.isPending && !clients,
      tint: Colors.cardIconGreen,
      iconBg: Colors.metricClientsBg,
    },
    {
      label: 'Leads',
      value: activeLeadsCount != null ? String(activeLeadsCount) : '-',
      pending: leadsQuery.isPending && leadsQuery.data == null,
      tint: Colors.accent,
      iconBg: Colors.metricLeadsBg,
    },
    {
      label: 'Due',
      value: dueCount != null ? String(dueCount) : '-',
      pending: recheckupQuery.isPending && recheckupQuery.data == null,
      tint: Colors.metricDueIcon,
      iconBg: Colors.metricDueBg,
    },
  ];

  const secondaryActions: QuickAction[] = [
    {
      label: 'My Clients',
      sub: 'View & manage your clients',
      icon: 'people',
      cardBg: Colors.cardTintGreen,
      iconColor: Colors.cardIconGreen,
      onPress: () => navigation.navigate('ClientListHome'),
    },
    {
      label: 'Leads',
      sub: 'Track & convert Leads',
      icon: 'funnel',
      cardBg: Colors.cardTintBlue,
      iconColor: Colors.cardIconBlue,
      onPress: () => navigation.navigate('Leads'),
    },
    {
      label: 'Checkups',
      sub: 'View upcoming checkups',
      icon: 'clipboard',
      cardBg: Colors.cardTintPurple,
      iconColor: Colors.cardIconPurple,
      onPress: () => navigation.navigate('CheckupListHome'),
    },
  ];

  function goAddClient() {
    void openAddClient({ returnTo: RETURN_TO_DASHBOARD });
  }

  const metricIcons: Record<string, IoniconName> = {
    Clients: 'people',
    Leads: 'funnel',
    Due: 'calendar',
  };

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
        <View style={styles.metricsStrip}>
          {metrics.map((metric, i) => (
            <React.Fragment key={metric.label}>
              {i > 0 ? <View style={styles.metricDivider} /> : null}
              <View
                style={styles.metricItem}
                accessibilityRole="text"
                accessibilityLabel={`${metric.label}: ${metric.pending ? 'Loading' : metric.value}`}
              >
                <View style={[styles.metricIconWrap, { backgroundColor: metric.iconBg }]}>
                  <Ionicons
                    name={metricIcons[metric.label] ?? 'ellipse'}
                    size={IconSize.md}
                    color={metric.tint}
                  />
                </View>
                {metric.pending ? (
                  <ActivityIndicator color={Colors.secondary} size="small" />
                ) : (
                  <Text style={styles.metricValue} numberOfLines={1}>
                    {metric.value}
                  </Text>
                )}
                <Text style={styles.metricLabel} numberOfLines={1}>
                  {metric.label}
                </Text>
              </View>
            </React.Fragment>
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
          <View style={styles.primaryCtaFace}>
            <View style={styles.primaryCtaCurve} pointerEvents="none" />
            <View style={styles.primaryCtaIcon}>
              <Ionicons name="person-add" size={IconSize.xl} color={Colors.white} />
            </View>
            <View style={styles.primaryCtaCopy}>
              <Text style={styles.primaryCtaTitle} numberOfLines={1}>
                Add Client
              </Text>
              <Text style={styles.primaryCtaSub} numberOfLines={1}>
                {checkingSubscription ? 'Checking your subscription' : 'Start a new assessment'}
              </Text>
            </View>
            <View style={styles.primaryCtaArrow} pointerEvents="none">
              {checkingSubscription ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Ionicons name="arrow-forward-outline" size={IconSize.lg} color={Colors.white} />
              )}
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.secondaryRow}>
          {secondaryActions.map(action => (
            <TouchableOpacity
              key={action.label}
              style={[styles.secondaryChip, { backgroundColor: action.cardBg }]}
              onPress={action.onPress}
              activeOpacity={PressOpacity.strong}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              <View style={[styles.secondaryIcon, { backgroundColor: action.iconColor }]}>
                <Ionicons name={action.icon} size={IconSize.md} color={Colors.white} />
              </View>
              <Text style={styles.secondaryLabel} numberOfLines={1}>
                {action.label}
              </Text>
              <Text style={styles.secondarySub} numberOfLines={2}>
                {action.sub}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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
  metricsStrip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    minHeight: 85,
    paddingVertical: 6,
    paddingHorizontal: Spacing.xs,
    ...Shadow.sm,
  },
  metricItem: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxs,
    gap: 2,
  },
  metricIconWrap: {
    width: 29,
    height: 29,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: 10,
  },
  metricValue: {
    fontFamily: headingFont.bold,
    fontSize: 15,
    lineHeight: 18,
    color: Colors.textDark,
    maxWidth: '100%',
  },
  metricLabel: {
    fontSize: 13,
    lineHeight: 16,
    fontFamily: FontFamily.regular,
    color: Colors.textDark,
    maxWidth: '100%',
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
    borderRadius: Radius.md,
    backgroundColor: Colors.addClientBanner,
    ...Shadow.sm,
  },
  primaryCtaFace: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 68,
    backgroundColor: Colors.addClientBanner,
    borderRadius: Radius.md,
    paddingLeft: Spacing.sm,
    paddingRight: Spacing.md,
    overflow: 'hidden',
  },
  // Decorative circle behind the arrow. Placed by percentage of the card width, not from the right edge,
  // so its edge never cuts through the title or subtitle on any screen width.
  primaryCtaCurve: {
    position: 'absolute',
    left: '80%',
    top: -118,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: Colors.addClientBannerLight,
  },
  primaryCtaIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255,255,255,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  primaryCtaCopy: { flex: 1, zIndex: 1, minWidth: 0 },
  primaryCtaArrow: {
    zIndex: 1,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCtaTitle: {
    ...Typography.tileValue,
    color: Colors.white,
  },
  primaryCtaSub: {
    ...Typography.caption,
    color: Colors.white,
    marginTop: Spacing.xxs,
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  secondaryChip: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
    gap: Spacing.xxs,
    borderRadius: Radius.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    minHeight: 115,
    ...Shadow.sm,
  },
  secondaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  secondaryLabel: {
    ...Typography.section,
    maxWidth: '100%',
  },
  secondarySub: {
    ...Typography.caption,
    maxWidth: '100%',
  },
  carouselSection: {
    paddingTop: Spacing.lg,
  },
});
