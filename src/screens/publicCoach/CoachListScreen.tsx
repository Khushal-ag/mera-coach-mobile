import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Modal,
  useWindowDimensions,
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
  Shadow,
  Spacing,
  Typography,
  headingFont,
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
import { useAuthState } from '../../auth/useAuthState';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useQueriesRefreshControl, refreshControlTheme } from '../../hooks/useRefreshControl';
import CategoryIcon from '../../components/CategoryIcon';
import ListPager from '../../components/ListPager';
import PersonAvatar from '../../components/PersonAvatar';
import SearchField from '../../components/SearchField';
import EmptyState from '../../components/EmptyState';
import { getErrorMessage } from '../../api/client';
import ReloadState from '../../components/ReloadState';
import WaveScreenHeader from '../../components/WaveScreenHeader';
import {
  formatExpertiseLabel,
  pluralizeCoaches,
  prepareCoachCardBio,
  visibleCoachTags,
} from '../../utils/coachDisplay';
import { resolvePublicClientCount, shouldShowPublicRating } from '../../utils/coachPublicStats';
import { resolveCoachPhotoUrl } from '../../utils/mediaUrl';
import type { RootScreenProps } from '../../types/navigation';
import type { Coach } from '../../types/models';
import type { IoniconName } from '../../types/icons';

const ALL_CITIES = 'All Cities';
const PAGE_SIZE = 5;
const TOP_RATED_LIMIT = 6;

type PickerKind = 'city' | 'rating' | 'sort' | 'category' | null;

function FilterControl({
  icon,
  label,
  value,
  onPress,
}: {
  icon: IoniconName;
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.filterControl}
      onPress={onPress}
      activeOpacity={PressOpacity.default}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
    >
      <Ionicons name={icon} size={IconSize.md} color={Colors.secondary} />
      <View style={styles.filterControlText}>
        <Text style={styles.filterLabel}>{label}</Text>
        <Text style={styles.filterValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Ionicons name="chevron-down" size={IconSize.sm} color={Colors.textLight} />
    </TouchableOpacity>
  );
}

function CoachResultCard({
  coach,
  photoUri,
  clientCount,
  coachCodes,
  coaches,
  onViewProfile,
}: {
  coach: Coach;
  photoUri?: string;
  clientCount: number;
  coachCodes: string[];
  coaches: Coach[];
  onViewProfile: (coach: Coach, clientCount: number, coachCodes: string[], coaches: Coach[]) => void;
}) {
  const showRating = shouldShowPublicRating(coach.rating, coach.reviews);
  const cardBio = prepareCoachCardBio(coach.bio, coach.name, coach.tags);
  const { visible: visibleTags, remaining: hiddenTagCount } = visibleCoachTags(coach.tags);

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <PersonAvatar uri={photoUri} size={88} style={styles.cardPhoto} />
        <View style={styles.cardTopInfo}>
          <Text style={styles.coachName} numberOfLines={1}>
            {coach.name}
          </Text>
          <Text style={styles.coachCategory} numberOfLines={1}>
            {coach.category}
          </Text>
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
                <Ionicons name="calendar-outline" size={IconSize.xs} color={Colors.textLight} />
                <Text style={styles.metaText}>{coach.experience} Yrs</Text>
              </View>
            ) : null}
            {coach.city ? (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={IconSize.xs} color={Colors.secondary} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {coach.city}
                </Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.viewProfileBtn}
            onPress={() => onViewProfile(coach, clientCount, coachCodes, coaches)}
            activeOpacity={PressOpacity.default}
            accessibilityRole="button"
            accessibilityLabel={`View profile for ${coach.name}`}
          >
            <Text style={styles.viewProfileText}>View Profile</Text>
          </TouchableOpacity>
        </View>
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
    </View>
  );
}

function TopRatedCompactCard({ coach, onPress }: { coach: Coach; onPress: () => void }) {
  const photoUri = resolveCoachPhotoUrl(coach);
  const showRating = shouldShowPublicRating(coach.rating, coach.reviews);

  return (
    <TouchableOpacity
      style={styles.topRatedCard}
      onPress={onPress}
      activeOpacity={PressOpacity.default}
      accessibilityRole="button"
      accessibilityLabel={`View ${coach.name}`}
    >
      <PersonAvatar uri={photoUri} size={48} />
      <View style={styles.topRatedInfo}>
        <Text style={styles.topRatedName} numberOfLines={1}>
          {coach.name}
        </Text>
        {showRating ? (
          <View style={styles.topRatedMetaRow}>
            <Ionicons name="star" size={10} color={Colors.accent} />
            <Text style={styles.topRatedMeta}>
              {coach.rating} ({coach.reviews})
            </Text>
          </View>
        ) : null}
        {coach.experience > 0 ? (
          <View style={styles.topRatedMetaRow}>
            <Ionicons name="calendar-outline" size={10} color={Colors.textLight} />
            <Text style={styles.topRatedMeta} numberOfLines={1}>
              {coach.experience} Yrs
            </Text>
          </View>
        ) : null}
        {coach.city ? (
          <View style={styles.topRatedMetaRow}>
            <Ionicons name="location-outline" size={10} color={Colors.textLight} />
            <Text style={styles.topRatedMeta} numberOfLines={1}>
              {coach.city}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.topRatedChevron}>
        <Ionicons name="chevron-forward" size={IconSize.sm} color={Colors.secondary} />
      </View>
    </TouchableOpacity>
  );
}

export default function CoachListScreen({ navigation, route }: RootScreenProps<'CoachList'>) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const signedIn = useAuthState() === 'signedIn';
  const scrollRef = useRef<ScrollView>(null);

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(route.params?.categoryCode || '');
  const [city, setCity] = useState(ALL_CITIES);
  const [ratingFilter, setRatingFilter] = useState(RATING_FILTER_OPTIONS[0]!);
  const [sort, setSort] = useState('Top Rated');
  const [page, setPage] = useState(1);
  const [picker, setPicker] = useState<PickerKind>(null);
  const [combineOpen, setCombineOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 400);
  const myCoachCode = getCurrentCoachCode();

  const categoriesQuery = useQuery({
    queryKey: queryKeys.coachCategories,
    queryFn: getCoachCategories,
    staleTime: MASTER_STALE_MS,
  });
  const categories = categoriesQuery.data?.length ? categoriesQuery.data : FALLBACK_CATEGORIES;

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

  const resolvedCity = city === ALL_CITIES || cityOptions.includes(city) ? city : ALL_CITIES;

  const minRating = coachPublicMinRatingParam(ratingFilter);
  const sortBy = coachPublicSortParam(sort);

  const selectCity = (value: string) => {
    setCity(value);
    setPage(1);
  };
  const selectRating = (value: string) => {
    setRatingFilter(value);
    setPage(1);
  };
  const selectSort = (value: string) => {
    setSort(value);
    setPage(1);
  };
  const selectCategory = (value: string) => {
    setActiveCategory(value);
    setPage(1);
  };
  const selectSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const listParams = {
    coachTypeCode: activeCategory || undefined,
    search: debouncedSearch || undefined,
    city: resolvedCity !== ALL_CITIES ? resolvedCity : undefined,
    minRating,
    sortBy,
    page,
    pageSize: PAGE_SIZE,
  };
  const coachesQuery = useQuery({
    queryKey: queryKeys.coachPublicList(listParams),
    queryFn: ({ signal }) => getCoachPublicList(listParams, signal),
  });

  const topRatedQuery = useQuery({
    queryKey: queryKeys.coachPublicList({ sortBy: 'rating', page: 1, pageSize: TOP_RATED_LIMIT }),
    queryFn: ({ signal }) =>
      getCoachPublicList({ sortBy: 'rating', page: 1, pageSize: TOP_RATED_LIMIT }, signal),
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

  const totalCount = coachesQuery.data?.totalCount ?? filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const showPager = totalCount > PAGE_SIZE;

  const topRatedCoaches = useMemo(() => {
    const list = topRatedQuery.data?.coaches ?? [];
    const withRatings = list.filter(c => shouldShowPublicRating(c.rating, c.reviews));
    const source = withRatings.length ? withRatings : list;
    return [...source].sort((a, b) => b.rating - a.rating || b.reviews - a.reviews).slice(0, TOP_RATED_LIMIT);
  }, [topRatedQuery.data]);

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
    setPage(1);
  };

  const categoryLabel =
    categories.find(c => c.code === activeCategory)?.label ||
    categories.find(c => c.code === activeCategory)?.short ||
    'All categories';

  const errorMessage = coachesQuery.isError
    ? getErrorMessage(coachesQuery.error, 'Could not load coaches. Pull down to try again.')
    : null;
  const showLoadError = !!errorMessage && !coachesQuery.data;

  const refreshControl = useQueriesRefreshControl([coachesQuery, topRatedQuery, citiesQuery]);

  const openCoachProfile = (
    coach: Coach,
    clientCount: number,
    coachCodes: string[],
    coaches: Coach[],
  ) => {
    navigation.navigate('CoachPublicProfile', {
      coach: { ...coach, clients: clientCount },
      coachCode: coach.id,
      coachCodes,
      coaches: coaches.map(c => (c.id === coach.id ? { ...c, clients: clientCount } : c)),
    });
  };

  const onViewProfile = (
    coach: Coach,
    clientCount: number,
    coachCodes: string[],
    coaches: Coach[],
  ) => openCoachProfile(coach, clientCount, coachCodes, coaches);

  const onGetStarted = () => {
    if (signedIn) {
      navigation.navigate('Main');
      return;
    }
    navigation.navigate('Login');
  };

  const onViewAllTopRated = () => {
    clearFilters();
    setSort('Top Rated');
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const closePicker = () => setPicker(null);

  const pickerOptions =
    picker === 'city'
      ? cityOptions
      : picker === 'rating'
        ? RATING_FILTER_OPTIONS
        : picker === 'sort'
          ? SORT_OPTIONS
          : picker === 'category'
            ? ['', ...categories.map(c => c.code)]
            : [];

  const pickerTitle =
    picker === 'city'
      ? 'Serving City'
      : picker === 'rating'
        ? 'Coach Category'
        : picker === 'sort'
          ? 'Sort by'
          : picker === 'category'
            ? 'Coach Category'
            : '';

  const pickerValue =
    picker === 'city'
      ? resolvedCity
      : picker === 'rating'
        ? ratingFilter
        : picker === 'sort'
          ? sort
          : picker === 'category'
            ? activeCategory
            : '';

  const onPick = (value: string) => {
    if (picker === 'city') selectCity(value);
    else if (picker === 'rating') selectRating(value);
    else if (picker === 'sort') selectSort(value);
    else if (picker === 'category') selectCategory(value);
    closePicker();
  };

  const pickerLabel = (value: string) => {
    if (picker === 'category') {
      if (!value) return 'All categories';
      return categories.find(c => c.code === value)?.label ?? value;
    }
    return value;
  };

  const resultCount = totalCount;
  const filterColWidth = (screenWidth - Spacing.md * 2 - Spacing.sm) / 2;

  const coachCodes = filtered.map(c => c.id);
  const coachesForNav = filtered.map(c => {
    const clientCount = resolvePublicClientCount({
      coachId: c.id,
      marketingClients: c.clients,
      viewerCoachCode: myCoachCode,
      liveRosterLength: myClientsQuery.data?.length,
    });
    return { ...c, clients: clientCount };
  });

  return (
    <View style={styles.container}>
      <WaveScreenHeader
        title="Find Your Coach"
        onBack={() => navigation.goBack()}
        onHome={() => navigation.navigate('Home')}
      />

      <ScrollView
        ref={scrollRef}
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
        <View style={styles.filterGrid}>
          <View style={[styles.filterCell, { width: filterColWidth }]}>
            <FilterControl
              icon="location"
              label="Serving City"
              value={resolvedCity}
              onPress={() => setPicker('city')}
            />
          </View>
          <View style={[styles.filterCell, { width: filterColWidth }]}>
            <FilterControl
              icon="person"
              label="Coach Category"
              value={ratingFilter}
              onPress={() => setPicker('rating')}
            />
          </View>
          <View style={[styles.filterCell, { width: filterColWidth }]}>
            <FilterControl
              icon="star"
              label="Sort by"
              value={sort}
              onPress={() => setPicker('sort')}
            />
          </View>
          <View style={[styles.filterCell, { width: filterColWidth }]}>
            <TouchableOpacity
              style={styles.combineBtn}
              onPress={() => setCombineOpen(true)}
              activeOpacity={PressOpacity.default}
              accessibilityRole="button"
              accessibilityLabel="Combine Filters"
            >
              <Ionicons name="options-outline" size={IconSize.md} color={Colors.secondary} />
              <Text style={styles.combineBtnText}>Combine Filters</Text>
            </TouchableOpacity>
          </View>
        </View>

        {hasActiveFilters ? (
          <TouchableOpacity
            onPress={clearFilters}
            style={styles.clearBtn}
            accessibilityRole="button"
            accessibilityLabel="Clear filters"
            activeOpacity={PressOpacity.default}
            hitSlop={HitSlop.sm}
          >
            <Ionicons name="close-circle-outline" size={IconSize.sm} color={Colors.primary} />
            <Text style={styles.clearText}>Clear filters</Text>
          </TouchableOpacity>
        ) : null}

        {coachesQuery.isPending && !coachesQuery.data ? (
          <ActivityIndicator color={Colors.secondary} style={styles.loader} />
        ) : showLoadError ? (
          <ReloadState
            title="Could not load coaches"
            message={errorMessage!}
            onRetry={() => void coachesQuery.refetch()}
            loading={coachesQuery.isFetching}
          />
        ) : (
          <>
            <Text style={styles.resultText}>
              Showing <Text style={styles.resultBold}>{resultCount}</Text>{' '}
              {pluralizeCoaches(resultCount)}
            </Text>

            {filtered.map(coach => {
              const photoUri = resolveCoachPhotoUrl(coach);
              const clientCount = resolvePublicClientCount({
                coachId: coach.id,
                marketingClients: coach.clients,
                viewerCoachCode: myCoachCode,
                liveRosterLength: myClientsQuery.data?.length,
              });

              return (
                <CoachResultCard
                  key={coach.id}
                  coach={coach}
                  photoUri={photoUri}
                  clientCount={clientCount}
                  coachCodes={coachCodes}
                  coaches={coachesForNav}
                  onViewProfile={onViewProfile}
                />
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

            {showPager ? (
              <ListPager page={safePage} totalPages={totalPages} onChangePage={setPage} />
            ) : null}
          </>
        )}

        <View style={styles.topRatedHeader}>
          <View style={styles.topRatedTitleRow}>
            <Ionicons name="star" size={IconSize.md} color={Colors.accent} />
            <Text style={styles.topRatedTitle}>Top Rated Coaches</Text>
          </View>
          <TouchableOpacity
            style={styles.viewAllPill}
            onPress={onViewAllTopRated}
            activeOpacity={PressOpacity.default}
            accessibilityRole="button"
            accessibilityLabel="View all top rated coaches"
            hitSlop={HitSlop.sm}
          >
            <Text style={styles.viewAllText}>View All {'>'}</Text>
          </TouchableOpacity>
        </View>

        {topRatedQuery.isPending && !topRatedQuery.data ? (
          <ActivityIndicator color={Colors.secondary} style={styles.loader} />
        ) : topRatedCoaches.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.topRatedRow}
          >
            {topRatedCoaches.map(coach => {
              const clientCount = resolvePublicClientCount({
                coachId: coach.id,
                marketingClients: coach.clients,
                viewerCoachCode: myCoachCode,
                liveRosterLength: myClientsQuery.data?.length,
              });
              const codes = topRatedCoaches.map(c => c.id);
              const coaches = topRatedCoaches.map(c =>
                c.id === coach.id ? { ...c, clients: clientCount } : c,
              );
              return (
                <TopRatedCompactCard
                  key={coach.id}
                  coach={coach}
                  onPress={() => openCoachProfile(coach, clientCount, codes, coaches)}
                />
              );
            })}
          </ScrollView>
        ) : (
          <EmptyState
            icon="people-outline"
            title="Coaches coming soon"
            message="Top rated coaches will appear here as more profiles go live."
            style={styles.topRatedEmpty}
          />
        )}

        <View style={styles.ctaBanner}>
          <View style={styles.ctaIcon}>
            <Ionicons name="person-outline" size={IconSize.lg} color={Colors.white} />
          </View>
          <View style={styles.ctaCopy}>
            <Text style={styles.ctaTitle}>Become a Coach</Text>
            <Text style={styles.ctaSubtitle}>
              List your profile and get enquiries from people searching for a coach
            </Text>
          </View>
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={onGetStarted}
            activeOpacity={PressOpacity.default}
            accessibilityRole="button"
            accessibilityLabel={signedIn ? 'Go to Dashboard' : 'Get Started Free'}
          >
            <Text style={styles.ctaBtnText}>Get Started Free {'>'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={picker != null} transparent animationType="fade" onRequestClose={closePicker}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={closePicker}>
          <View
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.handle} />
            {pickerTitle ? <Text style={styles.sheetTitle}>{pickerTitle}</Text> : null}
            <ScrollView
              style={styles.optionList}
              contentContainerStyle={styles.optionListContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {pickerOptions.length === 0 ? (
                <Text style={styles.emptyText}>No options available</Text>
              ) : (
                pickerOptions.map(opt => {
                  const active = opt === pickerValue;
                  return (
                    <TouchableOpacity
                      key={opt || '__all__'}
                      style={styles.option}
                      onPress={() => onPick(opt)}
                    >
                      <Text style={[styles.optionText, active && styles.optionTextActive]}>
                        {pickerLabel(opt)}
                      </Text>
                      {active ? (
                        <Ionicons name="checkmark" size={18} color={Colors.primary} />
                      ) : null}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={combineOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCombineOpen(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setCombineOpen(false)}
        >
          <View
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Combine Filters</Text>
            <SearchField
              placeholder="Search name, city or specialty..."
              value={search}
              onChangeText={selectSearch}
              accessibilityLabel="Search coaches"
            />
            <Text style={styles.combineSectionLabel}>Category</Text>
            <Text style={styles.combineSectionValue} numberOfLines={1}>
              {activeCategory ? categoryLabel : 'All categories'}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryPills}
            >
              <TouchableOpacity
                style={[styles.catPill, !activeCategory && styles.catPillActive]}
                onPress={() => selectCategory('')}
                activeOpacity={PressOpacity.default}
              >
                <Text style={[styles.catPillText, !activeCategory && styles.catPillTextActive]}>
                  All
                </Text>
              </TouchableOpacity>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.code}
                  style={[styles.catPill, activeCategory === cat.code && styles.catPillActive]}
                  onPress={() => selectCategory(cat.code)}
                  activeOpacity={PressOpacity.default}
                >
                  <CategoryIcon
                    category={cat}
                    size={IconSize.xs}
                    color={activeCategory === cat.code ? Colors.white : Colors.secondary}
                  />
                  <Text
                    style={[
                      styles.catPillText,
                      activeCategory === cat.code && styles.catPillTextActive,
                    ]}
                  >
                    {cat.short}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.combineFilterStack}>
              <FilterControl
                icon="location"
                label="Serving City"
                value={resolvedCity}
                onPress={() => {
                  setCombineOpen(false);
                  setPicker('city');
                }}
              />
              <FilterControl
                icon="person"
                label="Coach Category"
                value={ratingFilter}
                onPress={() => {
                  setCombineOpen(false);
                  setPicker('rating');
                }}
              />
              <FilterControl
                icon="star"
                label="Sort by"
                value={sort}
                onPress={() => {
                  setCombineOpen(false);
                  setPicker('sort');
                }}
              />
            </View>

            <View style={styles.combineActions}>
              {hasActiveFilters ? (
                <TouchableOpacity
                  onPress={clearFilters}
                  style={styles.clearBtn}
                  activeOpacity={PressOpacity.default}
                >
                  <Text style={styles.clearText}>Clear filters</Text>
                </TouchableOpacity>
              ) : (
                <View />
              )}
              <TouchableOpacity
                style={styles.combineDone}
                onPress={() => setCombineOpen(false)}
                activeOpacity={PressOpacity.default}
                accessibilityRole="button"
                accessibilityLabel="Done"
              >
                <Text style={styles.combineDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  body: { flex: 1 },
  bodyContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  filterCell: {},
  filterControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: Radius.sm + 2,
    paddingHorizontal: Spacing.sm - 2,
    paddingVertical: Spacing.sm - 2,
    minHeight: 56,
  },
  filterControlText: { flex: 1, minWidth: 0 },
  filterLabel: {
    ...Typography.micro,
    color: Colors.textLight,
    marginBottom: 1,
  },
  filterValue: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    color: Colors.textDark,
  },
  combineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.sm + 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.secondaryMuted,
    paddingHorizontal: Spacing.sm,
    minHeight: 56,
  },
  combineBtnText: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    color: Colors.secondary,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginBottom: Spacing.xs,
    paddingVertical: Spacing.xxs,
  },
  clearText: {
    ...Typography.caption,
    color: Colors.primary,
    fontFamily: FontFamily.semibold,
  },
  loader: { marginVertical: Spacing.lg - 4 },
  resultText: {
    ...Typography.caption,
    marginBottom: Spacing.sm,
    color: Colors.textLight,
  },
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
  cardTop: { flexDirection: 'row', gap: Spacing.sm },
  cardPhoto: {
    borderRadius: Radius.sm + 2,
  },
  cardTopInfo: { flex: 1, minWidth: 0 },
  coachName: {
    ...Typography.bodyStrong,
    fontFamily: headingFont.bold,
    fontSize: 15,
  },
  coachCategory: {
    ...Typography.micro,
    color: Colors.secondary,
    fontFamily: FontFamily.semibold,
    marginTop: 1,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm - 2,
    marginBottom: Spacing.xs,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
  metaText: { ...Typography.micro, fontFamily: FontFamily.semibold },
  viewProfileBtn: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewProfileText: {
    color: Colors.white,
    fontSize: 12,
    fontFamily: FontFamily.bold,
  },
  bio: {
    ...Typography.caption,
    lineHeight: 17,
    marginTop: Spacing.sm - 2,
    marginBottom: 6,
  },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
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
    backgroundColor: Colors.primaryLight,
  },
  tagMoreText: { fontSize: 10, color: Colors.primary, fontFamily: FontFamily.semibold },
  topRatedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  topRatedTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  topRatedTitle: {
    fontSize: 16,
    fontFamily: headingFont.bold,
    color: Colors.textDark,
  },
  viewAllPill: {
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs + 2,
  },
  viewAllText: {
    fontSize: 12,
    fontFamily: FontFamily.semibold,
    color: Colors.secondaryDark,
  },
  topRatedRow: {
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  topRatedCard: {
    width: 200,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  topRatedInfo: { flex: 1, minWidth: 0 },
  topRatedName: {
    fontSize: 13,
    fontFamily: headingFont.bold,
    color: Colors.textDark,
  },
  topRatedMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
    maxWidth: '100%',
  },
  topRatedMeta: {
    fontSize: 11,
    fontFamily: FontFamily.semibold,
    color: Colors.textLight,
    flexShrink: 1,
  },
  topRatedChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRatedEmpty: { marginBottom: Spacing.md },
  ctaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.secondaryDark,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    ...Shadow.md,
  },
  ctaIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.brandMeraOnDark,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaCopy: { flex: 1, minWidth: 0 },
  ctaTitle: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: headingFont.bold,
  },
  ctaSubtitle: {
    color: Colors.onDarkCaption,
    fontFamily: FontFamily.regular,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  ctaBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    maxWidth: 128,
  },
  ctaBtnText: {
    color: Colors.white,
    fontSize: 11,
    fontFamily: FontFamily.bold,
    textAlign: 'center',
  },
  backdrop: { flex: 1, backgroundColor: Colors.scrim, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    maxHeight: '78%',
    ...Shadow.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  sheetTitle: {
    fontSize: 16,
    fontFamily: headingFont.bold,
    color: Colors.textDark,
    marginBottom: Spacing.sm,
  },
  optionList: { maxHeight: 360 },
  optionListContent: { paddingBottom: Spacing.xs },
  emptyText: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  optionText: {
    flex: 1,
    marginRight: Spacing.sm,
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.textDark,
    textAlign: 'left',
  },
  optionTextActive: { color: Colors.primary, fontFamily: FontFamily.bold },
  combineSectionLabel: {
    ...Typography.micro,
    color: Colors.textLight,
    marginTop: Spacing.sm,
    marginBottom: 2,
  },
  combineSectionValue: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    color: Colors.textDark,
    marginBottom: Spacing.xs,
  },
  categoryPills: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: Spacing.sm,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    backgroundColor: Colors.secondaryLight,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  catPillActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  catPillText: {
    fontSize: 12,
    fontFamily: FontFamily.semibold,
    color: Colors.secondary,
  },
  catPillTextActive: {
    color: Colors.white,
  },
  combineFilterStack: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  combineActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  combineDone: {
    backgroundColor: Colors.secondary,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm - 2,
  },
  combineDoneText: {
    color: Colors.white,
    fontFamily: FontFamily.bold,
    fontSize: 14,
  },
});
