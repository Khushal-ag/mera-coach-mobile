import { useEffect } from 'react';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { markNotificationsRead } from '../api/notificationApi';
import { openNotification } from '../notifications/openTarget';
import {
  getPushPermission,
  markPermissionAsked,
  pushSupported,
  registerForPush,
  requestPushPermission,
  wasPermissionAsked,
} from '../notifications/pushRegistration';
import type { RootStackParamList } from '../types/navigation';
import { appAlert } from '../utils/appDialog';

/** Taps already handled in this app process, so a signed-out tap is not replayed on every later sign-in. */
const handledTaps = new Set<string>();

function register(): void {
  registerForPush().catch(err => {
    // Most often the build has no Firebase config yet. Alerts still reach the list; only push is off.
    if (__DEV__) console.warn('Push registration failed:', err);
  });
}

/**
 * Call once while signed in. Registers this phone for push, asks for permission once (with a
 * short explanation first), keeps the bell fresh when an alert arrives, and opens the right
 * screen when one is tapped.
 */
export function usePushNotifications(): void {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!pushSupported()) return;
    let cancelled = false;

    (async () => {
      const permission = await getPushPermission();
      if (cancelled) return;
      if (permission === 'granted') {
        register();
        return;
      }
      if (permission !== 'undetermined' || (await wasPermissionAsked())) return;

      appAlert(
        'Stay on top of your coaching',
        'Turn on notifications to get reminders about new leads, client check-ups and feedback. You can switch any of them off later.',
        [
          { text: 'Not now', style: 'cancel', onPress: () => void markPermissionAsked() },
          {
            text: 'Turn on',
            icon: 'notifications-outline',
            onPress: () => {
              void markPermissionAsked();
              void requestPushPermission().then(granted => granted && register());
            },
          },
        ],
        { tone: 'info' },
      );
    })().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const refreshLists = () => void queryClient.invalidateQueries({ queryKey: ['notifications'] });

    const handleTap = (response: Notifications.NotificationResponse) => {
      const id = response.notification.request.identifier;
      if (handledTaps.has(id)) return;
      handledTaps.add(id);

      const data = response.notification.request.content.data as Record<string, unknown>;
      const notificationId = Number(data.notificationId);
      if (notificationId > 0) {
        markNotificationsRead(notificationId)
          .catch(() => undefined)
          .finally(refreshLists);
      }
      openNotification(navigation, {
        route: typeof data.route === 'string' ? data.route : '',
        refCode: typeof data.refCode === 'string' ? data.refCode : '',
      });
    };

    const received = Notifications.addNotificationReceivedListener(refreshLists);
    const tapped = Notifications.addNotificationResponseReceivedListener(handleTap);
    // The tap that opened the app from a closed state.
    void Notifications.getLastNotificationResponseAsync().then(r => {
      if (!r) return;
      handleTap(r);
      // Forget it, so a later cold start does not reopen the same screen.
      void Notifications.clearLastNotificationResponseAsync();
    });

    return () => {
      received.remove();
      tapped.remove();
    };
  }, [navigation, queryClient]);
}
