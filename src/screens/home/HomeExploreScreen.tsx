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
import {
  Colors,
  FontFamily,
  IconSize,
  PressOpacity,
  Radius,
  Shadow,
  Spacing,
  TouchTarget,
  Typography,
  buttonStyles,
} from '../../constants/theme';
import { COACH_CATEGORIES as FALLBACK_CATEGORIES } from '../../data/homeContent';
import { HOME_FEATURES } from '../../data/homeExploreContent';
import { getCoachCategories, getCoachPublicList } from '../../api/coachApi';
import { MASTER_STALE_MS } from '../../api/queryClient';
import { queryKeys } from '../../api/queryKeys';
import { useAuthState } from '../../auth/useAuthState';
import { BrandImages } from '../../constants/images';
import PersonAvatar from '../../components/PersonAvatar';
import CategoryIcon from '../../components/CategoryIcon';
import EmptyState from '../../components/EmptyState';
import PublicBmiCard from '../../components/home/PublicBmiCard';
import SectionHeading from '../../components/home/SectionHeading';
import { HeaderBackButton } from '../../components/ScreenHeader';
import ReloadState from '../../components/ReloadState';
import { resolveCoachPhotoUrl } from '../../utils/mediaUrl';
import { shouldShowPublicRating } from '../../utils/coachPublicStats';
import { getErrorMessage } from '../../api/client';
import type { RootScreenProps } from '../../types/navigation';
import type { Coach } from '../../types/models';

const BODY_PADDING = Spacing.md;
const GRID_GAP = Spacing.sm - 2;
const CATEGORY_COLUMNS = 2;
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
    <View
      style={[styles.featureRow, !isLast && styles.featureRowSpaced]}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <View style={[styles.featureIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={15} color={color} />
      </View>
      <Text style={styles.featureLabel} numberOfLines={1}>
        {label}
      </Text>
      <Ionicons name="checkmark" size={14} color={Colors.secondaryDark} />
    </View>
  );
}

function CoachTile({ coach, onPress }: { coach: Coach; onPress: () => void }) {
  const photoUri = resolveCoachPhotoUrl(coach);
  const showRating = shouldShowPublicRating(coach.rating, coach.reviews);

  return (
    <TouchableOpacity
      style={styles.coachTile}
      onPress={onPress}
      activeOpacity={PressOpacity.default}
      accessibilityRole="button"
      accessibilityLabel={`View ${coach.name}`}
    >
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
  const categoryCardWidth = (contentWidth - GRID_GAP) / CATEGORY_COLUMNS;
  const categoryCardHeight = compact ? 80 : 88;
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
  // Prefer full Master list; offline seed only when API has not returned items yet.
  const categories = apiCategories?.length ? apiCategories : FALLBACK_CATEGORIES;
  const categoryRows = Math.max(1, Math.ceil(categories.length / CATEGORY_COLUMNS));
  const categoryGridHeight =
    categoryRows * categoryCardHeight + Math.max(0, categoryRows - 1) * GRID_GAP;
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

  // Prefer marketing Home so Back and Dashboard stay distinct when arriving from Main.
  const goBack = () => {
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
              activeOpacity={PressOpacity.default}
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
              activeOpacity={PressOpacity.default}
              accessibilityRole="button"
              accessibilityLabel="Log In"
            >
              <Text style={styles.loginPillText}>Log In</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.loginPill}
              onPress={() => navigation.navigate('Main')}
              activeOpacity={PressOpacity.default}
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
                activeOpacity={PressOpacity.default}
                accessibilityRole="button"
                accessibilityLabel={cat.label}
              >
                <View style={[styles.categoryIcon, { backgroundColor: cat.bg }]}>
                  <CategoryIcon
                    category={cat}
                    size={compact ? IconSize.md : IconSize.lg}
                    color={cat.color}
                  />
                </View>
                <Text style={styles.categoryLabel} numberOfLines={2}>
                  {cat.label}
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
          <ReloadState
            title="Could not load coaches"
            message={coachesLoadError}
            onRetry={() => void coachesQuery.refetch()}
            loading={coachesQuery.isFetching}
            style={styles.coachErrorBox}
          />
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
          <EmptyState
            illustration={BrandImages.emptyLeads}
            icon="people-outline"
            title="Coaches coming soon"
            message="Featured coaches will appear here as more profiles go live."
            style={styles.emptyCoachesBox}
          />
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, Spacing.xs) }]}>
        <TouchableOpacity
          style={styles.dashboardBtn}
          onPress={openDashboard}
          activeOpacity={PressOpacity.default}
          accessibilityRole="button"
          accessibilityLabel={signedIn ? 'Go to Dashboard' : 'Start as Coach'}
        >
          <Ionicons name="grid" size={IconSize.md} color={Colors.white} />
          <Text style={styles.dashboardBtnText} numberOfLines={1}>
            {signedIn ? 'Go to Dashboard' : 'Start as Coach'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.findCoachBtn}
          onPress={() => navigation.navigate('CoachList')}
          activeOpacity={PressOpacity.default}
          accessibilityRole="button"
          accessibilityLabel="Find a Coach"
        >
          <Ionicons name="search" size={IconSize.md} color={Colors.white} />
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
    gap: Spacing.xxs,
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
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    minHeight: TouchTarget.min,
    justifyContent: 'center',
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
    marginBottom: Spacing.sm,
  },
  categoryCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    paddingVertical: Spacing.xs,
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
    gap: Spacing.sm - 2,
    marginBottom: Spacing.xs,
  },
  featuresLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
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
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  bmiCard: {
    marginBottom: Spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm - 2,
    minHeight: FEATURE_ROW_HEIGHT,
  },
  featureRowSpaced: {
    marginBottom: Spacing.xs,
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
    ...Typography.caption,
    fontFamily: FontFamily.semibold,
    color: Colors.textDark,
  },
  coachScroll: {
    marginBottom: Spacing.xs,
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
    paddingVertical: Spacing.sm - 2,
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
  emptyCoachesBox: {
    flex: 0,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  coachErrorBox: {
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  loaderBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  coachLoaderBox: {
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: Spacing.sm - 2,
    backgroundColor: Colors.secondary,
    paddingHorizontal: BODY_PADDING,
    paddingTop: Spacing.sm,
    ...Shadow.lg,
  },
  dashboardBtn: {
    flex: 1,
    ...buttonStyles.compact,
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.sm + 1,
    minHeight: 44,
  },
  dashboardBtnText: {
    ...buttonStyles.compactText,
  },
  findCoachBtn: {
    flex: 1,
    ...buttonStyles.compactGhost,
    borderWidth: 1.5,
    borderColor: Colors.onDarkBorderStrong,
    paddingVertical: Spacing.sm + 1,
    minHeight: 44,
  },
  findCoachBtnText: {
    ...buttonStyles.compactText,
  },
});
