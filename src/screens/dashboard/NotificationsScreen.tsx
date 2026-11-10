import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  LayoutAnimation,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import {
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontFamily,
  HitSlop,
  IconSize,
  PressOpacity,
  Radius,
  ScreenPad,
  Spacing,
  Typography,
} from '../../constants/theme';
import { BrandImages } from '../../constants/images';
import EmptyState from '../../components/EmptyState';
import ReloadState from '../../components/ReloadState';
import WaveScreenHeader from '../../components/WaveScreenHeader';
import { getErrorMessage } from '../../api/client';
import {
  clearNotifications,
  deleteNotification,
  getNotifications,
  markNotificationsRead,
  markNotificationUnread,
  type AppNotification,
  type NotificationPage,
} from '../../api/notificationApi';
import { queryKeys } from '../../api/queryKeys';
import { refreshControlTheme, useRefreshControl } from '../../hooks/useRefreshControl';
import { timeAgo } from '../../notifications/formatTime';
import { openNotification } from '../../notifications/openTarget';
import { actionLabel, splitBody } from '../../notifications/presentation';
import { appAlert } from '../../utils/appDialog';
import type { IoniconName } from '../../types/icons';
import type { DashboardStackScreenProps, RootStackParamList } from '../../types/navigation';

/** Each group gets its own colour and icon so the kind of alert reads at a glance. */
const GROUP_STYLE: Record<string, { icon: IoniconName; color: string; tint: string; ink: string }> =
  {
    LEADS_CLIENTS: {
      icon: 'people',
      color: Colors.secondary,
      tint: Colors.secondaryLight,
      ink: Colors.secondaryDark,
    },
    BUSINESS: {
      icon: 'briefcase',
      color: Colors.primary,
      tint: Colors.primaryLight,
      ink: Colors.primaryDark,
    },
    SUBSCRIPTION: {
      icon: 'ribbon',
      color: Colors.accent,
      tint: Colors.accentLight,
      ink: Colors.accentDark,
    },
    FEEDBACK: {
      icon: 'chatbubble-ellipses',
      color: Colors.addClientBanner,
      tint: Colors.metricClientsBg,
      ink: Colors.accentInk,
    },
  };
const DEFAULT_GROUP_STYLE = {
  icon: 'notifications',
  color: Colors.secondary,
  tint: Colors.secondaryLight,
  ink: Colors.secondaryDark,
} as const;

/**
 * A collapsed row is a preview (title, time and two lines of the text). Tapping it opens the full text with the action
 * button, and that is what marks it read; tapping again folds it back.
 */
const NotificationRow = React.memo(function NotificationRow({
  item,
  expanded,
  onToggle,
  onOpen,
  onToggleRead,
  onDelete,
}: {
  item: AppNotification;
  expanded: boolean;
  onToggle: (item: AppNotification) => void;
  onOpen: (item: AppNotification) => void;
  onToggleRead: (item: AppNotification) => void;
  onDelete: (item: AppNotification) => void;
}) {
  const group = GROUP_STYLE[item.groupCode] ?? DEFAULT_GROUP_STYLE;
  const { lead, rest } = splitBody(item.body);
  const action = actionLabel(item.type, item.route);
  return (
    <TouchableOpacity
      style={[
        styles.card,
        item.isRead ? styles.cardRead : styles.cardUnread,
        expanded && { borderColor: group.color },
      ]}
      onPress={() => onToggle(item)}
      activeOpacity={PressOpacity.default}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={`${item.isRead ? '' : 'Unread. '}${item.title}. ${
        expanded ? 'Tap to close' : 'Tap to read'
      }`}
    >
      {item.isRead ? null : <View style={[styles.accentBar, { backgroundColor: group.color }]} />}
      <View
        style={[styles.iconWell, { backgroundColor: group.tint }, item.isRead && styles.iconRead]}
      >
        <Ionicons name={group.icon} size={IconSize.lg} color={group.color} />
      </View>
      <View style={styles.cardText}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, item.isRead ? styles.titleRead : styles.titleUnread]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          {item.isRead ? null : <View style={styles.dot} />}
          <View style={styles.spacer} />
          <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={IconSize.sm}
            color={Colors.textLight}
          />
        </View>
        {expanded ? (
          <>
            {/* The first sentence says what happened, the rest what to do about it. */}
            <Text style={styles.lead}>{lead}</Text>
            {rest ? <Text style={styles.rest}>{rest}</Text> : null}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.actionPill, { backgroundColor: group.tint }]}
                onPress={() => onOpen(item)}
                activeOpacity={PressOpacity.default}
                accessibilityRole="button"
                accessibilityLabel={action}
              >
                <Text style={[styles.actionText, { color: group.ink }]}>{action}</Text>
                <Ionicons name="arrow-forward" size={IconSize.sm} color={group.ink} />
              </TouchableOpacity>
              <View style={styles.tools}>
                <TouchableOpacity
                  onPress={() => onToggleRead(item)}
                  hitSlop={HitSlop.sm}
                  accessibilityRole="button"
                  accessibilityLabel={item.isRead ? 'Mark as unread' : 'Mark as read'}
                >
                  <Ionicons
                    name={item.isRead ? 'mail-unread-outline' : 'mail-open-outline'}
                    size={IconSize.lg}
                    color={Colors.secondary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onDelete(item)}
                  hitSlop={HitSlop.sm}
                  accessibilityRole="button"
                  accessibilityLabel="Delete notification"
                >
                  <Ionicons name="trash-outline" size={IconSize.lg} color={Colors.destructive} />
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : (
          <Text style={styles.preview} numberOfLines={2}>
            {item.body}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
});

/** Marks one alert read in the cached list straight away, so the row and the unread count change as it opens. */
function markReadInCache(queryClient: QueryClient, id: number) {
  queryClient.setQueryData<InfiniteData<NotificationPage>>(
    queryKeys.notifications,
    old =>
      old && {
        ...old,
        pages: old.pages.map((page, index) => ({
          ...page,
          unreadCount: index === 0 ? Math.max(0, page.unreadCount - 1) : page.unreadCount,
          items: page.items.map(n => (n.id === id ? { ...n, isRead: true } : n)),
        })),
      },
  );
}

export default function NotificationsScreen({
  navigation,
}: DashboardStackScreenProps<'Notifications'>) {
  const rootNav = useNavigation<NavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: queryKeys.notifications,
    queryFn: ({ pageParam }) => getNotifications(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.hasMore ? pages.length + 1 : undefined),
  });
  const refresh = useRefreshControl(query);

  const items = useMemo(() => query.data?.pages.flatMap(p => p.items) ?? [], [query.data]);
  const unread = query.data?.pages[0]?.unreadCount ?? 0;

  const refreshLists = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    [queryClient],
  );

  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Opening a row to read it is what marks it read.
  const toggleExpand = useCallback(
    (item: AppNotification) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpandedId(current => (current === item.id ? null : item.id));
      if (!item.isRead) {
        markReadInCache(queryClient, item.id);
        markNotificationsRead(item.id)
          .catch(() => undefined)
          .finally(refreshLists);
      }
    },
    [queryClient, refreshLists],
  );

  const open = useCallback(
    (item: AppNotification) => {
      if (!item.isRead)
        markNotificationsRead(item.id)
          .catch(() => undefined)
          .finally(refreshLists);
      openNotification(rootNav, item);
    },
    [rootNav, refreshLists],
  );

  const toggleRead = useCallback(
    (item: AppNotification) => {
      (item.isRead ? markNotificationUnread(item.id) : markNotificationsRead(item.id))
        .catch(() => undefined)
        .finally(refreshLists);
    },
    [refreshLists],
  );

  const remove = useCallback(
    (item: AppNotification) => {
      deleteNotification(item.id)
        .catch(() => undefined)
        .finally(refreshLists);
    },
    [refreshLists],
  );

  const clearAll = useCallback(() => {
    appAlert(
      'Clear all notifications?',
      'They will be removed from this list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear all',
          style: 'destructive',
          icon: 'trash-outline',
          onPress: () => {
            clearNotifications()
              .catch(() => undefined)
              .finally(refreshLists);
          },
        },
      ],
      { tone: 'danger' },
    );
  }, [refreshLists]);

  const markAll = useCallback(() => {
    markNotificationsRead()
      .catch(() => undefined)
      .finally(refreshLists);
  }, [refreshLists]);

  return (
    <View style={styles.container}>
      <WaveScreenHeader title="Notifications" onBack={() => navigation.goBack()} />

      {query.isPending ? null : query.isError && items.length === 0 ? (
        <ReloadState
          message={getErrorMessage(query.error, 'Could not load notifications.')}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <FlatList
          data={items}
          extraData={expandedId}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <NotificationRow
              item={item}
              expanded={item.id === expandedId}
              onToggle={toggleExpand}
              onOpen={open}
              onToggleRead={toggleRead}
              onDelete={remove}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refresh.refreshing}
              onRefresh={refresh.onRefresh}
              {...refreshControlTheme}
            />
          }
          onEndReached={() =>
            query.hasNextPage && !query.isFetchingNextPage && void query.fetchNextPage()
          }
          onEndReachedThreshold={0.4}
          ListHeaderComponent={
            <View style={styles.toolbar}>
              <TouchableOpacity
                style={styles.toolbarBtn}
                onPress={() => navigation.navigate('NotificationSettings')}
                activeOpacity={PressOpacity.default}
                accessibilityRole="button"
                accessibilityLabel="Notification settings"
              >
                <Ionicons name="settings-outline" size={IconSize.md} color={Colors.secondary} />
                <Text style={styles.toolbarText}>Settings</Text>
              </TouchableOpacity>
              {unread > 0 ? (
                <TouchableOpacity
                  style={styles.toolbarBtn}
                  onPress={markAll}
                  activeOpacity={PressOpacity.default}
                  accessibilityRole="button"
                  accessibilityLabel="Mark all as read"
                >
                  <Ionicons
                    name="checkmark-done-outline"
                    size={IconSize.md}
                    color={Colors.secondary}
                  />
                  <Text style={styles.toolbarText}>Mark all read</Text>
                </TouchableOpacity>
              ) : null}
              {items.length > 0 ? (
                <TouchableOpacity
                  style={styles.toolbarBtn}
                  onPress={clearAll}
                  activeOpacity={PressOpacity.default}
                  accessibilityRole="button"
                  accessibilityLabel="Clear all notifications"
                >
                  <Ionicons name="trash-outline" size={IconSize.md} color={Colors.destructive} />
                  <Text style={[styles.toolbarText, styles.toolbarDanger]}>Clear all</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              illustration={BrandImages.emptyNotifications}
              title="Nothing here yet"
              message="Reminders about leads, check-ups and client feedback will show up here."
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { paddingHorizontal: ScreenPad.horizontal, paddingBottom: Spacing.xl, flexGrow: 1 },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  toolbarBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, minHeight: 36 },
  toolbarText: { fontFamily: FontFamily.medium, fontSize: 13, color: Colors.secondary },
  toolbarDanger: { color: Colors.destructive },
  card: {
    flexDirection: 'row',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  // Unread stands out on a white card with a coloured edge and a dot; read ones sit flat on the page colour.
  cardUnread: { backgroundColor: Colors.white },
  cardRead: { backgroundColor: Colors.backgroundTan },
  accentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  iconWell: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRead: { opacity: 0.6 },
  cardText: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  spacer: { flex: 1 },
  title: { ...Typography.headline, fontSize: 14, lineHeight: 20, flexShrink: 1 },
  titleUnread: { fontFamily: FontFamily.bold, color: Colors.textDark },
  titleRead: { fontFamily: FontFamily.medium, color: Colors.textLight },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  preview: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textLight,
    marginTop: 2,
  },
  lead: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textDark,
    marginTop: 2,
  },
  rest: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textLight,
    marginTop: Spacing.xxs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    borderRadius: Radius.full,
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
  },
  actionText: { fontFamily: FontFamily.semibold, fontSize: 12, lineHeight: 16 },
  tools: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  time: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.textLight,
  },
});
