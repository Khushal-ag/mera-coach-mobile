import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { ApiError } from './client';

/** Default list/detail freshness — long enough to avoid tab/app-focus churn. */
export const DEFAULT_STALE_MS = 2 * 60_000;
/** Masters (PARAMLIST, CoachType, food, countries) rarely change. */
export const MASTER_STALE_MS = 45 * 60_000;

// React Query's default online/focus detection uses browser-only APIs that no-op on RN.
onlineManager.setEventListener(setOnline =>
  NetInfo.addEventListener(state => setOnline(!!state.isConnected)),
);

function onAppStateChange(status: AppStateStatus): void {
  if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
}
AppState.addEventListener('change', onAppStateChange);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: DEFAULT_STALE_MS,
      // Mobile: pull-to-refresh is the explicit refresh path; AppState focus would
      // otherwise refetch every stale query whenever the user briefly leaves the app.
      refetchOnWindowFocus: false,
      // Don't retry 4xx — only network failures/5xx are worth a couple of retries.
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});
