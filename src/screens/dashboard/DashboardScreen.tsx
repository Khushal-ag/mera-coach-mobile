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
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Colors,
  FontFamily,
  HitSlop,
  PressOpacity,
  ScreenPad,
  Shadow,
  Spacing,
  TouchTarget,
  Typography,
  headingFont,
} from '../../constants/theme';
import DashboardCarousel from '../../components/dashboard/DashboardCarousel';
import PersonAvatar from '../../components/PersonAvatar';
import { getClientList, getEnquiryLeads, getRecheckupList } from '../../api/clientApi';
import { getCoachProfile, getCoachProfileFull } from '../../api/coachApi';
import { queryKeys } from '../../api/queryKeys';
import { getCurrentCoachCode, getCurrentCoachName } from '../../auth/session';
import { getErrorMessage } from '../../api/client';
import { refreshControlTheme, useQueriesRefreshControl } from '../../hooks/useRefreshControl';
import { getProfileCompletion } from '../../utils/profileCompletion';
import { resolveCoachPhotoUrl } from '../../utils/mediaUrl';
import ProfileCompletionCard from '../../components/profile/ProfileCompletionCard';
import type { DashboardStackScreenProps } from '../../types/navigation';
import type { IoniconName } from '../../types/icons';
import { RETURN_TO_DASHBOARD } from '../../utils/navigationBack';

function greetingFor(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

interface MetricCard {
  label: string;
  value: string;
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
  const profileCompletion = useMemo(
    () => (profileFullQuery.data ? getProfileCompletion(profileFullQuery.data) : null),
    [profileFullQuery.data],
  );

  const { refreshing, onRefresh } = useQueriesRefreshControl([
    clientsQuery,
    recheckupQuery,
    leadsQuery,
    profileQuery,
    profileFullQuery,
  ]);

  const clientsErrorMessage =
    clientsQuery.isError && !clients
      ? getErrorMessage(clientsQuery.error, 'Could not load client count.')
      : null;

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
      tint: Colors.cardIconGreen,
      iconBg: Colors.metricClientsBg,
    },
    {
      label: 'Leads',
      value: activeLeadsCount != null ? String(activeLeadsCount) : '-',
      tint: Colors.accent,
      iconBg: Colors.metricLeadsBg,
    },
    {
      label: 'Due',
      value: dueCount != null ? String(dueCount) : '-',
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
    navigation.navigate('AddClient', { returnTo: RETURN_TO_DASHBOARD });
  }

  const metricIcons: Record<string, IoniconName> = {
    Clients: 'people',
    Leads: 'funnel',
    Due: 'calendar-outline',
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
                <Ionicons name="home-outline" size={28} color={Colors.secondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.chromeIconBtn}
                onPress={() => navigation.navigate('Notifications')}
                accessibilityRole="button"
                accessibilityLabel="Notifications"
                activeOpacity={PressOpacity.default}
                hitSlop={HitSlop.sm}
              >
                <Ionicons name="notifications-outline" size={28} color={Colors.secondary} />
                <View style={styles.notifDot} />
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
                  <PersonAvatar uri={coachPhotoUri} size={46} />
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
        </Animated.View>
      </View>

      <Animated.View
        style={[
          styles.metricsOverlap,
          { opacity: metricsFade, transform: [{ translateY: metricsSlide }] },
        ]}
      >
        {clientsErrorMessage ? <Text style={styles.statsError}>{clientsErrorMessage}</Text> : null}
        <View style={styles.metricsStrip}>
          {metrics.map((metric, i) => (
            <React.Fragment key={metric.label}>
              {i > 0 ? <View style={styles.metricDivider} /> : null}
              <View
                style={styles.metricItem}
                accessibilityRole="text"
                accessibilityLabel={`${metric.label}: ${metric.value}`}
              >
                <View style={[styles.metricIconWrap, { backgroundColor: metric.iconBg }]}>
                  <Ionicons
                    name={metricIcons[metric.label] ?? 'ellipse'}
                    size={18}
                    color={metric.tint}
                  />
                </View>
                <Text style={styles.metricValue} numberOfLines={1}>
                  {metric.value}
                </Text>
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

        <TouchableOpacity
          style={styles.primaryCta}
          onPress={goAddClient}
          activeOpacity={PressOpacity.default}
          accessibilityRole="button"
          accessibilityLabel="Add Client"
        >
          <View style={styles.primaryCtaCurve} pointerEvents="none" />
          <View style={styles.primaryCtaIcon}>
            <Ionicons name="person-add" size={26} color={Colors.white} />
          </View>
          <View style={styles.primaryCtaCopy}>
            <Text style={styles.primaryCtaTitle}>Add Client</Text>
            <Text style={styles.primaryCtaSub}>Start a new assessment</Text>
          </View>
          <View style={styles.primaryCtaArrow} pointerEvents="none">
            <Ionicons name="arrow-forward" size={22} color={Colors.white} />
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
                <Ionicons name={action.icon} size={22} color={Colors.white} />
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
    paddingBottom: Spacing.md,
  },
  heroTop: { zIndex: 1 },
  heroBrandRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  brandBlock: {
    flexShrink: 1,
    paddingRight: Spacing.sm,
  },
  brandTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: headingFont.bold,
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  guideLine: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    marginTop: 4,
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
    color: Colors.secondary,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: FontFamily.medium,
    letterSpacing: 0.1,
  },
  coachName: {
    marginTop: 6,
    color: Colors.textDark,
    fontFamily: headingFont.bold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.4,
  },
  heroSub: {
    color: Colors.textLight,
    fontSize: 15,
    lineHeight: 21,
    fontFamily: FontFamily.regular,
    marginTop: 4,
  },
  chromeIconBtn: {
    width: TouchTarget.header,
    height: TouchTarget.header,
    borderRadius: TouchTarget.header / 2,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.destructive,
  },
  profileBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
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
    marginTop: Spacing.xs,
    marginHorizontal: ScreenPad.horizontal,
    zIndex: 2,
  },
  metricsStrip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: Colors.white,
    borderRadius: 28,
    paddingVertical: 12,
    paddingHorizontal: Spacing.xs,
    ...Shadow.md,
  },
  metricItem: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    gap: 2,
  },
  metricIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: 10,
  },
  metricValue: {
    ...Typography.metric,
    lineHeight: 32,
    letterSpacing: -0.6,
    maxWidth: '100%',
  },
  metricLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: FontFamily.regular,
    color: Colors.textDark,
    maxWidth: '100%',
  },
  statsError: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    color: Colors.accent,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  actionsSection: {
    paddingHorizontal: ScreenPad.horizontal,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  completionSlot: {
    marginBottom: Spacing.sm,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    height: 80,
    backgroundColor: Colors.addClientBanner,
    borderRadius: 28,
    paddingLeft: 12,
    paddingRight: Spacing.lg,
    overflow: 'hidden',
  },
  primaryCtaCurve: {
    position: 'absolute',
    right: -56,
    top: -118,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: Colors.addClientBannerLight,
  },
  primaryCtaIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
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
    color: Colors.white,
    fontSize: 18,
    lineHeight: 22,
    fontFamily: headingFont.bold,
  },
  primaryCtaSub: {
    color: Colors.white,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: FontFamily.regular,
    marginTop: 2,
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  secondaryChip: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 22,
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 12,
    minHeight: 156,
  },
  secondaryIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  secondaryLabel: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: headingFont.bold,
    color: Colors.textDark,
    maxWidth: '100%',
  },
  secondarySub: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    lineHeight: 16,
    maxWidth: '100%',
  },
  carouselSection: {
    paddingTop: Spacing.sm,
  },
});
