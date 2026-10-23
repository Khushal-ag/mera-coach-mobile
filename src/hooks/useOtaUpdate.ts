import { useCallback, useEffect } from 'react';
import * as Updates from 'expo-updates';

export interface OtaUpdateState {
  /** True once a JS update has been downloaded and only needs a restart. */
  ready: boolean;
  /** True while checking or downloading. */
  busy: boolean;
  applyNow: () => void;
}

/**
 * Over-the-air (JavaScript only) updates through expo-updates. The check runs once when the
 * screen that uses this hook mounts. It does nothing in development builds and Expo Go,
 * where `Updates.isEnabled` is false.
 */
export function useOtaUpdate(): OtaUpdateState {
  const { isUpdateAvailable, isUpdatePending, isChecking, isDownloading } = Updates.useUpdates();

  useEffect(() => {
    if (!Updates.isEnabled) return;
    let cancelled = false;
    void (async () => {
      try {
        const result = await Updates.checkForUpdateAsync();
        if (!cancelled && result.isAvailable) await Updates.fetchUpdateAsync();
      } catch {
        // No network, or the update server is down. The next launch tries again.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyNow = useCallback(() => {
    void Updates.reloadAsync().catch(() => undefined);
  }, []);

  return {
    ready: Updates.isEnabled && isUpdatePending,
    busy:
      Updates.isEnabled && (isChecking || isDownloading || (isUpdateAvailable && !isUpdatePending)),
    applyNow,
  };
}
