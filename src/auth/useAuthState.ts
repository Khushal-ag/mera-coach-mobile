import { useEffect, useSyncExternalStore } from 'react';
import {
  isAuthInitialized,
  isAuthenticated,
  restoreSession,
  subscribeToAuthState,
} from './session';

export type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

function getSnapshot(): AuthStatus {
  if (!isAuthInitialized()) return 'loading';
  return isAuthenticated() ? 'signedIn' : 'signedOut';
}

// Drives AppNavigator's public/protected screen split — no call site needs to manually
// navigate on login/logout, it just changes the session store.
export function useAuthState(): AuthStatus {
  useEffect(() => {
    restoreSession();
  }, []);

  return useSyncExternalStore(subscribeToAuthState, getSnapshot);
}
