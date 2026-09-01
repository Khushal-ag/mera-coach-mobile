import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ImageBackground,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontFamily, Radius, Shadow, Spacing, storyCardWidth } from '../constants/theme';
import { BrandImages } from '../constants/images';
import { COACH_CATEGORIES as FALLBACK_CATEGORIES } from '../data/homeContent';
import { PLATFORM_BENEFITS } from '../data/coachSuccessStories';
import { getCoachCategories, getCoachPublicList } from '../api/coachApi';
import { MASTER_STALE_MS } from '../api/queryClient';
import { queryKeys } from '../api/queryKeys';
import { useAuthState } from '../auth/useAuthState';
import BrandLogo from '../components/BrandLogo';
import KeyboardSafeScroll from '../components/KeyboardSafeScroll';
import PersonAvatar from '../components/PersonAvatar';
import PublicBmiCard from '../components/PublicBmiCard';
import { resolveMediaUrl } from '../utils/mediaUrl';
import { shouldShowPublicRating } from '../utils/coachPublicStats';
import { prepareCoachCardBio } from '../utils/coachDisplay';
import { refreshControlTheme } from '../hooks/useRefreshControl';
import type { RootScreenProps } from '../types/navigation';
import type { Coach } from '../types/models';
import type { PlatformBenefit } from '../data/coachSuccessStories';

const CARD_WIDTH = storyCardWidth(Dimensions.get('window').width);

interface HomeStat {
  value: string;
  label: string;
}

function SectionLoader() {
  return (
    <View style={styles.sectionLoader}>
      <ActivityIndicator color={Colors.secondary} />
    </View>
  );
}

function BenefitCard({ item }: { item: PlatformBenefit }) {
  return (
    <View style={styles.storyCard}>
      <View style={styles.storyBadge}>
        <Ionicons name={item.icon} size={12} color={Colors.secondary} />
        <Text style={styles.storyBadgeText} numberOfLines={1}>
          {item.badge}
        </Text>
      </View>
      <Text style={styles.storyTitle}>{item.title}</Text>
      <Text style={styles.storyQuote} numberOfLines={5}>
        {item.body}
      </Text>
    </View>
  );
}

function ReviewCard({ coach, onPress }: { coach: Coach; onPress: () => void }) {
  const photoUri = resolveMediaUrl(coach.profilePicUrl);
  const showRating = shouldShowPublicRating(coach.rating, coach.reviews);
  const cardBio = prepareCoachCardBio(coach.bio, coach.name, coach.tags);

  return (
    <TouchableOpacity style={styles.reviewCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.reviewHeader}>
        <PersonAvatar uri={photoUri} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={styles.storyName} numberOfLines={1}>
            {coach.name}
          </Text>
          <Text style={styles.storyMeta} numberOfLines={1}>
            {coach.category}
          </Text>
        </View>
      </View>
      {showRating ? (
        <View style={styles.reviewRatingBlock}>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(i => (
              <Ionicons
                key={i}
                name={i <= Math.round(coach.rating) ? 'star' : 'star-outline'}
                size={13}
                color={Colors.accent}
              />
            ))}
          </View>
          <Text style={styles.reviewScore}>
            {coach.rating.toFixed(1)}{' '}
            <Text style={styles.reviewCount}>({coach.reviews} reviews)</Text>
          </Text>
        </View>
      ) : (
        <Text style={styles.reviewFallback}>View profile for ratings</Text>
      )}
      {cardBio ? (
        <Text style={styles.reviewBio} numberOfLines={2}>
          {cardBio}
        </Text>
      ) : null}
      <View style={styles.reviewFooter}>
        <Text style={styles.reviewLink}>View profile</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }: RootScreenProps<'Home'>) {
  const insets = useSafeAreaInsets();
  const signedIn = useAuthState() === 'signedIn';
  const [refreshing, setRefreshing] = useState(false);

  const categoriesQuery = useQuery({
    queryKey: queryKeys.coachCategories,
    queryFn: getCoachCategories,
    staleTime: MASTER_STALE_MS,
  });
  // Single public-list fetch (page 1, default pageSize 50) — stories reuse a mid-slice.
  // Empty params normalize to the same key as CoachList with no filters.
  const coachesQuery = useQuery({
    queryKey: queryKeys.coachPublicList(),
    queryFn: () => getCoachPublicList(),
  });

  const apiCategories = categoriesQuery.data;
  const categories = apiCategories?.length ? apiCategories : FALLBACK_CATEGORIES;
  const categoriesLoading = categoriesQuery.isPending && !apiCategories;
  const coachesLoading = coachesQuery.isPending;
  const reviewsLoading = coachesLoading && !coachesQuery.data;

  const coachTotal = coachesQuery.data?.totalCount ?? coachesQuery.data?.coaches.length ?? 0;
  const avgRating = useMemo(() => {
    const rated = (coachesQuery.data?.coaches ?? []).filter(c => c.rating > 0);
    return rated.length ? rated.reduce((sum, c) => sum + c.rating, 0) / rated.length : null;
  }, [coachesQuery.data]);

  const reviewCoaches = useMemo(() => {
    const list = coachesQuery.data?.coaches ?? [];
    const withRatings = list.filter(c => shouldShowPublicRating(c.rating, c.reviews));
    const source = withRatings.length ? withRatings : list;
    return [...source].sort((a, b) => b.rating - a.rating || b.reviews - a.reviews).slice(0, 8);
  }, [coachesQuery.data]);

  const openCoach = (coach: Coach, list: Coach[]) => {
    navigation.navigate('CoachPublicProfile', {
      coach,
      coachCode: coach.id,
      coachCodes: list.map(c => c.id),
      coaches: list,
    });
  };

  // Wait until coaches finish so we never flash a lone "Categories" pill.
  const statsReady = !coachesLoading;
  const stats: HomeStat[] = statsReady
    ? [
        { value: String(coachTotal), label: 'Coaches' },
        categories.length > 0 ? { value: String(categories.length), label: 'Categories' } : null,
        avgRating != null ? { value: `${avgRating.toFixed(1)}/5`, label: 'Avg. Rating' } : null,
      ].filter((s): s is HomeStat => s != null)
    : [];
  // Hide a lonely single metric — looks broken in the strip.
  const showStats = statsReady && stats.length >= 2;

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([categoriesQuery.refetch(), coachesQuery.refetch()]).finally(() =>
      setRefreshing(false),
    );
  };

  return (
    <KeyboardSafeScroll
      style={styles.container}
      keyboardPadding={Spacing.lg}
      withAvoidingView={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...refreshControlTheme} />
      }
    >
      <ImageBackground
        source={BrandImages.hero}
        style={[styles.hero, { paddingTop: insets.top + Spacing.xs }]}
        imageStyle={styles.heroImage}
        resizeMode="cover"
      >
        <View style={styles.heroScrim} />

        {!signedIn ? (
          <TouchableOpacity
            style={[styles.loginLink, { top: insets.top + Spacing.xs }]}
            onPress={() => navigation.navigate('Login')}
            accessibilityRole="button"
            accessibilityLabel="Log In"
          >
            <Text style={styles.loginLinkText}>Log In</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.heroInner}>
          <BrandLogo size={48} variant="onDark" style={styles.logo} />
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>For wellness coaches</Text>
          </View>
          <Text style={styles.heroTitle}>
            For health and{'\n'}
            <Text style={styles.heroTitleItalic}>wellness coaches</Text>
          </Text>
          <Text style={styles.heroSubtitle}>
            Manage clients, track progress, and stay on top of checkups from your phone.
          </Text>

          <View style={styles.ctaRow}>
            <TouchableOpacity
              style={styles.ctaPrimary}
              onPress={() =>
                signedIn ? navigation.navigate('Main') : navigation.navigate('Register')
              }
            >
              <Ionicons name={signedIn ? 'grid' : 'person'} size={16} color={Colors.white} />
              <Text style={styles.ctaPrimaryText}>
                {signedIn ? 'Go to Dashboard' : 'Start as a Coach'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ctaSecondary}
              onPress={() => navigation.navigate('CoachList')}
            >
              <Ionicons name="search" size={16} color={Colors.white} />
              <Text style={styles.ctaSecondaryText}>Find a Coach</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>

      {!statsReady ? (
        <View style={[styles.statsStrip, styles.statsStripLoading]}>
          <ActivityIndicator color={Colors.secondary} />
        </View>
      ) : showStats ? (
        <View style={styles.statsStrip}>
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
      ) : null}

      <View style={styles.categoriesSection}>
        <View style={styles.sectionTag}>
          <Ionicons name="grid-outline" size={12} color={Colors.secondary} />
          <Text style={styles.sectionTagText}>Explore Categories</Text>
        </View>
        <Text style={styles.sectionTitle}>Coaching for Every Goal</Text>
        <Text style={styles.sectionSubtitle}>
          Weight loss, strength, yoga, or dance. Find a coach who fits your goal.
        </Text>

        {categoriesLoading ? (
          <SectionLoader />
        ) : categories.length === 0 ? null : (
          <View style={styles.categoryGrid}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.code}
                style={styles.categoryCard}
                onPress={() => navigation.navigate('CoachList', { categoryCode: cat.code })}
              >
                <View style={[styles.categoryIcon, { backgroundColor: cat.bg }]}>
                  <Ionicons name={cat.icon} size={20} color={cat.color} />
                </View>
                <Text style={styles.categoryLabel} numberOfLines={2}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <PublicBmiCard onFindCoach={() => navigation.navigate('CoachList')} />

      <View style={styles.storiesSection}>
        <View style={styles.sectionTag}>
          <Ionicons name="leaf-outline" size={12} color={Colors.secondary} />
          <Text style={styles.sectionTagText}>Why coaches join</Text>
        </View>
        <Text style={styles.sectionTitle}>How Mera Coach Helps</Text>
        <Text style={styles.sectionSubtitle}>
          What coaches get when they join, and what clients can browse.
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
          decelerationRate="fast"
          snapToInterval={CARD_WIDTH + Spacing.sm}
        >
          {PLATFORM_BENEFITS.map(item => (
            <BenefitCard key={item.badge} item={item} />
          ))}
        </ScrollView>
      </View>

      {reviewsLoading || reviewCoaches.length > 0 ? (
        <View style={styles.reviewsSection}>
          <View style={styles.sectionTag}>
            <Ionicons name="star-outline" size={12} color={Colors.secondary} />
            <Text style={styles.sectionTagText}>Reviews</Text>
          </View>
          <Text style={styles.sectionTitle}>Top Rated Coaches</Text>
          <Text style={styles.sectionSubtitle}>Ratings from coaches listed on Mera Coach.</Text>

          {reviewsLoading ? (
            <SectionLoader />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carousel}
              decelerationRate="fast"
              snapToInterval={CARD_WIDTH + Spacing.sm}
            >
              {reviewCoaches.map(coach => (
                <ReviewCard
                  key={coach.id}
                  coach={coach}
                  onPress={() => openCoach(coach, reviewCoaches)}
                />
              ))}
            </ScrollView>
          )}

          {!reviewsLoading ? (
            <TouchableOpacity
              style={styles.seeAllBtn}
              onPress={() => navigation.navigate('CoachList')}
            >
              <Text style={styles.seeAllText}>Browse All Coaches</Text>
              <Ionicons name="arrow-forward" size={14} color={Colors.secondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      <View style={styles.joinSection}>
        {signedIn ? (
          <>
            <Text style={styles.joinTitle}>Back to your coaching workspace?</Text>
            <TouchableOpacity style={styles.joinBtn} onPress={() => navigation.navigate('Main')}>
              <Ionicons name="grid" size={18} color={Colors.white} />
              <Text style={styles.joinBtnText}>Open Dashboard</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.joinTitle}>Want to list your coaching?</Text>
            <TouchableOpacity
              style={styles.joinBtn}
              onPress={() => navigation.navigate('Register')}
            >
              <Ionicons name="person-add" size={18} color={Colors.white} />
              <Text style={styles.joinBtnText}>Join Free as a Coach</Text>
            </TouchableOpacity>
          </>
        )}
        <View style={styles.brandLockup}>
          <BrandLogo size={40} variant="onLight" />
          <Text style={styles.footer}>Mera Coach © 2026 · Health & wellness coaching</Text>
        </View>
      </View>
    </KeyboardSafeScroll>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: {
    overflow: 'hidden',
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  heroImage: { resizeMode: 'cover' },
  heroScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.heroScrim,
  },
  heroInner: { alignItems: 'center', zIndex: 1 },
  loginLink: { position: 'absolute', right: Spacing.lg, padding: Spacing.xs, zIndex: 2 },
  loginLinkText: {
    color: Colors.white,
    fontSize: 13,
    fontFamily: FontFamily.bold,
  },
  logo: { marginBottom: Spacing.xs },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(201,136,42,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(201,136,42,0.35)',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    marginBottom: Spacing.sm,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent },
  badgeText: { color: Colors.accent, fontSize: 11, fontFamily: FontFamily.bold },
  heroTitle: {
    color: Colors.white,
    fontFamily: FontFamily.extraBold,
    fontSize: 26,
    textAlign: 'center',
    lineHeight: 32,
  },
  heroTitleItalic: {
    color: Colors.accent,
    fontFamily: FontFamily.displayItalic,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: FontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 19,
    paddingHorizontal: Spacing.xs,
  },
  ctaRow: { flexDirection: 'row', gap: 10, marginTop: Spacing.sm, width: '100%' },
  ctaPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.accent,
    borderRadius: Radius.pill,
    paddingVertical: 13,
    ...Shadow.md,
  },
  ctaPrimaryText: { color: Colors.white, fontSize: 13, fontFamily: FontFamily.bold },
  ctaSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: Radius.pill,
    paddingVertical: 13,
  },
  ctaSecondaryText: { color: Colors.white, fontSize: 13, fontFamily: FontFamily.bold },
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginTop: -22,
    borderRadius: Radius.lg,
    paddingVertical: 18,
    ...Shadow.lg,
  },
  statsStripLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 72,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: Colors.border },
  statValue: { fontSize: 17, fontFamily: FontFamily.extraBold, color: Colors.secondary },
  statLabel: {
    fontSize: 10,
    fontFamily: FontFamily.medium,
    color: Colors.textLight,
    marginTop: 2,
    textAlign: 'center',
  },
  categoriesSection: { padding: Spacing.lg, paddingTop: Spacing.lg },
  sectionTag: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    marginBottom: 10,
  },
  sectionTagText: { color: Colors.secondary, fontSize: 11, fontFamily: FontFamily.bold },
  sectionTitle: {
    fontSize: 20,
    fontFamily: FontFamily.extraBold,
    color: Colors.textDark,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  sectionLoader: { paddingVertical: 28, alignItems: 'center' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: 20 },
  categoryCard: {
    width: '47%',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 14,
    ...Shadow.sm,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  categoryLabel: { fontSize: 12, fontFamily: FontFamily.bold, color: Colors.textDark },
  storiesSection: { paddingTop: 28, paddingBottom: Spacing.xs },
  reviewsSection: { paddingTop: 28, paddingBottom: Spacing.xs },
  carousel: { paddingHorizontal: Spacing.lg, paddingTop: 18, gap: Spacing.sm },
  storyCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: Spacing.xs },
  storyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: Spacing.xs,
    maxWidth: '100%',
  },
  storyBadgeText: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    color: Colors.secondary,
    flexShrink: 1,
  },
  storyTitle: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    color: Colors.textDark,
    marginBottom: Spacing.xs,
    lineHeight: 20,
  },
  storyQuote: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.textDark,
    lineHeight: 19,
  },
  storyName: { fontSize: 13, fontFamily: FontFamily.bold, color: Colors.textDark },
  storyMeta: { fontSize: 11, fontFamily: FontFamily.medium, color: Colors.textLight, marginTop: 1 },
  reviewCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: Spacing.sm },
  reviewRatingBlock: { marginBottom: 10 },
  reviewScore: {
    fontSize: 14,
    fontFamily: FontFamily.extraBold,
    color: Colors.textDark,
    marginTop: 4,
  },
  reviewCount: { fontSize: 12, fontFamily: FontFamily.semibold, color: Colors.textLight },
  reviewFallback: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    marginBottom: 10,
  },
  reviewBio: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    lineHeight: 17,
    marginBottom: Spacing.sm,
  },
  reviewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: Colors.background,
    paddingTop: Spacing.xs,
  },
  reviewLink: { fontSize: 13, fontFamily: FontFamily.bold, color: Colors.accent },
  seeAllBtn: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: 14,
  },
  seeAllText: { fontSize: 13, fontFamily: FontFamily.bold, color: Colors.secondary },
  joinSection: {
    alignItems: 'center',
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    backgroundColor: Colors.backgroundTan,
    marginTop: Spacing.md,
  },
  joinTitle: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    color: Colors.textDark,
    marginBottom: 14,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 28,
    ...Shadow.sm,
  },
  joinBtnText: { color: Colors.white, fontFamily: FontFamily.bold, fontSize: 14 },
  brandLockup: { alignItems: 'center', marginTop: Spacing.lg, gap: Spacing.sm },
  footer: {
    color: Colors.textLight,
    fontSize: 11,
    fontFamily: FontFamily.medium,
    textAlign: 'center',
  },
});
