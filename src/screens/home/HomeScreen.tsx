import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Colors,
  FontFamily,
  PressOpacity,
  Radius,
  Shadow,
  Spacing,
  TouchTarget,
} from '../../constants/theme';
import { BrandImages } from '../../constants/images';
import BrandWordmark from '../../components/BrandWordmark';
import { COACH_CATEGORIES as FALLBACK_CATEGORIES } from '../../data/homeContent';
import { getCoachCategories, getCoachPublicList } from '../../api/coachApi';
import { MASTER_STALE_MS } from '../../api/queryClient';
import { queryKeys } from '../../api/queryKeys';
import { useAuthState } from '../../auth/useAuthState';
import type { RootScreenProps } from '../../types/navigation';

interface HomeStat {
  value: string;
  label: string;
}

export default function HomeScreen({ navigation }: RootScreenProps<'Home'>) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const signedIn = useAuthState() === 'signedIn';
  const compact = screenHeight < 780;

  const categoriesQuery = useQuery({
    queryKey: queryKeys.coachCategories,
    queryFn: getCoachCategories,
    staleTime: MASTER_STALE_MS,
  });
  const coachesQuery = useQuery({
    queryKey: queryKeys.coachPublicList(),
    queryFn: ({ signal }) => getCoachPublicList({}, signal),
  });

  const apiCategories = categoriesQuery.data;
  const categories = apiCategories?.length ? apiCategories : FALLBACK_CATEGORIES;
  const coachesLoading = coachesQuery.isPending;

  const coachTotal = coachesQuery.data?.totalCount ?? coachesQuery.data?.coaches.length ?? 0;
  const avgRating = useMemo(() => {
    const rated = (coachesQuery.data?.coaches ?? []).filter(c => c.rating > 0);
    return rated.length ? rated.reduce((sum, c) => sum + c.rating, 0) / rated.length : null;
  }, [coachesQuery.data]);

  const statsReady = !coachesLoading;
  const canShowCoachStats = !!coachesQuery.data || !coachesQuery.isError;
  const stats: HomeStat[] =
    statsReady && canShowCoachStats
      ? [
          { value: String(coachTotal), label: 'Coaches' },
          categories.length > 0 ? { value: String(categories.length), label: 'Categories' } : null,
          avgRating != null ? { value: `${avgRating.toFixed(1)}/5`, label: 'Avg. Rating' } : null,
        ].filter((s): s is HomeStat => s != null)
      : [];
  const showStats = statsReady && stats.length >= 2;

  return (
    <View style={styles.container}>
      <ImageBackground
        source={BrandImages.mainScreenHero}
        style={[styles.hero, { paddingTop: insets.top }]}
        resizeMode="cover"
      >
        <View style={styles.topActions}>
          {signedIn ? (
            <TouchableOpacity
              style={styles.topPill}
              onPress={() => navigation.navigate('Main')}
              accessibilityRole="button"
              accessibilityLabel="Go to Dashboard"
              activeOpacity={PressOpacity.soft}
            >
              <Text style={styles.topPillText}>Dashboard</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.topPill}
              onPress={() => navigation.navigate('Login')}
              accessibilityRole="button"
              accessibilityLabel="Log In"
              activeOpacity={PressOpacity.soft}
            >
              <Text style={styles.topPillText}>Log In</Text>
            </TouchableOpacity>
          )}
        </View>
      </ImageBackground>

      <TouchableOpacity
        style={[styles.ctaBanner, compact && styles.ctaBannerCompact]}
        activeOpacity={PressOpacity.soft}
        onPress={() => navigation.navigate('HomeExplore')}
        accessibilityRole="button"
        accessibilityLabel="Grow Your Coaching Business with mera coach"
      >
        <Text style={[styles.ctaLine, compact && styles.ctaLineCompact]}>
          Grow Your Coaching Business
        </Text>
        <BrandWordmark
          prefix="with "
          tone="onDark"
          size={compact ? 'md' : 'lg'}
          style={styles.ctaBrandLine}
        />
      </TouchableOpacity>

      {showStats ? (
        <View style={[styles.statsStrip, { marginBottom: insets.bottom + Spacing.sm }]}>
          {stats.map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <View style={styles.statDivider} />}
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      ) : coachesLoading ? (
        <View
          style={[
            styles.statsStrip,
            styles.statsStripLoading,
            { marginBottom: insets.bottom + Spacing.sm },
          ]}
        >
          <ActivityIndicator color={Colors.secondary} />
        </View>
      ) : (
        <View style={{ marginBottom: insets.bottom + Spacing.sm }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary,
  },
  hero: {
    flex: 1,
  },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
  },
  topPill: {
    backgroundColor: Colors.onDarkFrost,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    minHeight: TouchTarget.min - 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  topPillText: {
    color: Colors.secondary,
    fontSize: 13,
    fontFamily: FontFamily.bold,
  },
  ctaBanner: {
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: Spacing.lg,
  },
  ctaBannerCompact: {
    paddingVertical: 14,
  },
  ctaLine: {
    color: Colors.white,
    fontFamily: FontFamily.extraBold,
    fontSize: 26,
    lineHeight: 32,
    textAlign: 'center',
  },
  ctaLineCompact: {
    fontSize: 20,
    lineHeight: 26,
  },
  ctaBrandLine: {
    marginTop: 4,
  },
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginTop: -16,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    ...Shadow.lg,
  },
  statsStripLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 64,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: Colors.border },
  statValue: { fontSize: 17, fontFamily: FontFamily.extraBold, color: Colors.textDark },
  statLabel: {
    fontSize: 10,
    fontFamily: FontFamily.medium,
    color: Colors.textLight,
    marginTop: 2,
    textAlign: 'center',
  },
});
