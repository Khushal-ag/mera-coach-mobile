import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { registerPushDevice, removePushDevice } from '../api/notificationApi';
import { secureStorage } from '../auth/secureStorage';
import { FALLBACK_CHANNEL_ID, NOTIFICATION_CHANNELS } from './notificationChannels';

const ASKED_KEY = 'push_permission_asked';
const BRAND_COLOR = '#178676';

/** The token this phone last registered, so sign-out can remove exactly it. */
let registeredToken: string | null = null;

/** Show alerts as a banner while the app is open. Call once at start-up. */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Android 8+ needs channels before any alert can show, and Android 13 before it asks for permission. */
async function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const { AndroidImportance, AndroidNotificationVisibility } = Notifications;
  await Promise.all([
    Notifications.setNotificationChannelAsync(FALLBACK_CHANNEL_ID, {
      name: 'Mera Coach alerts',
      importance: AndroidImportance.DEFAULT,
      lightColor: BRAND_COLOR,
    }),
    ...NOTIFICATION_CHANNELS.map(channel =>
      Notifications.setNotificationChannelAsync(channel.id, {
        name: channel.name,
        description: channel.description,
        importance:
          channel.priority === 'high' ? AndroidImportance.HIGH : AndroidImportance.DEFAULT,
        vibrationPattern: [0, 200, 120, 200],
        lightColor: BRAND_COLOR,
        lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
        showBadge: true,
      }),
    ),
  ]);
}

export type PushPermission = 'granted' | 'denied' | 'undetermined';

export async function getPushPermission(): Promise<PushPermission> {
  const p = await Notifications.getPermissionsAsync();
  if (p.granted) return 'granted';
  return p.canAskAgain ? 'undetermined' : 'denied';
}

/** Shows the system permission prompt (Android 13+ and iOS). Resolves to whether it was granted. */
export async function requestPushPermission(): Promise<boolean> {
  await ensureAndroidChannels();
  const p = await Notifications.requestPermissionsAsync();
  return p.granted;
}

/** Whether the coach has already been asked, so the explanation is not shown on every start. */
export async function wasPermissionAsked(): Promise<boolean> {
  return (await secureStorage.getItem(ASKED_KEY)) === '1';
}

export async function markPermissionAsked(): Promise<void> {
  await secureStorage.setItem(ASKED_KEY, '1');
}

/**
 * Gets this phone's Expo push token and tells the API about it. Safe to call on every start:
 * the API updates the existing row. Returns the token, or null when pushes are not possible here
 * (simulator, permission off, or the Firebase config missing from the build).
 */
export async function registerForPush(): Promise<string | null> {
  if (!pushSupported()) return null;
  if ((await getPushPermission()) !== 'granted') return null;
  await ensureAndroidChannels();

  const token = await currentToken();
  if (!token) return null;

  await registerPushDevice({
    pushToken: token,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    appVersion: Constants.expoConfig?.version,
  });
  registeredToken = token;
  return token;
}

/** Stop alerts on this phone. Call while still signed in. Never throws: sign-out must always work. */
export async function unregisterPush(): Promise<void> {
  try {
    // Registration may have failed at start-up (offline), so ask Expo for the token if we do not hold it.
    const token = registeredToken ?? (await currentToken());
    registeredToken = null;
    if (token) await removePushDevice(token);
  } catch {
    // Offline or expired session: the next sign-in on this phone moves the token to that coach.
  }
}

async function currentToken(): Promise<string | null> {
  if (!pushSupported() || (await getPushPermission()) !== 'granted') return null;
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
  return (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
}

/**
 * Push works on a real phone. A development build also tries on an Android emulator, which works when
 * the emulator image includes Google Play. Release builds never run on an emulator, so they are unaffected.
 */
export function pushSupported(): boolean {
  return Device.isDevice || (__DEV__ && Platform.OS === 'android');
}
