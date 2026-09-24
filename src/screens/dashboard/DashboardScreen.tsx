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
  Radius,
  ScreenPad,
  Shadow,
  Spacing,
  TouchTarget,
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
      tint: Colors.secondary,
      iconBg: Colors.metricClientsBg,
    },
    {
      label: 'Leads',
      value: activeLeadsCount != null ? String(activeLeadsCount) : '-',
      tint: Colors.brandCoach,
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
      icon: 'people-outline',
      cardBg: Colors.cardTintGreen,
      iconColor: Colors.cardIconGreen,
      onPress: () => navigation.navigate('ClientListHome'),
    },
    {
      label: 'Leads',
      sub: 'Track & convert Leads',
      icon: 'funnel-outline',
      cardBg: Colors.cardTintBlue,
      iconColor: Colors.cardIconBlue,
      onPress: () => navigation.navigate('Leads'),
    },
    {
      label: 'Checkups',
      sub: 'View upcoming checkups',
      icon: 'clipboard-outline',
      cardBg: Colors.cardTintPurple,
      iconColor: Colors.cardIconPurple,
      onPress: () => navigation.navigate('CheckupListHome'),
    },
  ];

  function goAddClient() {
    navigation.navigate('AddClient', { returnTo: RETURN_TO_DASHBOARD });
  }

  const metricIcons: Record<string, IoniconName> = {
    Clients: 'people-outline',
    Leads: 'funnel-outline',
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
                onPress={() => navigation.navigate('Home')}
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
                    name={metricIcons[metric.label] ?? 'ellipse-outline'}
                    size={26}
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
            <Ionicons name="person-add-outline" size={24} color={Colors.white} />
          </View>
          <View style={styles.primaryCtaCopy}>
            <Text style={styles.primaryCtaTitle}>Add Client</Text>
            <Text style={styles.primaryCtaSub}>Start a new assessment</Text>
          </View>
          <View style={styles.primaryCtaArrow}>
            <Ionicons name="arrow-forward-outline" size={20} color={Colors.white} />
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
                <Ionicons name={action.icon} size={26} color={Colors.white} />
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
    fontSize: 26,
    fontFamily: headingFont.extraBold,
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
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
    color: Colors.greetingMuted,
    fontSize: 15,
    fontFamily: FontFamily.medium,
    letterSpacing: 0.2,
  },
  coachName: {
    color: Colors.textDark,
    fontSize: 28,
    fontFamily: headingFont.extraBold,
    marginTop: 4,
    letterSpacing: -0.4,
    lineHeight: 34,
  },
  heroSub: {
    color: Colors.textLight,
    fontSize: 14,
    fontFamily: FontFamily.regular,
    marginTop: 6,
    lineHeight: 20,
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
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xs,
    ...Shadow.md,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    gap: 4,
  },
  metricIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: 16,
  },
  metricValue: {
    fontSize: 30,
    fontFamily: headingFont.extraBold,
    color: Colors.textDark,
    lineHeight: 34,
    letterSpacing: -0.4,
  },
  metricLabel: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.textDark,
    marginTop: 2,
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
    height: 74,
    backgroundColor: Colors.addClientBannerLight,
    borderRadius: 24,
    paddingHorizontal: Spacing.md,
    overflow: 'hidden',
  },
  primaryCtaCurve: {
    position: 'absolute',
    right: -48,
    top: -52,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: Colors.addClientBannerDark,
  },
  primaryCtaIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  primaryCtaCopy: { flex: 1, zIndex: 1 },
  primaryCtaArrow: { zIndex: 1 },
  primaryCtaTitle: {
    color: Colors.white,
    fontSize: 18,
    fontFamily: headingFont.bold,
  },
  primaryCtaSub: {
    color: Colors.white,
    fontSize: 13,
    fontFamily: FontFamily.regular,
    marginTop: 2,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  secondaryChip: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: Spacing.sm,
    minHeight: 148,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  secondaryIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: {
    fontSize: 16,
    fontFamily: headingFont.bold,
    color: Colors.textDark,
  },
  secondarySub: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    lineHeight: 14,
  },
  carouselSection: {
    paddingTop: Spacing.sm,
  },
});
