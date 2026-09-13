import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
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
  Typography,
  filterPillStyles,
  buttonStyles,
} from '../../constants/theme';
import { COACH_CATEGORIES as FALLBACK_CATEGORIES } from '../../data/homeContent';
import {
  RATING_FILTER_OPTIONS,
  SORT_OPTIONS,
  coachPublicMinRatingParam,
  coachPublicSortParam,
} from '../../data/coachDirectory';
import { getCoachCategories, getCoachPublicCities, getCoachPublicList } from '../../api/coachApi';
import { getClientList } from '../../api/clientApi';
import { MASTER_STALE_MS } from '../../api/queryClient';
import { queryKeys } from '../../api/queryKeys';
import { getCurrentCoachCode, isAuthenticated } from '../../auth/session';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useRefreshControl, refreshControlTheme } from '../../hooks/useRefreshControl';
import DropdownField from '../../components/DropdownField';
import CategoryIcon from '../../components/CategoryIcon';
import { HeaderBackButton } from '../../components/ScreenHeader';
import PersonAvatar from '../../components/PersonAvatar';
import SearchField from '../../components/SearchField';
import AppButton from '../../components/AppButton';
import EmptyState from '../../components/EmptyState';
import { getErrorMessage } from '../../api/client';
import ReloadState from '../../components/ReloadState';
import {
  formatExpertiseLabel,
  pluralizeCoaches,
  prepareCoachCardBio,
  visibleCoachTags,
} from '../../utils/coachDisplay';
import { resolvePublicClientCount, shouldShowPublicRating } from '../../utils/coachPublicStats';
import { resolveCoachPhotoUrl } from '../../utils/mediaUrl';
import type { RootScreenProps } from '../../types/navigation';

const ALL_CITIES = 'All cities';

export default function CoachListScreen({ navigation, route }: RootScreenProps<'CoachList'>) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(route.params?.categoryCode || '');
  const [city, setCity] = useState(ALL_CITIES);
  const [ratingFilter, setRatingFilter] = useState(RATING_FILTER_OPTIONS[0]);
  const [sort, setSort] = useState('Top Rated');
  const debouncedSearch = useDebouncedValue(search, 400);
  const myCoachCode = getCurrentCoachCode();

  const categoriesQuery = useQuery({
    queryKey: queryKeys.coachCategories,
    queryFn: getCoachCategories,
    staleTime: MASTER_STALE_MS,
  });
  const categories = categoriesQuery.data?.length ? categoriesQuery.data : FALLBACK_CATEGORIES;

  // Cities for the filter dropdown — dedicated endpoint (not a second full coach list).
  const citiesQuery = useQuery({
    queryKey: queryKeys.coachPublicCities({
      coachTypeCode: activeCategory || undefined,
    }),
    queryFn: ({ signal }) =>
      getCoachPublicCities({ coachTypeCode: activeCategory || undefined }, signal),
  });

  const myClientsQuery = useQuery({
    queryKey: queryKeys.clientList(myCoachCode),
    queryFn: () => getClientList(),
    enabled: isAuthenticated() && !!myCoachCode,
  });

  const cityOptions = useMemo(() => {
    const cities = citiesQuery.data ?? [];
    return [ALL_CITIES, ...cities];
  }, [citiesQuery.data]);

  // Keep selection valid when category shrinks the city list (no effect/setState).
  const resolvedCity = city === ALL_CITIES || cityOptions.includes(city) ? city : ALL_CITIES;

  const minRating = coachPublicMinRatingParam(ratingFilter);
  const sortBy = coachPublicSortParam(sort);

  const listParams = {
    coachTypeCode: activeCategory || undefined,
    search: debouncedSearch || undefined,
    city: resolvedCity !== ALL_CITIES ? resolvedCity : undefined,
    minRating,
    sortBy,
  };
  const coachesQuery = useQuery({
    // Normalized key shares Home's empty-filter public list cache.
    queryKey: queryKeys.coachPublicList(listParams),
    queryFn: ({ signal }) => getCoachPublicList(listParams, signal),
  });

  // Server applies minRating/sortBy; re-apply client-side so older API builds still filter correctly.
  const filtered = useMemo(() => {
    let list = coachesQuery.data?.coaches ?? [];
    if (ratingFilter === '4.0+') list = list.filter(c => c.rating >= 4);
    else if (ratingFilter === '3.0+') list = list.filter(c => c.rating >= 3);

    if (sort === 'Top Rated') list = [...list].sort((a, b) => b.rating - a.rating);
    else if (sort === 'Most Reviewed') list = [...list].sort((a, b) => b.reviews - a.reviews);
    else if (sort === 'Most Experience')
      list = [...list].sort((a, b) => b.experience - a.experience);
    return list;
  }, [coachesQuery.data, sort, ratingFilter]);

  const hasActiveFilters =
    !!activeCategory ||
    !!search.trim() ||
    resolvedCity !== ALL_CITIES ||
    ratingFilter !== RATING_FILTER_OPTIONS[0] ||
    sort !== 'Top Rated';

  const clearFilters = () => {
    setActiveCategory('');
    setSearch('');
    setCity(ALL_CITIES);
    setRatingFilter(RATING_FILTER_OPTIONS[0]!);
    setSort('Top Rated');
  };

  const errorMessage = coachesQuery.isError
    ? getErrorMessage(coachesQuery.error, 'Could not load coaches. Pull down to try again.')
    : null;
  const showLoadError = !!errorMessage && !coachesQuery.data;

  const refreshControl = useRefreshControl(coachesQuery);

  return (
    <View style={styles.container}>
      <View style={[styles.banner, { paddingTop: insets.top + Spacing.xs }]}>
        <View style={styles.bannerTop}>
          <HeaderBackButton onPress={() => navigation.goBack()} style={styles.bannerBack} />
          <Text style={styles.bannerTitle}>Find Your Coach</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsContent}
        >
          <TouchableOpacity
            style={[styles.pill, !activeCategory && styles.pillActive]}
            onPress={() => setActiveCategory('')}
            activeOpacity={PressOpacity.default}
            accessibilityRole="button"
            accessibilityState={{ selected: !activeCategory }}
          >
            <Ionicons
              name="grid-outline"
              size={IconSize.xs}
              color={!activeCategory ? Colors.white : Colors.onDarkMuted}
            />
            <Text style={[styles.pillText, !activeCategory && styles.pillTextActive]}>All</Text>
          </TouchableOpacity>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.code}
              style={[styles.pill, activeCategory === cat.code && styles.pillActive]}
              onPress={() => setActiveCategory(cat.code)}
              activeOpacity={PressOpacity.default}
              accessibilityRole="button"
              accessibilityState={{ selected: activeCategory === cat.code }}
            >
              <CategoryIcon
                category={cat}
                size={IconSize.xs}
                color={activeCategory === cat.code ? Colors.white : Colors.onDarkMuted}
              />
              <Text style={[styles.pillText, activeCategory === cat.code && styles.pillTextActive]}>
                {cat.short}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.toolbar}>
        <SearchField
          placeholder="Search name, city or specialty..."
          value={search}
          onChangeText={setSearch}
          accessibilityLabel="Search coaches"
        />
        <View style={styles.filterRow}>
          <DropdownField
            compact
            value={resolvedCity}
            options={cityOptions}
            onChange={setCity}
            placeholder="City"
          />
          <DropdownField
            compact
            value={ratingFilter}
            options={RATING_FILTER_OPTIONS}
            onChange={setRatingFilter}
          />
          <DropdownField compact value={sort} options={SORT_OPTIONS} onChange={setSort} />
        </View>
        {hasActiveFilters ? (
          <TouchableOpacity
            onPress={clearFilters}
            style={styles.clearBtn}
            accessibilityRole="button"
            accessibilityLabel="Clear filters"
            activeOpacity={PressOpacity.default}
          >
            <Ionicons name="close-circle-outline" size={IconSize.sm} color={Colors.primary} />
            <Text style={styles.clearText}>Clear filters</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={[
          styles.bodyContent,
          { paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshControl.refreshing}
            onRefresh={refreshControl.onRefresh}
            {...refreshControlTheme}
          />
        }
      >
        {/* Spinner only with no list yet — not on background refetch. */}
        {coachesQuery.isPending && !coachesQuery.data ? (
          <ActivityIndicator color={Colors.primary} style={styles.loader} />
        ) : showLoadError ? (
          <ReloadState
            title="Could not load coaches"
            message={errorMessage!}
            onRetry={() => void coachesQuery.refetch()}
            loading={coachesQuery.isFetching}
          />
        ) : (
          <>
            <View style={styles.resultRow}>
              <Text style={styles.resultText}>
                Showing <Text style={styles.resultBold}>{filtered.length}</Text>{' '}
                {pluralizeCoaches(filtered.length)}
              </Text>
            </View>

            {filtered.map(coach => {
              const photoUri = resolveCoachPhotoUrl(coach);
              const clientCount = resolvePublicClientCount({
                coachId: coach.id,
                marketingClients: coach.clients,
                viewerCoachCode: myCoachCode,
                liveRosterLength: myClientsQuery.data?.length,
              });
              const showRating = shouldShowPublicRating(coach.rating, coach.reviews);
              const cardBio = prepareCoachCardBio(coach.bio, coach.name, coach.tags);
              const { visible: visibleTags, remaining: hiddenTagCount } = visibleCoachTags(
                coach.tags,
              );

              return (
                <View key={coach.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <PersonAvatar uri={photoUri} size={42} style={styles.avatar} />
                    <View style={styles.cardHeaderInfo}>
                      <Text style={styles.coachName} numberOfLines={1}>
                        {coach.name}
                      </Text>
                      <Text style={styles.coachCategory} numberOfLines={1}>
                        {coach.category}
                      </Text>
                    </View>
                    {coach.online ? (
                      <View style={styles.onlineBadge}>
                        <View style={styles.onlineDot} />
                        <Text style={styles.onlineText}>Online</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.metaRow}>
                    {showRating ? (
                      <View style={styles.metaItem}>
                        <Ionicons name="star" size={IconSize.xs} color={Colors.accent} />
                        <Text style={styles.metaText}>
                          {coach.rating} ({coach.reviews})
                        </Text>
                      </View>
                    ) : null}
                    {coach.experience > 0 ? (
                      <View style={styles.metaItem}>
                        <Ionicons
                          name="briefcase-outline"
                          size={IconSize.xs}
                          color={Colors.textLight}
                        />
                        <Text style={styles.metaText}>{coach.experience} Yrs</Text>
                      </View>
                    ) : null}
                    {coach.city ? (
                      <View style={styles.metaItem}>
                        <Ionicons
                          name="location-outline"
                          size={IconSize.xs}
                          color={Colors.textLight}
                        />
                        <Text style={styles.metaText} numberOfLines={1}>
                          {coach.city}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {cardBio ? (
                    <Text style={styles.bio} numberOfLines={2}>
                      {cardBio}
                    </Text>
                  ) : null}

                  {visibleTags.length > 0 ? (
                    <View style={styles.tagsWrap}>
                      {visibleTags.map(tag => (
                        <View key={tag} style={styles.tag}>
                          <Text style={styles.tagText}>{formatExpertiseLabel(tag)}</Text>
                        </View>
                      ))}
                      {hiddenTagCount > 0 ? (
                        <View style={styles.tagMore}>
                          <Text style={styles.tagMoreText}>+{hiddenTagCount} more</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  <View style={styles.cardFooter}>
                    <AppButton
                      label="View Profile"
                      size="compact"
                      onPress={() =>
                        navigation.navigate('CoachPublicProfile', {
                          coach: {
                            ...coach,
                            clients: clientCount,
                          },
                          coachCode: coach.id,
                          coachCodes: filtered.map(c => c.id),
                          coaches: filtered.map(c =>
                            c.id === coach.id ? { ...c, clients: clientCount } : c,
                          ),
                        })
                      }
                      style={styles.viewBtn}
                    />
                  </View>
                </View>
              );
            })}

            {filtered.length === 0 ? (
              <EmptyState
                icon="search-outline"
                title="No coaches found"
                message={
                  hasActiveFilters
                    ? 'No coaches match these filters. Clear them or try another city or keyword.'
                    : 'No coaches match your search. Try another category or keyword.'
                }
                actionLabel={hasActiveFilters ? 'Clear filters' : undefined}
                onAction={hasActiveFilters ? clearFilters : undefined}
              />
            ) : null}
          </>
        )}

        <View style={styles.ctaCard}>
          <View style={styles.ctaIcon}>
            <Ionicons name="school-outline" size={IconSize.lg} color={Colors.white} />
          </View>
          <Text style={styles.ctaTitle}>Become a Coach</Text>
          <Text style={styles.ctaSubtitle}>
            List your profile and get enquiries from people searching for a coach.
          </Text>
          <AppButton
            label="Get Started Free"
            size="compact"
            icon="rocket-outline"
            iconPosition="left"
            onPress={() => navigation.navigate('Register')}
            style={styles.ctaBtn}
            textStyle={styles.ctaBtnText}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  banner: {
    backgroundColor: Colors.secondary,
    paddingBottom: Spacing.sm,
  },
  bannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  bannerBack: { marginBottom: 0 },
  bannerTitle: {
    flex: 1,
    ...Typography.headline,
    color: Colors.white,
  },
  pillsContent: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingBottom: 2,
  },
  pill: {
    ...filterPillStyles.base,
    ...filterPillStyles.onDark,
  },
  pillActive: filterPillStyles.onDarkActive,
  pillText: filterPillStyles.text,
  pillTextActive: filterPillStyles.textActive,
  toolbar: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    ...Shadow.sm,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
    flexWrap: 'wrap',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
    paddingVertical: 2,
  },
  clearText: {
    ...Typography.caption,
    color: Colors.primary,
    fontFamily: FontFamily.semibold,
  },
  body: { flex: 1 },
  bodyContent: { padding: Spacing.md },
  loader: { marginVertical: Spacing.lg - 4 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  resultText: { flex: 1, ...Typography.caption },
  resultBold: { fontFamily: FontFamily.extraBold, color: Colors.textDark },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  cardHeaderInfo: { flex: 1 },
  avatar: {
    marginRight: Spacing.xs,
  },
  coachName: { ...Typography.bodyStrong, fontFamily: FontFamily.bold, fontSize: 15 },
  coachCategory: {
    ...Typography.micro,
    color: Colors.secondary,
    fontFamily: FontFamily.semibold,
    marginTop: 1,
  },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.online },
  onlineText: { fontSize: 10, color: Colors.online, fontFamily: FontFamily.bold },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm - 2, marginBottom: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
  metaText: { ...Typography.micro, fontFamily: FontFamily.semibold },
  bio: {
    ...Typography.caption,
    lineHeight: 17,
    marginBottom: 6,
  },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: Spacing.xs },
  tag: {
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
  },
  tagText: { fontSize: 10, color: Colors.secondary, fontFamily: FontFamily.bold },
  tagMore: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
    backgroundColor: Colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  tagMoreText: { fontSize: 10, color: Colors.textLight, fontFamily: FontFamily.semibold },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingTop: Spacing.xs,
  },
  viewBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: Spacing.md,
  },
  ctaCard: {
    backgroundColor: Colors.secondary,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.xs,
    ...Shadow.md,
  },
  ctaIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm + 2,
    backgroundColor: Colors.onDarkOverlay,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm - 2,
  },
  ctaTitle: { color: Colors.white, fontSize: 16, fontFamily: FontFamily.extraBold },
  ctaSubtitle: {
    color: Colors.onDarkTextSoft,
    fontFamily: FontFamily.regular,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 17,
  },
  ctaBtn: {
    backgroundColor: Colors.accent,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg - 4,
    ...Shadow.sm,
  },
  ctaBtnText: buttonStyles.compactText,
});
