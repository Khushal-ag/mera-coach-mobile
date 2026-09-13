import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
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
  Shadow,
  Spacing,
  TouchTarget,
  statusChipStyles,
} from '../../constants/theme';
import { BrandImages } from '../../constants/images';
import BrandWordmark from '../../components/BrandWordmark';
import BrandLogo from '../../components/BrandLogo';
import ClientAvatar from '../../components/ClientAvatar';
import DashboardCarousel from '../../components/dashboard/DashboardCarousel';
import EmptyState from '../../components/EmptyState';
import ReloadState from '../../components/ReloadState';
import SectionTag from '../../components/SectionTag';
import { HeaderHomeButton } from '../../components/ScreenHeader';
import { APP_DISPLAY_NAME } from '../../config/appConfig';
import { getClientList, getEnquiryLeads, getRecheckupList } from '../../api/clientApi';
import { getCoachProfile, getCoachProfileFull } from '../../api/coachApi';
import { queryKeys } from '../../api/queryKeys';
import { getCurrentCoachCode, getCurrentCoachName } from '../../auth/session';
import { getErrorMessage } from '../../api/client';
import { refreshControlTheme } from '../../hooks/useRefreshControl';
import { lastCheckupLabel } from '../../utils/recheckup';
import { getProfileCompletion } from '../../utils/profileCompletion';
import ProfileCompletionCard from '../../components/profile/ProfileCompletionCard';
import type { DashboardStackScreenProps } from '../../types/navigation';
import type { ClientSummary } from '../../types/models';
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
}

interface QuickAction {
  label: string;
  icon: IoniconName;
  onPress: () => void;
}

function clientRowMeta(item: ClientSummary): string | null {
  const parts: string[] = [];
  if (item.goal) parts.push(item.goal);
  const checkup = lastCheckupLabel(item.lastCheckupDate);
  if (checkup !== 'No check-up recorded') parts.push(checkup);
  return parts.length ? parts.join(' · ') : null;
}

const GETTING_STARTED_TIPS = [
  'Add a client and run their first BMI check',
  'Track weekly check-ups from the Checkups tab',
  'Follow up on new leads before they go cold',
] as const;

export default function DashboardScreen({
  navigation,
}: DashboardStackScreenProps<'DashboardHome'>) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
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
  const greeting = greetingFor();
  const profileCompletion = useMemo(
    () => (profileFullQuery.data ? getProfileCompletion(profileFullQuery.data) : null),
    [profileFullQuery.data],
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      clientsQuery.refetch(),
      recheckupQuery.refetch(),
      leadsQuery.refetch(),
      profileQuery.refetch(),
      profileFullQuery.refetch(),
    ])
      .then(([clientsResult]) => {
        if (clientsResult.isError) {
          Alert.alert('Refresh failed', getErrorMessage(clientsResult.error, 'Please try again.'));
        }
      })
      .finally(() => setRefreshing(false));
  }, [clientsQuery, recheckupQuery, leadsQuery, profileQuery, profileFullQuery]);

  const clientsErrorMessage =
    clientsQuery.isError && !clients
      ? getErrorMessage(clientsQuery.error, 'Could not load client count.')
      : null;

  const recentClients = useMemo(() => (clients ?? []).slice(0, 3), [clients]);
  const clientCount = clients?.length ?? 0;
  const showGettingStarted = !clientsQuery.isPending && clientCount <= 1 && !clientsErrorMessage;

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
    },
    {
      label: 'Leads',
      value: activeLeadsCount != null ? String(activeLeadsCount) : '-',
      tint: Colors.accent,
    },
    {
      label: 'Due',
      value: dueCount != null ? String(dueCount) : '-',
      tint: Colors.primary,
    },
  ];

  const secondaryActions: QuickAction[] = [
    {
      label: 'My Clients',
      icon: 'people-outline',
      onPress: () => navigation.navigate('Clients', { screen: 'ClientListHome' }),
    },
    {
      label: 'Leads',
      icon: 'funnel-outline',
      onPress: () => navigation.navigate('Leads'),
    },
    {
      label: 'Checkups',
      icon: 'clipboard-outline',
      onPress: () => navigation.navigate('Checkups'),
    },
  ];

  function goAddClient() {
    navigation.navigate('Clients', {
      screen: 'AddClient',
      params: { returnTo: RETURN_TO_DASHBOARD },
    });
  }

  function renderRecentClients() {
    if (clientsQuery.isPending) {
      return (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={Colors.secondary} />
          <Text style={styles.loadingText}>Loading clients</Text>
        </View>
      );
    }

    if (recentClients.length === 0) {
      const failed = clientsErrorMessage != null;
      if (failed) {
        return (
          <ReloadState
            title="Could not load clients"
            message="Check your connection and try again."
            onRetry={onRefresh}
            style={styles.emptyCard}
          />
        );
      }
      return (
        <EmptyState
          illustration={BrandImages.emptyClients}
          title="Your client list starts here"
          message="Add your first client to track plans, BMI, and check-ups."
          actionLabel="Add Client"
          onAction={goAddClient}
          style={styles.emptyCard}
        />
      );
    }

    return (
      <View style={styles.clientListCard}>
        {recentClients.map((c, i) => {
          const meta = clientRowMeta(c);
          const isLast = i === recentClients.length - 1;
          return (
            <TouchableOpacity
              key={c.clientCode || c.id || String(i)}
              style={[styles.clientRow, !isLast && styles.clientRowBorder]}
              onPress={() =>
                navigation.navigate('Clients', {
                  screen: 'ClientDetail',
                  params: { client: c, returnTo: RETURN_TO_DASHBOARD },
                })
              }
            >
              <ClientAvatar clientCode={c.clientCode} size={44} />
              <View style={styles.clientInfo}>
                <Text style={styles.clientName} numberOfLines={1}>
                  {c.name}
                </Text>
                {meta ? (
                  <Text style={styles.clientMeta} numberOfLines={1}>
                    {meta}
                  </Text>
                ) : null}
              </View>
              {c.status ? (
                <View
                  style={[
                    styles.statusBadge,
                    c.status === 'Active' ? styles.statusActive : styles.statusWarning,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      c.status === 'Active' ? styles.statusActiveText : styles.statusWarningText,
                    ]}
                  >
                    {c.status}
                  </Text>
                </View>
              ) : (
                <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.md }}
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
            <View
              style={styles.brandMark}
              accessibilityRole="text"
              accessibilityLabel={APP_DISPLAY_NAME}
            >
              <BrandLogo variant="mark" size={30} />
              <BrandWordmark tone="onDark" size="sm" align="left" style={styles.brandWordmark} />
            </View>
            <View style={styles.headerActions}>
              <HeaderHomeButton />
              <TouchableOpacity
                style={styles.notifBtn}
                onPress={() => navigation.navigate('Notifications')}
                accessibilityRole="button"
                accessibilityLabel="Notifications"
                activeOpacity={PressOpacity.default}
                hitSlop={HitSlop.sm}
              >
                <Ionicons name="notifications-outline" size={20} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.greetingLine}>{greeting}</Text>
          <Text style={styles.coachName} numberOfLines={1}>
            {coachName}
          </Text>
          <Text style={styles.heroSub}>Clients, leads, and checkups.</Text>
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
                <Text style={[styles.metricValue, { color: metric.tint }]} numberOfLines={1}>
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
          <View style={styles.primaryCtaIcon}>
            <Ionicons name="person-add" size={18} color={Colors.white} />
          </View>
          <View style={styles.primaryCtaCopy}>
            <Text style={styles.primaryCtaTitle}>Add Client</Text>
            <Text style={styles.primaryCtaSub}>Start a new assessment</Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={Colors.white} />
        </TouchableOpacity>

        <View style={styles.secondaryRow}>
          {secondaryActions.map(action => (
            <TouchableOpacity
              key={action.label}
              style={styles.secondaryChip}
              onPress={action.onPress}
              activeOpacity={PressOpacity.strong}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              <View style={styles.secondaryIcon}>
                <Ionicons name={action.icon} size={18} color={Colors.secondary} />
              </View>
              <Text style={styles.secondaryLabel} numberOfLines={1}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.carouselSection}>
        <View style={styles.carouselHeader}>
          <SectionTag icon="barbell-outline" label="Coach Tips" />
          <Text style={styles.sectionHeading}>Tips for your week</Text>
        </View>
        <DashboardCarousel />
      </View>

      <View style={styles.recentSection}>
        <View style={styles.sectionHeader}>
          <View>
            <SectionTag icon="people-outline" label="Recent Clients" />
            <Text style={styles.sectionHeading}>Latest activity</Text>
          </View>
          {recentClients.length > 0 ? (
            <TouchableOpacity
              onPress={() => navigation.navigate('Clients', { screen: 'ClientListHome' })}
              hitSlop={HitSlop.sm}
              accessibilityRole="button"
              accessibilityLabel="See all clients"
            >
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {renderRecentClients()}

        {showGettingStarted ? (
          <View style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <Ionicons name="flash-outline" size={16} color={Colors.secondary} />
              <Text style={styles.tipsTitle}>Getting started</Text>
            </View>
            {GETTING_STARTED_TIPS.map(tip => (
              <View key={tip} style={styles.tipRow}>
                <View style={styles.tipDot} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: {
    backgroundColor: Colors.secondary,
    overflow: 'hidden',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl + Spacing.sm,
  },
  heroTop: { zIndex: 1 },
  heroBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  brandMark: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: 8,
  },
  brandWordmark: {
    marginTop: 2,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  greetingLine: {
    color: Colors.onDarkMuted,
    fontSize: 14,
    fontFamily: FontFamily.medium,
    letterSpacing: 0.2,
  },
  coachName: {
    color: Colors.white,
    fontSize: 28,
    fontFamily: FontFamily.extraBold,
    marginTop: 4,
    letterSpacing: -0.4,
    lineHeight: 34,
  },
  heroSub: {
    color: Colors.onDarkSoft,
    fontSize: 13,
    fontFamily: FontFamily.regular,
    marginTop: 6,
    lineHeight: 18,
  },
  notifBtn: {
    width: TouchTarget.header,
    height: TouchTarget.header,
    borderRadius: TouchTarget.header / 2,
    backgroundColor: Colors.onDarkOverlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsOverlap: {
    marginTop: -24,
    marginHorizontal: Spacing.md,
    zIndex: 2,
  },
  metricsStrip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    ...Shadow.md,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    gap: 2,
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: 2,
  },
  metricValue: {
    fontSize: 26,
    fontFamily: FontFamily.extraBold,
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  metricLabel: {
    fontSize: 12,
    fontFamily: FontFamily.semibold,
    color: Colors.textLight,
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
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  completionSlot: {
    marginBottom: Spacing.sm,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    ...Shadow.md,
  },
  primaryCtaIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.onDarkBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCtaCopy: { flex: 1 },
  primaryCtaTitle: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: FontFamily.bold,
  },
  primaryCtaSub: {
    color: Colors.onDarkMuted,
    fontSize: 12,
    fontFamily: FontFamily.medium,
    marginTop: 1,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  secondaryChip: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 12,
    paddingHorizontal: 4,
    ...Shadow.sm,
  },
  secondaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: {
    fontSize: 11,
    fontFamily: FontFamily.semibold,
    color: Colors.secondary,
    textAlign: 'center',
  },
  carouselSection: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  carouselHeader: {
    paddingHorizontal: Spacing.md,
  },
  recentSection: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  sectionHeading: {
    fontSize: 17,
    fontFamily: FontFamily.bold,
    color: Colors.textDark,
    marginBottom: Spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  seeAll: {
    color: Colors.primary,
    fontSize: 13,
    fontFamily: FontFamily.semibold,
    marginTop: 8,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    ...Shadow.sm,
  },
  loadingText: { fontSize: 13, fontFamily: FontFamily.medium, color: Colors.textLight },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    ...Shadow.sm,
  },
  clientListCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.sm,
  },
  clientRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  clientInfo: { flex: 1, minWidth: 0 },
  clientName: { fontSize: 15, fontFamily: FontFamily.bold, color: Colors.textDark },
  clientMeta: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    marginTop: 2,
  },
  statusBadge: {
    ...statusChipStyles.base,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
  },
  statusActive: { backgroundColor: Colors.secondaryLight },
  statusWarning: { backgroundColor: Colors.accentLight },
  statusText: { fontSize: 10, fontFamily: FontFamily.bold },
  statusActiveText: { color: Colors.secondary },
  statusWarningText: { color: Colors.accent },
  tipsCard: {
    backgroundColor: Colors.backgroundTan,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.xs,
  },
  tipsTitle: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    color: Colors.textDark,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 3,
  },
  tipDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.secondary,
    marginTop: 6,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    lineHeight: 17,
  },
});
