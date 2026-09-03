import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontFamily, Radius, Shadow, Spacing } from '../constants/theme';
import { COACH_CATEGORIES as FALLBACK_CATEGORIES } from '../data/homeContent';
import { SORT_OPTIONS } from '../data/coachDirectory';
import { getCoachCategories, getCoachPublicList } from '../api/coachApi';
import { getClientList } from '../api/clientApi';
import { MASTER_STALE_MS } from '../api/queryClient';
import { queryKeys } from '../api/queryKeys';
import { getCurrentCoachCode, isAuthenticated } from '../auth/session';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useRefreshControl, refreshControlTheme } from '../hooks/useRefreshControl';
import DropdownField from '../components/DropdownField';
import CategoryIcon from '../components/CategoryIcon';
import { HeaderBackButton } from '../components/ScreenHeader';
import PersonAvatar from '../components/PersonAvatar';
import { getErrorMessage } from '../api/client';
import {
  formatExpertiseLabel,
  pluralizeCoaches,
  prepareCoachCardBio,
  visibleCoachTags,
} from '../utils/coachDisplay';
import { resolvePublicClientCount, shouldShowPublicRating } from '../utils/coachPublicStats';
import { resolveMediaUrl } from '../utils/mediaUrl';
import type { RootScreenProps } from '../types/navigation';

export default function CoachListScreen({ navigation, route }: RootScreenProps<'CoachList'>) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(route.params?.categoryCode || '');
  const [sort, setSort] = useState('Top Rated');
  const debouncedSearch = useDebouncedValue(search, 400);
  const myCoachCode = getCurrentCoachCode();

  const categoriesQuery = useQuery({
    queryKey: queryKeys.coachCategories,
    queryFn: getCoachCategories,
    staleTime: MASTER_STALE_MS,
  });
  const categories = categoriesQuery.data?.length ? categoriesQuery.data : FALLBACK_CATEGORIES;

  const listParams = {
    coachTypeCode: activeCategory || undefined,
    search: debouncedSearch || undefined,
  };
  const coachesQuery = useQuery({
    // Normalized key shares Home's empty-filter public list cache.
    queryKey: queryKeys.coachPublicList(listParams),
    queryFn: ({ signal }) => getCoachPublicList(listParams, signal),
  });

  const myClientsQuery = useQuery({
    queryKey: queryKeys.clientList(myCoachCode),
    queryFn: () => getClientList(),
    enabled: isAuthenticated() && !!myCoachCode,
  });

  const filtered = useMemo(() => {
    let list = coachesQuery.data?.coaches ?? [];
    if (sort === 'Top Rated') list = [...list].sort((a, b) => b.rating - a.rating);
    else if (sort === 'Most Reviewed') list = [...list].sort((a, b) => b.reviews - a.reviews);
    else if (sort === 'Most Experience')
      list = [...list].sort((a, b) => b.experience - a.experience);
    return list;
  }, [coachesQuery.data, sort]);

  const errorMessage = coachesQuery.isError
    ? getErrorMessage(coachesQuery.error, 'Could not load coaches. Pull down to try again.')
    : null;

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
          >
            <Ionicons
              name="grid-outline"
              size={12}
              color={!activeCategory ? Colors.white : Colors.textLight}
            />
            <Text style={[styles.pillText, !activeCategory && styles.pillTextActive]}>All</Text>
          </TouchableOpacity>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.code}
              style={[styles.pill, activeCategory === cat.code && styles.pillActive]}
              onPress={() => setActiveCategory(cat.code)}
            >
              <CategoryIcon
                category={cat}
                size={12}
                color={activeCategory === cat.code ? Colors.white : Colors.textLight}
              />
              <Text style={[styles.pillText, activeCategory === cat.code && styles.pillTextActive]}>
                {cat.short}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color={Colors.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name, city or specialty..."
            placeholderTextColor={Colors.textLight}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
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
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
        ) : errorMessage ? (
          <Text style={styles.empty}>{errorMessage}</Text>
        ) : (
          <>
            <View style={styles.resultRow}>
              <Text style={styles.resultText}>
                Showing <Text style={styles.resultBold}>{filtered.length}</Text>{' '}
                {pluralizeCoaches(filtered.length)}
              </Text>
              <DropdownField compact value={sort} options={SORT_OPTIONS} onChange={setSort} />
            </View>

            {filtered.map(coach => {
              const photoUri = resolveMediaUrl(coach.profilePicUrl);
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
                    <View style={{ flex: 1 }}>
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
                        <Ionicons name="star" size={12} color={Colors.accent} />
                        <Text style={styles.metaText}>
                          {coach.rating} ({coach.reviews})
                        </Text>
                      </View>
                    ) : null}
                    {coach.experience > 0 ? (
                      <View style={styles.metaItem}>
                        <Ionicons name="briefcase-outline" size={12} color={Colors.textLight} />
                        <Text style={styles.metaText}>{coach.experience} Yrs</Text>
                      </View>
                    ) : null}
                    {coach.city ? (
                      <View style={styles.metaItem}>
                        <Ionicons name="location-outline" size={12} color={Colors.textLight} />
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
                    <TouchableOpacity
                      style={styles.viewBtn}
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
                    >
                      <Text style={styles.viewBtnText}>View Profile</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            {filtered.length === 0 && (
              <Text style={styles.empty}>No coaches match your search.</Text>
            )}
          </>
        )}

        <View style={styles.ctaCard}>
          <View style={styles.ctaIcon}>
            <Ionicons name="school-outline" size={20} color={Colors.white} />
          </View>
          <Text style={styles.ctaTitle}>Become a Coach</Text>
          <Text style={styles.ctaSubtitle}>
            List your profile and get enquiries from people searching for a coach.
          </Text>
          <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.navigate('Register')}>
            <Ionicons name="rocket-outline" size={16} color={Colors.white} />
            <Text style={styles.ctaBtnText}>Get Started Free</Text>
          </TouchableOpacity>
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
    color: Colors.white,
    fontSize: 18,
    fontFamily: FontFamily.extraBold,
  },
  pillsContent: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingBottom: 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  pillActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  pillText: { fontSize: 11, color: Colors.onDarkMuted, fontFamily: FontFamily.semibold },
  pillTextActive: { color: Colors.white },
  toolbar: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    ...Shadow.sm,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    height: 38,
  },
  searchInput: { flex: 1, fontSize: 13, fontFamily: FontFamily.regular, color: Colors.textDark },
  body: { flex: 1 },
  bodyContent: { padding: Spacing.md, paddingBottom: 40 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  resultText: { flex: 1, fontSize: 12, fontFamily: FontFamily.regular, color: Colors.textLight },
  resultBold: { fontFamily: FontFamily.extraBold, color: Colors.textDark },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  avatar: {
    marginRight: Spacing.xs,
  },
  coachName: { fontSize: 15, fontFamily: FontFamily.bold, color: Colors.textDark },
  coachCategory: {
    fontSize: 11,
    color: Colors.secondary,
    fontFamily: FontFamily.semibold,
    marginTop: 1,
  },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.online },
  onlineText: { fontSize: 10, color: Colors.online, fontFamily: FontFamily.bold },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: Colors.textLight, fontFamily: FontFamily.semibold },
  bio: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    lineHeight: 17,
    marginBottom: 6,
  },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 8 },
  tag: {
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: { fontSize: 10, color: Colors.secondary, fontFamily: FontFamily.bold },
  tagMore: {
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tagMoreText: { fontSize: 10, color: Colors.textLight, fontFamily: FontFamily.semibold },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: Colors.background,
    paddingTop: 8,
  },
  viewBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  viewBtnText: { color: Colors.white, fontSize: 12, fontFamily: FontFamily.bold },
  empty: { textAlign: 'center', color: Colors.textLight, fontSize: 13, marginTop: 20 },
  ctaCard: {
    backgroundColor: Colors.secondary,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    marginTop: 8,
    ...Shadow.md,
  },
  ctaIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  ctaTitle: { color: Colors.white, fontSize: 16, fontFamily: FontFamily.extraBold },
  ctaSubtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontFamily: FontFamily.regular,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 17,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: Radius.pill,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 12,
  },
  ctaBtnText: { color: Colors.white, fontFamily: FontFamily.bold, fontSize: 13 },
});
