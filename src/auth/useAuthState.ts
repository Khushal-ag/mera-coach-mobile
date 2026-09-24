import { useEffect, useSyncExternalStore } from 'react';
import {
  ensureMpinMatchesLogin,
  getLastLoginId,
  isMpinConfigured,
  isMpinInitialized,
  isMpinSetupDeferred,
  isMpinUnlocked,
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
 * - needsMpinUnlock: valid JWT + MPIN set, cold start / locked
 * - needsMpinSetup: valid JWT, no MPIN yet, setup not deferred
 * - signedIn: JWT valid and (unlocked or no MPIN gate)
 */
export type AuthStatus =
  'loading' | 'signedOut' | 'needsMpinUnlock' | 'needsMpinSetup' | 'signedIn';

function getSnapshot(): AuthStatus {
  if (!isAuthInitialized() || !isMpinInitialized()) return 'loading';
  if (!isAuthenticated()) return 'signedOut';
  if (isMpinConfigured() && !isMpinUnlocked()) return 'needsMpinUnlock';
  if (!isMpinConfigured() && !isMpinSetupDeferred()) return 'needsMpinSetup';
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
        await ensureMpinMatchesLogin(getCurrentEmail() ?? getLastLoginId());
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
