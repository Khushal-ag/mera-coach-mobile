import React, { useCallback, useMemo } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
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
} from '../../api/notificationApi';
import { queryKeys } from '../../api/queryKeys';
import { refreshControlTheme, useRefreshControl } from '../../hooks/useRefreshControl';
import { timeAgo } from '../../notifications/formatTime';
import { openNotification } from '../../notifications/openTarget';
import { appAlert } from '../../utils/appDialog';
import type { IoniconName } from '../../types/icons';
import type { DashboardStackScreenProps, RootStackParamList } from '../../types/navigation';

const GROUP_ICON: Record<string, IoniconName> = {
  LEADS_CLIENTS: 'people-outline',
  BUSINESS: 'briefcase-outline',
  SUBSCRIPTION: 'ribbon-outline',
  FEEDBACK: 'chatbubble-ellipses-outline',
};

const NotificationRow = React.memo(function NotificationRow({
  item,
  onPress,
  onToggleRead,
  onDelete,
}: {
  item: AppNotification;
  onPress: (item: AppNotification) => void;
  onToggleRead: (item: AppNotification) => void;
  onDelete: (item: AppNotification) => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.card, !item.isRead && styles.cardUnread]}
      onPress={() => onPress(item)}
      activeOpacity={PressOpacity.default}
      accessibilityRole="button"
      accessibilityLabel={`${item.isRead ? '' : 'Unread. '}${item.title}. ${item.body}`}
    >
      <View style={styles.iconWell}>
        <Ionicons
          name={GROUP_ICON[item.groupCode] ?? 'notifications-outline'}
          size={IconSize.lg}
          color={Colors.secondary}
        />
      </View>
      <View style={styles.cardText}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, !item.isRead && styles.titleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          {!item.isRead ? <View style={styles.dot} /> : null}
        </View>
        <Text style={styles.body} numberOfLines={3}>
          {item.body}
        </Text>
        <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
      </View>
      <View style={styles.actions}>
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
    </TouchableOpacity>
  );
});

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
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <NotificationRow
              item={item}
              onPress={open}
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
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardUnread: { borderColor: Colors.secondary, backgroundColor: Colors.secondaryLight },
  iconWell: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1 },
  actions: { justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  title: { ...Typography.headline, fontSize: 14, lineHeight: 20, flexShrink: 1 },
  titleUnread: { color: Colors.accentInk },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  body: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textDark,
    marginTop: 2,
  },
  time: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.textLight,
    marginTop: Spacing.xxs,
  },
});
