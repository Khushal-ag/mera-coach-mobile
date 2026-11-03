import { useEffect, useSyncExternalStore } from 'react';
import {
  ensureMpinMatchesLogin,
  getLastLoginId,
  markMpinRestoreFailed,
  restoreMpinState,
  subscribeToMpinState,
} from './mpin';
import {
  getCurrentEmail,
  isAuthInitialized,
  isAuthenticated,
  markAuthRestoreFailed,
  restoreSession,
  subscribeToAuthState,
} from './session';

/**
 * Drives AppNavigator screen trees.
 * - signedIn: JWT valid (direct login via ID and password)
 */
export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

function getSnapshot(): AuthStatus {
  if (!isAuthInitialized()) return 'loading';
  if (!isAuthenticated()) return 'signedOut';
  return 'signedIn';
}

function subscribe(listener: () => void): () => void {
  const unsubSession = subscribeToAuthState(listener);
  const unsubMpin = subscribeToMpinState(listener);
  return () => {
    unsubSession();
    unsubMpin();
  };
}

/**
 * Cold-start restore must run once per JS process.
 * Home also calls useAuthState for UI; re-running restoreMpinState
 * would clear unlockedThisSession and re-show the MPIN gate on every Home tap.
 */
let restorePromise: Promise<void> | null = null;

function ensureAuthRestored(): Promise<void> {
  if (!restorePromise) {
    restorePromise = (async () => {
      try {
        await restoreMpinState();
        await restoreSession();
        // Prefer session email; fall back to remembered login id from SecureStore.
        await ensureMpinMatchesLogin(getCurrentEmail(), getLastLoginId());
      } catch {
        // SecureStore / parse failures must not leave splash on 'loading' forever.
        markMpinRestoreFailed();
        markAuthRestoreFailed();
      }
    })();
  }
  return restorePromise;
}

// No call site needs to manually navigate on login/logout — the session/MPIN stores drive the tree.
export function useAuthState(): AuthStatus {
  useEffect(() => {
    void ensureAuthRestored();
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot);
}
