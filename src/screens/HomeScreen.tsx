import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Shadow, STORY_CARD_WIDTH } from '../constants/theme';
import { COACH_CATEGORIES as FALLBACK_CATEGORIES } from '../data/homeContent';
import { COACH_STORY_TEMPLATES } from '../data/coachSuccessStories';
import { getCoachCategories, getCoachPublicList } from '../api/coachApi';
import { MASTER_STALE_MS } from '../api/queryClient';
import { queryKeys } from '../api/queryKeys';
import { useAuthState } from '../auth/useAuthState';
import KeyboardSafeScroll from '../components/KeyboardSafeScroll';
import PublicBmiCard from '../components/PublicBmiCard';
import { resolveMediaUrl } from '../utils/mediaUrl';
import { shouldShowPublicRating } from '../utils/coachPublicStats';
import { nameInitials } from '../utils/initials';
import { refreshControlTheme } from '../hooks/useRefreshControl';
import type { RootScreenProps } from '../types/navigation';
import type { HomeStat } from '../data/homeContent';
import type { Coach } from '../types/models';

function SectionLoader() {
  return (
    <View style={styles.sectionLoader}>
      <ActivityIndicator color={Colors.secondary} />
    </View>
  );
}

function StoryCard({
  coach,
  badge,
  icon,
  quote,
  onPress,
}: {
  coach: Coach;
  badge: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  quote: string;
  onPress: () => void;
}) {
  const photoUri = resolveMediaUrl(coach.profilePicUrl);
  const showRating = shouldShowPublicRating(coach.rating, coach.reviews);
  const subtitle = [coach.category, coach.city].filter(Boolean).join(', ');

  return (
    <TouchableOpacity style={styles.storyCard} onPress={onPress} activeOpacity={0.85}>
      {showRating ? (
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map(i => (
            <Ionicons
              key={i}
              name={i <= Math.round(coach.rating) ? 'star' : 'star-outline'}
              size={12}
              color={Colors.accent}
            />
          ))}
          <Text style={styles.ratingText}>{coach.rating.toFixed(1)}</Text>
        </View>
      ) : null}
      <View style={styles.storyBadge}>
        <Ionicons name={icon} size={12} color={Colors.secondary} />
        <Text style={styles.storyBadgeText} numberOfLines={1}>
          {badge}
        </Text>
      </View>
      <Text style={styles.quoteMark}>&ldquo;</Text>
      <Text style={styles.storyQuote} numberOfLines={5}>
        {quote}
      </Text>
      <View style={styles.storyAuthor}>
        <View style={styles.storyAvatar}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.storyAvatarImage} />
          ) : (
            <Text style={styles.storyAvatarText}>{nameInitials(coach.name)}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.storyName} numberOfLines={1}>
            {coach.name}
          </Text>
          {subtitle ? (
            <Text style={styles.storyMeta} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
      </View>
    </TouchableOpacity>
  );
}

function ReviewCard({ coach, onPress }: { coach: Coach; onPress: () => void }) {
  const photoUri = resolveMediaUrl(coach.profilePicUrl);
  const showRating = shouldShowPublicRating(coach.rating, coach.reviews);

  return (
    <TouchableOpacity style={styles.reviewCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewAvatar}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.storyAvatarImage} />
          ) : (
            <Text style={styles.storyAvatarText}>{nameInitials(coach.name)}</Text>
          )}
        </View>
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
                size={14}
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
      {coach.bio ? (
        <Text style={styles.reviewBio} numberOfLines={3}>
          {coach.bio}
        </Text>
      ) : null}
      <View style={styles.reviewFooter}>
        {coach.clients > 0 ? (
          <Text style={styles.reviewClients}>
            Clients: <Text style={styles.reviewClientsBold}>{coach.clients}+</Text>
          </Text>
        ) : (
          <View />
        )}
        <Text style={styles.reviewLink}>View</Text>
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
  const storiesLoading = coachesLoading && !coachesQuery.data;
  const reviewsLoading = coachesLoading && !coachesQuery.data;

  const coachTotal = coachesQuery.data?.totalCount ?? coachesQuery.data?.coaches.length ?? 0;
  const avgRating = useMemo(() => {
    const rated = (coachesQuery.data?.coaches ?? []).filter(c => c.rating > 0);
    return rated.length ? rated.reduce((sum, c) => sum + c.rating, 0) / rated.length : null;
  }, [coachesQuery.data]);

  const storyItems = useMemo(() => {
    const all = coachesQuery.data?.coaches ?? [];
    // Offset past the top of the list so stories don't mirror the reviews strip.
    const coaches = all.length > 6 ? all.slice(6) : all;
    const n = Math.min(coaches.length, COACH_STORY_TEMPLATES.length);
    return Array.from({ length: n }, (_, i) => ({
      coach: coaches[i],
      template: COACH_STORY_TEMPLATES[i],
    }));
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
      keyboardPadding={120}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...refreshControlTheme} />
      }
    >
      <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        {!signedIn ? (
          <TouchableOpacity
            style={[styles.loginLink, { top: insets.top + 12 }]}
            onPress={() => navigation.navigate('Login')}
            accessibilityRole="button"
            accessibilityLabel="Log In"
          >
            <Text style={styles.loginLinkText}>Log In</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.logoBox}>
          <Ionicons name="fitness" size={30} color={Colors.white} />
        </View>
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>Health coaching platform</Text>
        </View>
        <Text style={styles.heroTitle}>
          Grow Your{'\n'}Health Coaching{'\n'}
          <Text style={styles.heroTitleItalic}>Business</Text>
        </Text>
        <Text style={styles.heroSubtitle}>
          Manage clients, track progress and build your coaching brand, all in one powerful
          platform.
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
          Whether it&apos;s weight loss, strength, yoga or dance, find the right coach type.
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

      {storiesLoading || storyItems.length > 0 ? (
        <View style={styles.storiesSection}>
          <View style={styles.sectionTag}>
            <Ionicons name="chatbubble-ellipses-outline" size={12} color={Colors.secondary} />
            <Text style={styles.sectionTagText}>Coach Stories</Text>
          </View>
          <Text style={styles.sectionTitle}>What Our Coaches Say</Text>
          <Text style={styles.sectionSubtitle}>
            Real coaches, real growth: how Mera Coach helped them reach more clients.
          </Text>

          {storiesLoading ? (
            <SectionLoader />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carousel}
              decelerationRate="fast"
              snapToInterval={STORY_CARD_WIDTH + 12}
            >
              {storyItems.map(({ coach, template }) => (
                <StoryCard
                  key={coach.id}
                  coach={coach}
                  badge={template.badge}
                  icon={template.icon}
                  quote={template.quote}
                  onPress={() =>
                    openCoach(
                      coach,
                      storyItems.map(s => s.coach),
                    )
                  }
                />
              ))}
            </ScrollView>
          )}
        </View>
      ) : null}

      {reviewsLoading || reviewCoaches.length > 0 ? (
        <View style={styles.reviewsSection}>
          <View style={styles.sectionTag}>
            <Ionicons name="star-outline" size={12} color={Colors.secondary} />
            <Text style={styles.sectionTagText}>Reviews</Text>
          </View>
          <Text style={styles.sectionTitle}>Top Rated Coaches</Text>
          <Text style={styles.sectionSubtitle}>
            See ratings and reviews from coaches building their practice on Mera Coach.
          </Text>

          {reviewsLoading ? (
            <SectionLoader />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carousel}
              decelerationRate="fast"
              snapToInterval={STORY_CARD_WIDTH + 12}
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
            <Text style={styles.joinTitle}>Ready to grow your practice?</Text>
            <TouchableOpacity
              style={styles.joinBtn}
              onPress={() => navigation.navigate('Register')}
            >
              <Ionicons name="person-add" size={18} color={Colors.white} />
              <Text style={styles.joinBtnText}>Join Free as a Coach</Text>
            </TouchableOpacity>
          </>
        )}
        <Text style={styles.footer}>MeraCoach © 2024 · Wellness Platform</Text>
      </View>
    </KeyboardSafeScroll>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: {
    backgroundColor: Colors.secondary,
    paddingBottom: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  loginLink: { position: 'absolute', right: 20, padding: 8 },
  loginLinkText: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  logoBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(201,136,42,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(201,136,42,0.35)',
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 18,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent },
  badgeText: { color: Colors.accent, fontSize: 11, fontWeight: '700' },
  heroTitle: {
    color: Colors.white,
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 36,
  },
  heroTitleItalic: { color: Colors.accent, fontStyle: 'italic' },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  ctaRow: { flexDirection: 'row', gap: 10, marginTop: 24, width: '100%' },
  ctaPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: Radius.pill,
    paddingVertical: 13,
    ...Shadow.md,
  },
  ctaPrimaryText: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  ctaSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: Radius.pill,
    paddingVertical: 13,
  },
  ctaSecondaryText: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    marginHorizontal: 20,
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
  statValue: { fontSize: 17, fontWeight: '800', color: Colors.secondary },
  statLabel: { fontSize: 10, color: Colors.textLight, marginTop: 2, textAlign: 'center' },
  categoriesSection: { padding: 20, paddingTop: 36 },
  sectionTag: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 10,
  },
  sectionTagText: { color: Colors.secondary, fontSize: 11, fontWeight: '700' },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: Colors.textDark, textAlign: 'center' },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  sectionLoader: { paddingVertical: 28, alignItems: 'center' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 20 },
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
  categoryLabel: { fontSize: 12, fontWeight: '700', color: Colors.textDark },
  storiesSection: { paddingTop: 28, paddingBottom: 8 },
  reviewsSection: { paddingTop: 28, paddingBottom: 8 },
  carousel: { paddingHorizontal: 20, paddingTop: 18, gap: 12 },
  storyCard: {
    width: STORY_CARD_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 16,
    ...Shadow.sm,
  },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 8 },
  ratingText: { marginLeft: 6, fontSize: 12, fontWeight: '700', color: Colors.textDark },
  storyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
    maxWidth: '100%',
  },
  storyBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.secondary, flexShrink: 1 },
  quoteMark: {
    fontSize: 36,
    lineHeight: 36,
    color: Colors.accent,
    fontWeight: '800',
    opacity: 0.5,
  },
  storyQuote: { fontSize: 13, color: Colors.textDark, lineHeight: 19, marginBottom: 14 },
  storyAuthor: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  storyAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  storyAvatarImage: { width: '100%', height: '100%' },
  storyAvatarText: { fontSize: 12, fontWeight: '800', color: Colors.secondary },
  storyName: { fontSize: 13, fontWeight: '700', color: Colors.textDark },
  storyMeta: { fontSize: 11, color: Colors.textLight, marginTop: 1 },
  reviewCard: {
    width: STORY_CARD_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 16,
    ...Shadow.sm,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  reviewAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  reviewRatingBlock: { marginBottom: 10 },
  reviewScore: { fontSize: 14, fontWeight: '800', color: Colors.textDark, marginTop: 4 },
  reviewCount: { fontSize: 12, fontWeight: '600', color: Colors.textLight },
  reviewFallback: { fontSize: 12, color: Colors.textLight, marginBottom: 10 },
  reviewBio: { fontSize: 12, color: Colors.textLight, lineHeight: 17, marginBottom: 12 },
  reviewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewClients: { fontSize: 12, color: Colors.textLight },
  reviewClientsBold: { fontWeight: '800', color: Colors.secondary },
  reviewLink: { fontSize: 13, fontWeight: '700', color: Colors.accent },
  seeAllBtn: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  seeAllText: { fontSize: 13, fontWeight: '700', color: Colors.secondary },
  joinSection: { alignItems: 'center', padding: 24, paddingTop: 16 },
  joinTitle: { fontSize: 15, fontWeight: '700', color: Colors.textDark, marginBottom: 14 },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 28,
    ...Shadow.sm,
  },
  joinBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  footer: { color: Colors.textLight, fontSize: 11, marginTop: 20 },
});
