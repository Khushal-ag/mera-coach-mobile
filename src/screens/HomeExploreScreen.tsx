import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontFamily, Radius, Shadow, Spacing } from '../constants/theme';
import { COACH_CATEGORIES as FALLBACK_CATEGORIES } from '../data/homeContent';
import { exploreCategoryLabel, pickExploreCategories } from '../data/homeExploreCategories';
import { HOME_FEATURES } from '../data/homeExploreContent';
import { getCoachCategories, getCoachPublicList } from '../api/coachApi';
import { MASTER_STALE_MS } from '../api/queryClient';
import { queryKeys } from '../api/queryKeys';
import { useAuthState } from '../auth/useAuthState';
import PersonAvatar from '../components/PersonAvatar';
import CategoryIcon from '../components/CategoryIcon';
import PublicBmiCard from '../components/PublicBmiCard';
import SectionHeading from '../components/SectionHeading';
import { HeaderBackButton } from '../components/ScreenHeader';
import { resolveMediaUrl } from '../utils/mediaUrl';
import { shouldShowPublicRating } from '../utils/coachPublicStats';
import { getErrorMessage } from '../api/client';
import type { RootScreenProps } from '../types/navigation';
import type { Coach } from '../types/models';

const BODY_PADDING = Spacing.md;
const GRID_GAP = 10;
const CATEGORY_ROWS = 3;
const COACH_CARD_WIDTH = 100;
const FEATURE_ROW_HEIGHT = 34;

function FeatureRow({
  label,
  icon,
  color,
  bg,
  isLast,
}: (typeof HOME_FEATURES)[number] & { isLast: boolean }) {
  return (
    <View style={[styles.featureRowWrap, isLast && styles.featureRowWrapLast]}>
      <View style={styles.featureRow}>
        <View style={[styles.featureIcon, { backgroundColor: bg }]}>
          <Ionicons name={icon} size={15} color={color} />
        </View>
        <Text style={styles.featureLabel} numberOfLines={1}>
          {label}
        </Text>
        <Ionicons name="chevron-forward" size={15} color={Colors.border} />
      </View>
    </View>
  );
}

function CoachTile({ coach, onPress }: { coach: Coach; onPress: () => void }) {
  const photoUri = resolveMediaUrl(coach.profilePicUrl);
  const showRating = shouldShowPublicRating(coach.rating, coach.reviews);

  return (
    <TouchableOpacity style={styles.coachTile} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.coachPhotoWrap}>
        <PersonAvatar uri={photoUri} size={50} />
        {showRating ? (
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={9} color={Colors.accent} />
            <Text style={styles.ratingText}>{coach.rating.toFixed(1)}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.coachName} numberOfLines={1}>
        {coach.name}
      </Text>
      <Text style={styles.coachMeta} numberOfLines={2}>
        {coach.category}
      </Text>
      {coach.city ? (
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={10} color={Colors.textLight} />
          <Text style={styles.coachCity} numberOfLines={1}>
            {coach.city}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

export default function HomeExploreScreen({ navigation }: RootScreenProps<'HomeExplore'>) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const signedIn = useAuthState() === 'signedIn';

  const compact = screenHeight < 820;
  const contentWidth = screenWidth - BODY_PADDING * 2;
  const categoryCardWidth = (contentWidth - GRID_GAP) / 2;
  const categoryCardHeight = compact ? 80 : 88;
  const categoryGridHeight = CATEGORY_ROWS * categoryCardHeight + (CATEGORY_ROWS - 1) * GRID_GAP;
  const bottomBarHeight = 58 + Math.max(insets.bottom, Spacing.xs);

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
  const allCategories = apiCategories?.length ? apiCategories : FALLBACK_CATEGORIES;
  const categories = pickExploreCategories(allCategories);
  const categoriesLoading = categoriesQuery.isPending && !apiCategories;
  const reviewsLoading = coachesQuery.isPending && !coachesQuery.data;
  const coachesLoadError =
    coachesQuery.isError && !coachesQuery.data
      ? getErrorMessage(coachesQuery.error, 'Could not load coaches. Please try again.')
      : null;

  const reviewCoaches = useMemo(() => {
    const list = coachesQuery.data?.coaches ?? [];
    const withRatings = list.filter(c => shouldShowPublicRating(c.rating, c.reviews));
    const source = withRatings.length ? withRatings : list;
    return [...source].sort((a, b) => b.rating - a.rating || b.reviews - a.reviews).slice(0, 6);
  }, [coachesQuery.data]);

  const openCoach = (coach: Coach) => {
    navigation.navigate('CoachPublicProfile', {
      coach,
      coachCode: coach.id,
      coachCodes: reviewCoaches.map(c => c.id),
      coaches: reviewCoaches,
    });
  };

  const goBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Home');
  };

  const openDashboard = () => {
    if (signedIn) {
      navigation.navigate('Main');
      return;
    }
    navigation.navigate('Register');
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.xs }]}>
        <View style={styles.headerRow}>
          <View style={styles.backRow}>
            <HeaderBackButton onPress={goBack} onDark style={styles.backBtn} />
            <TouchableOpacity
              onPress={goBack}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Text style={styles.backLabel}>Back</Text>
            </TouchableOpacity>
          </View>

          {!signedIn ? (
            <TouchableOpacity
              style={styles.loginPill}
              onPress={() => navigation.navigate('Login')}
              accessibilityRole="button"
              accessibilityLabel="Log In"
            >
              <Text style={styles.loginPillText}>Log In</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.loginPill}
              onPress={() => navigation.navigate('Main')}
              accessibilityRole="button"
              accessibilityLabel="Go to Dashboard"
            >
              <Text style={styles.loginPillText}>Dashboard</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.bodyScroll}
        contentContainerStyle={[
          styles.bodyContent,
          { paddingBottom: bottomBarHeight + Spacing.sm },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <SectionHeading title="Coaching for Every Goal" icon="leaf-outline" />

        {categoriesLoading ? (
          <View style={[styles.loaderBox, { height: categoryGridHeight }]}>
            <ActivityIndicator color={Colors.secondary} />
          </View>
        ) : (
          <View style={[styles.categoryGrid, { height: categoryGridHeight }]}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.code}
                style={[
                  styles.categoryCard,
                  { width: categoryCardWidth, height: categoryCardHeight },
                ]}
                onPress={() => navigation.navigate('CoachList', { categoryCode: cat.code })}
                activeOpacity={0.85}
              >
                <View style={[styles.categoryIcon, { backgroundColor: cat.bg }]}>
                  <CategoryIcon category={cat} size={compact ? 18 : 20} color={cat.color} />
                </View>
                <Text style={styles.categoryLabel} numberOfLines={2}>
                  {exploreCategoryLabel(cat)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.featuresHeadingRow}>
          <View style={styles.featuresLine} />
          <Text style={styles.featuresHeading}>FEATURES</Text>
          <View style={styles.featuresLine} />
        </View>

        <View style={styles.featuresCard}>
          {HOME_FEATURES.map((item, index) => (
            <FeatureRow key={item.label} {...item} isLast={index === HOME_FEATURES.length - 1} />
          ))}
        </View>

        <PublicBmiCard
          onFindCoach={() => navigation.navigate('CoachList')}
          style={styles.bmiCard}
        />

        <SectionHeading title="Top Rated Coaches" icon="star" />

        {reviewsLoading ? (
          <View style={styles.coachLoaderBox}>
            <ActivityIndicator color={Colors.secondary} />
          </View>
        ) : coachesLoadError ? (
          <View style={styles.coachErrorBox}>
            <Text style={styles.coachErrorText}>{coachesLoadError}</Text>
            <TouchableOpacity
              style={styles.coachRetryBtn}
              onPress={() => void coachesQuery.refetch()}
              disabled={coachesQuery.isFetching}
              accessibilityRole="button"
              accessibilityLabel="Try again"
            >
              {coachesQuery.isFetching ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <Ionicons name="refresh" size={14} color={Colors.white} />
                  <Text style={styles.coachRetryText}>Try again</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : reviewCoaches.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.coachScroll}
            contentContainerStyle={styles.coachRow}
          >
            {reviewCoaches.map(coach => (
              <CoachTile key={coach.id} coach={coach} onPress={() => openCoach(coach)} />
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.emptyCoaches}>Coaches coming soon</Text>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, Spacing.xs) }]}>
        <TouchableOpacity style={styles.dashboardBtn} onPress={openDashboard}>
          <Ionicons name="grid" size={17} color={Colors.white} />
          <Text style={styles.dashboardBtnText} numberOfLines={1}>
            {signedIn ? 'Go to Dashboard' : 'Start as Coach'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.findCoachBtn}
          onPress={() => navigation.navigate('CoachList')}
        >
          <Ionicons name="search" size={17} color={Colors.white} />
          <Text style={styles.findCoachBtnText}>Find a Coach</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: BODY_PADDING,
    paddingBottom: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backBtn: { margin: 0 },
  backLabel: {
    color: Colors.white,
    fontFamily: FontFamily.semibold,
    fontSize: 15,
  },
  loginPill: {
    backgroundColor: Colors.white,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  loginPillText: {
    color: Colors.secondary,
    fontFamily: FontFamily.bold,
    fontSize: 13,
  },
  bodyScroll: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: BODY_PADDING,
    paddingTop: Spacing.sm,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    marginBottom: 12,
  },
  categoryCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  categoryIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  categoryLabel: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    color: Colors.textDark,
    textAlign: 'center',
    lineHeight: 13,
  },
  featuresHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  featuresLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  featuresHeading: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.secondary,
    letterSpacing: 1.2,
  },
  featuresCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    marginBottom: 12,
    ...Shadow.sm,
  },
  bmiCard: {
    marginBottom: 12,
  },
  featureRowWrap: {
    height: FEATURE_ROW_HEIGHT,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.background,
  },
  featureRowWrapLast: {
    borderBottomWidth: 0,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: {
    flex: 1,
    fontSize: 12,
    fontFamily: FontFamily.bold,
    color: Colors.textDark,
  },
  coachScroll: {
    marginBottom: 8,
  },
  coachRow: {
    flexDirection: 'row',
    gap: GRID_GAP,
    paddingRight: BODY_PADDING,
  },
  coachTile: {
    width: COACH_CARD_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    ...Shadow.sm,
  },
  coachPhotoWrap: {
    position: 'relative',
    marginBottom: 6,
  },
  ratingBadge: {
    position: 'absolute',
    right: -8,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.white,
    borderRadius: Radius.pill,
    paddingHorizontal: 5,
    paddingVertical: 2,
    ...Shadow.sm,
  },
  ratingText: {
    fontSize: 9,
    fontFamily: FontFamily.bold,
    color: Colors.textDark,
  },
  coachName: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    color: Colors.textDark,
    textAlign: 'center',
    width: '100%',
  },
  coachMeta: {
    fontSize: 9,
    fontFamily: FontFamily.medium,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 2,
    minHeight: 22,
    width: '100%',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
    maxWidth: '100%',
  },
  coachCity: {
    fontSize: 8,
    fontFamily: FontFamily.medium,
    color: Colors.textLight,
    flexShrink: 1,
  },
  emptyCoaches: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: FontFamily.medium,
    color: Colors.textLight,
    marginBottom: 8,
  },
  coachErrorBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    ...Shadow.sm,
  },
  coachErrorText: {
    textAlign: 'center',
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    lineHeight: 18,
  },
  coachRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  coachRetryText: {
    color: Colors.white,
    fontFamily: FontFamily.bold,
    fontSize: 13,
  },
  loaderBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  coachLoaderBox: {
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 10,
    backgroundColor: Colors.secondary,
    paddingHorizontal: BODY_PADDING,
    paddingTop: Spacing.sm,
    ...Shadow.lg,
  },
  dashboardBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: Radius.pill,
    paddingVertical: 13,
    paddingHorizontal: 10,
  },
  dashboardBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontFamily: FontFamily.bold,
  },
  findCoachBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
    borderRadius: Radius.pill,
    paddingVertical: 13,
    paddingHorizontal: 10,
  },
  findCoachBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontFamily: FontFamily.bold,
  },
});
