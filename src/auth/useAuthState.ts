import { useEffect, useSyncExternalStore } from 'react';
import {
  isMpinConfigured,
  isMpinInitialized,
  isMpinSetupDeferred,
  isMpinUnlocked,
  restoreMpinState,
  subscribeToMpinState,
} from './mpin';
import {
  isAuthInitialized,
  isAuthenticated,
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

// No call site needs to manually navigate on login/logout — the session/MPIN stores drive the tree.
export function useAuthState(): AuthStatus {
  useEffect(() => {
    void (async () => {
      await restoreMpinState();
      await restoreSession();
      // Password login already proved identity for this process; unlock after restore if
      // saveSession raced ahead... restore always locks MPIN, so unlock only happens via
      // login / verify / setup. Cold start correctly stays locked.
    })();
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot);
}
