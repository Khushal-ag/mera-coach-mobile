import type { NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '../types/navigation';
import { notificationTarget } from './notificationTarget';

/** Opens the screen a notification points at, from anywhere inside the signed-in app. */
export function openNotification(
  navigation: NavigationProp<RootStackParamList>,
  notification: { route: string; refCode?: string },
): void {
  const target = notificationTarget(notification.route, notification.refCode);
  // The target comes from the server as plain strings, so it cannot be checked against the typed screen list.
  navigation.navigate('Main', {
    screen: target.tab,
    params: { screen: target.screen, params: target.params },
  } as never);
}
