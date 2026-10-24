import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontFamily,
  IconSize,
  ListCard,
  ListPortrait,
  PressOpacity,
  Radius,
  ScreenPad,
  Shadow,
  Spacing,
  TouchTarget,
  Typography,
} from '../../constants/theme';
import AppButton from '../../components/AppButton';
import FormErrorBanner from '../../components/FormErrorBanner';
import ListPager from '../../components/ListPager';
import ReloadState from '../../components/ReloadState';
import WaveScreenHeader from '../../components/WaveScreenHeader';
import { getErrorMessage } from '../../api/client';
import { queryKeys } from '../../api/queryKeys';
import { deletePost, getMyPosts, getPostCategories, type CoachPost } from '../../api/showcaseApi';
import { refreshControlTheme, useRefreshControl } from '../../hooks/useRefreshControl';
import { formatPostDate } from '../../utils/formatPostDate';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import { navigateToDashboard } from '../../utils/navigationBack';
import type { EventsStackScreenProps } from '../../types/navigation';

const CANVAS = '#F3FAF7';
const PAGE_SIZE = 5;
const ALL = 'ALL';
/** Below this width the card photo shrinks and the chevron goes, so the title gets room. */
const COMPACT_WIDTH = 360;
const COMPACT_PHOTO = { width: 80, height: 88 } as const;

export default function EventsScreen({ navigation }: EventsStackScreenProps<'EventsHome'>) {
  const compact = useWindowDimensions().width < COMPACT_WIDTH;
  const queryClient = useQueryClient();
  const postsQuery = useQuery({ queryKey: queryKeys.myPosts, queryFn: getMyPosts });
  const categoriesQuery = useQuery({
    queryKey: queryKeys.postCategories,
    queryFn: getPostCategories,
    staleTime: 10 * 60_000,
  });
  const refreshControl = useRefreshControl(postsQuery);
  const [filter, setFilter] = useState(ALL);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);

  const errorMessage =
    postsQuery.isError && !postsQuery.data
      ? getErrorMessage(postsQuery.error, 'Could not load your posts.')
      : null;

  const all = postsQuery.data ?? [];
  const posts = filter === ALL ? all : all.filter(p => p.categoryCode === filter);
  const totalPages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagePosts = posts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const filters = [
    { code: ALL, label: 'All' },
    ...(categoriesQuery.data ?? []).map(c => ({ code: c.code, label: c.label })),
  ];

  const persistRemove = async (post: CoachPost) => {
    if (removingId) return;
    setRemovingId(post.postId);
    setActionError(null);
    try {
      await deletePost(post.postId);
      void queryClient.invalidateQueries({ queryKey: ['showcase'] });
    } catch (err) {
      setActionError(getErrorMessage(err, 'Could not remove this post. Please try again.'));
    } finally {
      setRemovingId(null);
    }
  };

  const confirmRemove = (post: CoachPost) => {
    Alert.alert('Remove post', `Remove ${post.title || 'this post'}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void persistRemove(post) },
    ]);
  };

  return (
    <View style={styles.container}>
      <WaveScreenHeader
        title="Posts"
        showBack={false}
        onHome={() => navigateToDashboard(navigation)}
      />
      <View style={styles.addRow}>
        <AppButton
          label="Add post"
          size="compact"
          icon="add-outline"
          iconPosition="left"
          onPress={() => navigation.navigate('AddEvent')}
          accessibilityLabel="Add post"
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {filters.map(item => {
          const selected = filter === item.code;
          return (
            <TouchableOpacity
              key={item.code}
              style={[styles.filterChip, selected && styles.filterChipOn]}
              onPress={() => {
                setFilter(item.code);
                setPage(1);
              }}
              activeOpacity={PressOpacity.default}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.filterLabel, selected && styles.filterLabelOn]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={styles.bannerPad}>
        <FormErrorBanner message={actionError} />
        <FormErrorBanner message={refreshControl.refreshError} />
      </View>

      {postsQuery.isPending ? (
        <ActivityIndicator color={Colors.secondary} style={styles.pending} />
      ) : errorMessage ? (
        <ReloadState
          title="Could not load posts"
          message={errorMessage}
          onRetry={() => void postsQuery.refetch()}
          loading={postsQuery.isFetching}
          showPullHint={false}
        />
      ) : (
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshControl.refreshing}
              onRefresh={refreshControl.onRefresh}
              {...refreshControlTheme}
            />
          }
        >
          {posts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="images-outline" size={IconSize.xxl} color={Colors.accentInk} />
              <Text style={styles.emptyTitle}>Nothing here yet</Text>
              <Text style={styles.emptyMessage}>
                Share photos, videos and client success stories on your public profile.
              </Text>
            </View>
          ) : (
            pagePosts.map(post => {
              const removing = removingId === post.postId;
              const imageUri = post.mediaType === 'image' ? resolveMediaUrl(post.mediaUrl) : null;
              return (
                <View key={post.postId} style={styles.card}>
                  <TouchableOpacity
                    style={styles.cardMain}
                    onPress={() => navigation.navigate('AddEvent', { postId: post.postId })}
                    activeOpacity={PressOpacity.default}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${post.title}`}
                  >
                    {imageUri ? (
                      <Image
                        source={{ uri: imageUri }}
                        style={[styles.photo, compact && COMPACT_PHOTO]}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.photo, styles.videoPlate, compact && COMPACT_PHOTO]}>
                        <Ionicons name="videocam" size={IconSize.lg} color={Colors.accentInk} />
                      </View>
                    )}
                    <View style={styles.cardBody}>
                      <Text style={styles.category}>{post.categoryName}</Text>
                      <Text style={styles.cardTitle} numberOfLines={2}>
                        {post.title}
                      </Text>
                      <Text style={styles.cardMeta} numberOfLines={1}>
                        {[formatPostDate(post.postDate), post.location].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                    {compact ? null : (
                      <Ionicons
                        name="chevron-forward-outline"
                        size={IconSize.md}
                        color={Colors.accentInk}
                      />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => confirmRemove(post)}
                    disabled={removing}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${post.title}`}
                    activeOpacity={PressOpacity.default}
                  >
                    {removing ? (
                      <ActivityIndicator size="small" color={Colors.destructive} />
                    ) : (
                      <Ionicons
                        name="trash-outline"
                        size={IconSize.md}
                        color={Colors.destructive}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              );
            })
          )}
          {posts.length > PAGE_SIZE ? (
            <ListPager
              page={safePage}
              totalPages={totalPages}
              onChangePage={setPage}
              variant="square"
            />
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CANVAS },
  pending: { marginTop: 60 },
  body: { flex: 1, backgroundColor: CANVAS },
  addRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: ScreenPad.horizontal,
    paddingTop: Spacing.md,
  },
  filterScroll: { flexGrow: 0 },
  filterRow: {
    paddingHorizontal: ScreenPad.horizontal,
    paddingTop: Spacing.sm,
    gap: Spacing.xs,
  },
  filterChip: {
    paddingHorizontal: 16,
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipOn: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  filterLabel: { ...Typography.label, color: Colors.textDark },
  filterLabelOn: { color: Colors.white, fontFamily: FontFamily.semibold },
  bannerPad: { paddingHorizontal: ScreenPad.horizontal },
  bodyContent: {
    paddingHorizontal: ScreenPad.horizontal,
    paddingTop: Spacing.md,
    paddingBottom: ScreenPad.tabBarClearance,
    gap: Spacing.sm,
  },
  emptyCard: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: Spacing.lg,
    ...Shadow.sm,
  },
  emptyTitle: { ...Typography.headline },
  emptyMessage: { ...Typography.body, color: Colors.textLight, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: ListCard.minHeight,
    backgroundColor: Colors.white,
    borderRadius: ListCard.radius,
    overflow: 'hidden',
    borderWidth: ListCard.borderWidth,
    borderColor: ListCard.borderColor,
    padding: ListPortrait.contentPad,
  },
  cardMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minWidth: 0,
  },
  photo: {
    width: ListPortrait.width,
    height: ListPortrait.height,
    borderRadius: ListPortrait.radius,
    backgroundColor: Colors.cardTintGreen,
    overflow: 'hidden',
    flexShrink: 0,
  },
  videoPlate: { alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, minWidth: 0 },
  category: { ...Typography.label, color: Colors.secondary, fontFamily: FontFamily.semibold },
  cardTitle: { ...Typography.headline },
  cardMeta: { marginTop: 3, ...Typography.label, fontFamily: FontFamily.regular },
  removeBtn: {
    width: TouchTarget.icon,
    height: TouchTarget.icon,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.xxs,
    flexShrink: 0,
  },
});
