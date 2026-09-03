import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { ApiError } from './clientErrors';

/** Default list/detail freshness — long enough to avoid tab/app-focus churn. */
export const DEFAULT_STALE_MS = 2 * 60_000;
/** Masters (PARAMLIST, CoachType, food, countries) rarely change. */
export const MASTER_STALE_MS = 45 * 60_000;
/** Progress photos / client avatars — share cache across list + detail. */
export const PHOTO_STALE_MS = 5 * 60_000;

/**
 * NetInfo often reports `isConnected: null` while status is still unknown.
 * Treating null as offline (`!!null === false`) pauses React Query and cancels
 * in-flight fetches — that showed up as frequent (-1) cancellations.
 */
function isNetOnline(state: { isConnected: boolean | null }): boolean {
  return state.isConnected !== false;
}

// React Query's default online/focus detection uses browser-only APIs that no-op on RN.
onlineManager.setEventListener(setOnline =>
  NetInfo.addEventListener(state => setOnline(isNetOnline(state))),
);

function onAppStateChange(status: AppStateStatus): void {
  if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
}
AppState.addEventListener('change', onAppStateChange);

function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError) {
    // Client / auth errors — don't retry.
    if (error.status >= 400 && error.status < 500) return false;
    // Timeouts and offline fail-fast — retrying just stacks another 30s wait.
    if (error.status === 0) return false;
  }
  return failureCount < 1;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: DEFAULT_STALE_MS,
      // Mobile: pull-to-refresh is the explicit refresh path; AppState focus would
      // otherwise refetch every stale query whenever the user briefly leaves the app.
      refetchOnWindowFocus: false,
      retry: shouldRetryQuery,
    },
  },
});
