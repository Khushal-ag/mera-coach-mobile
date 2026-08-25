import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Shadow } from '../constants/theme';
import { COACH_CATEGORIES as FALLBACK_CATEGORIES } from '../data/homeContent';
import { SORT_OPTIONS } from '../data/coachDirectory';
import { getCoachCategories, getCoachPublicList } from '../api/coachApi';
import { queryKeys } from '../api/queryKeys';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useRefreshControl } from '../hooks/useRefreshControl';
import DropdownField from '../components/DropdownField';
import { HeaderBackButton } from '../components/ScreenHeader';
import { getErrorMessage } from '../api/client';
import { resolveMediaUrl } from '../utils/mediaUrl';
import type { RootScreenProps } from '../types/navigation';

export default function CoachListScreen({ navigation, route }: RootScreenProps<'CoachList'>) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(route.params?.categoryCode || '');
  const [sort, setSort] = useState('Top Rated');
  const debouncedSearch = useDebouncedValue(search, 400);

  const categoriesQuery = useQuery({
    queryKey: queryKeys.coachCategories,
    queryFn: getCoachCategories,
  });
  const categories = categoriesQuery.data?.length ? categoriesQuery.data : FALLBACK_CATEGORIES;

  const coachesQuery = useQuery({
    queryKey: queryKeys.coachPublicList({ coachTypeCode: activeCategory, search: debouncedSearch }),
    queryFn: () =>
      getCoachPublicList({
        coachTypeCode: activeCategory || undefined,
        search: debouncedSearch || undefined,
      }),
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
      {/* Banner */}
      <View style={[styles.banner, { paddingTop: insets.top + 12 }]}>
        <HeaderBackButton onPress={() => navigation.goBack()} style={styles.bannerBack} />
        <Text style={styles.bannerTitle}>Find Your Perfect Coach</Text>
        <Text style={styles.bannerSubtitle}>
          Browse verified coaches across Health, Fitness, Yoga, Nutrition and Lifestyle.
        </Text>
      </View>

      {/* Category pills */}
      <View style={styles.pillsBar}>
        <View style={styles.pillsBarContent}>
          <TouchableOpacity
            style={[styles.pill, !activeCategory && styles.pillActive]}
            onPress={() => setActiveCategory('')}
          >
            <Ionicons
              name="grid-outline"
              size={13}
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
              <Ionicons
                name={cat.icon}
                size={13}
                color={activeCategory === cat.code ? Colors.white : Colors.textLight}
              />
              <Text style={[styles.pillText, activeCategory === cat.code && styles.pillTextActive]}>
                {cat.short}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshControl.refreshing}
            onRefresh={refreshControl.onRefresh}
            tintColor={Colors.secondary}
          />
        }
      >
        {/* Search */}
        <View style={styles.searchWrap}>
          <Ionicons
            name="search-outline"
            size={18}
            color={Colors.textLight}
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, city or specialty..."
            placeholderTextColor={Colors.textLight}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Result info + sort */}
        {coachesQuery.isPending ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
        ) : errorMessage ? (
          <Text style={styles.empty}>{errorMessage}</Text>
        ) : (
          <>
            <View style={styles.resultRow}>
              <Text style={styles.resultText}>
                Showing <Text style={styles.resultBold}>{filtered.length}</Text> coaches
              </Text>
            </View>
            <DropdownField label="Sort By" value={sort} options={SORT_OPTIONS} onChange={setSort} />

            {/* Coach cards */}
            {filtered.map(coach => {
              const photoUri = resolveMediaUrl(coach.profilePicUrl);
              return (
                <View key={coach.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.avatar}>
                      {photoUri ? (
                        <Image source={{ uri: photoUri }} style={styles.avatarImage} />
                      ) : (
                        <Text style={styles.avatarText}>
                          {coach.name
                            .split(' ')
                            .map(w => w[0])
                            .slice(0, 2)
                            .join('')}
                        </Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.coachName}>{coach.name}</Text>
                      <Text style={styles.coachCategory}>{coach.category}</Text>
                    </View>
                    {coach.online && (
                      <View style={styles.onlineBadge}>
                        <View style={styles.onlineDot} />
                        <Text style={styles.onlineText}>Online</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Ionicons name="star" size={12} color={Colors.accent} />
                      <Text style={styles.metaText}>
                        {coach.rating} ({coach.reviews})
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="briefcase-outline" size={12} color={Colors.textLight} />
                      <Text style={styles.metaText}>{coach.experience} Yrs</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="location-outline" size={12} color={Colors.textLight} />
                      <Text style={styles.metaText}>{coach.city}</Text>
                    </View>
                  </View>

                  <Text style={styles.bio} numberOfLines={2}>
                    {coach.bio}
                  </Text>

                  <View style={styles.tagsWrap}>
                    {coach.tags.map(tag => (
                      <View key={tag} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.cardFooter}>
                    <Text style={styles.clientsText}>
                      Clients: <Text style={styles.clientsBold}>{coach.clients}+</Text>
                    </Text>
                    <TouchableOpacity
                      style={styles.viewBtn}
                      onPress={() =>
                        navigation.navigate('CoachPublicProfile', {
                          coach,
                          coachCode: coach.id,
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

        {/* Become a Coach CTA */}
        <View style={styles.ctaCard}>
          <View style={styles.ctaIcon}>
            <Ionicons name="school-outline" size={22} color={Colors.white} />
          </View>
          <Text style={styles.ctaTitle}>Become a Coach</Text>
          <Text style={styles.ctaSubtitle}>
            Join our growing community and reach thousands of clients looking for your expertise.
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
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  bannerBack: { marginBottom: 14 },
  bannerTitle: { color: Colors.white, fontSize: 22, fontWeight: '800' },
  bannerSubtitle: { color: Colors.onDarkMuted, fontSize: 12, marginTop: 6, lineHeight: 18 },
  pillsBar: { backgroundColor: Colors.white, ...Shadow.sm },
  pillsBarContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  pillText: { fontSize: 12, color: Colors.textLight, fontWeight: '600' },
  pillTextActive: { color: Colors.white },
  body: { flex: 1 },
  bodyContent: { padding: 20, paddingBottom: 40 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    height: 46,
    ...Shadow.sm,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textDark },
  resultRow: { marginBottom: 10 },
  resultText: { fontSize: 12, color: Colors.textLight },
  resultBold: { fontWeight: '800', color: Colors.textDark },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 16,
    marginBottom: 14,
    ...Shadow.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  coachName: { fontSize: 15, fontWeight: '700', color: Colors.textDark },
  coachCategory: { fontSize: 12, color: Colors.secondary, fontWeight: '600', marginTop: 2 },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.online },
  onlineText: { fontSize: 10, color: Colors.online, fontWeight: '700' },
  metaRow: { flexDirection: 'row', gap: 14, marginBottom: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: Colors.textLight, fontWeight: '600' },
  bio: { fontSize: 12.5, color: Colors.textLight, lineHeight: 18, marginBottom: 10 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  tag: {
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: { fontSize: 10, color: Colors.secondary, fontWeight: '700' },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.background,
    paddingTop: 12,
  },
  clientsText: { fontSize: 12, color: Colors.textLight },
  clientsBold: { fontWeight: '800', color: Colors.textDark },
  viewBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  viewBtnText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  empty: { textAlign: 'center', color: Colors.textLight, fontSize: 13, marginTop: 20 },
  ctaCard: {
    backgroundColor: Colors.secondary,
    borderRadius: Radius.lg,
    padding: 24,
    alignItems: 'center',
    marginTop: 8,
    ...Shadow.md,
  },
  ctaIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  ctaTitle: { color: Colors.white, fontSize: 17, fontWeight: '800' },
  ctaSubtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: Radius.pill,
    paddingVertical: 12,
    paddingHorizontal: 22,
    marginTop: 16,
  },
  ctaBtnText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
});
