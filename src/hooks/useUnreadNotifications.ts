import { useQuery } from '@tanstack/react-query';
import { getUnreadNotificationCount } from '../api/notificationApi';
import { queryKeys } from '../api/queryKeys';

/**
 * Number on the bell. Refreshed when a push arrives or an alert is read, and once a minute while the app is open.
 * shortcut: polls instead of subscribing, fine for one small count per coach.
 */
export function useUnreadNotifications(): number {
  const query = useQuery({
    queryKey: queryKeys.notificationUnread,
    queryFn: getUnreadNotificationCount,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  return query.data ?? 0;
}
