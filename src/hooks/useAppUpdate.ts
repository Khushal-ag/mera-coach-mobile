import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { requireOptionalNativeModule } from 'expo';
import { queryKeys } from '../api/queryKeys';

type InAppUpdates = typeof import('expo-in-app-updates');

/**
 * The module is native. A build made before it was added (an older install, an older dev client,
 * Expo Go) does not contain it, and importing it there throws. So the native side is looked up
 * first, without throwing, and the JS wrapper is only loaded when it exists. Without it the
 * update card simply stays hidden.
 */
function loadInAppUpdates(): InAppUpdates | null {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return null;
  if (!requireOptionalNativeModule('ExpoInAppUpdates')) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-in-app-updates') as InAppUpdates;
  } catch {
    return null;
  }
}

const THIRTY_MINUTES_MS = 30 * 60_000;

export interface AppUpdateState {
  /** True when the store (Google Play on Android, App Store on iOS) has a newer version. */
  available: boolean;
  /** The store's version number. Android only reports a build number, so this is iOS only. */
  storeVersion: string | null;
  starting: boolean;
  /** Message to show when the update could not be started. */
  error: string | null;
  start: () => Promise<void>;
}

/**
 * Asks the store whether a newer app version exists, and starts the update.
 * - Android: Google Play in-app updates (the Play overlay). Only answers for installs that came
 *   from Google Play, so a sideloaded APK never sees a prompt.
 * - iOS: the App Store product page opens over the app.
 * Any failure counts as "no update"; this must never get in the way of the app.
 */
export function useAppUpdate(): AppUpdateState {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: queryKeys.storeUpdate,
    queryFn: async () => {
      const updates = loadInAppUpdates();
      if (!updates) return null;
      try {
        return await updates.checkForUpdate();
      } catch {
        return null;
      }
    },
    staleTime: THIRTY_MINUTES_MS,
    gcTime: THIRTY_MINUTES_MS,
    retry: false,
  });

  const start = useCallback(async () => {
    const updates = loadInAppUpdates();
    if (!updates) return;
    setError(null);
    setStarting(true);
    try {
      const started = await updates.startUpdate();
      if (!started) setError('Could not open the store. Please update from there.');
    } catch {
      setError('Could not start the update. Please try again in a moment.');
    } finally {
      setStarting(false);
    }
  }, []);

  const info = query.data;
  return {
    available: info?.updateAvailable === true,
    storeVersion: Platform.OS === 'ios' && info?.storeVersion ? info.storeVersion : null,
    starting,
    error,
    start,
  };
}
