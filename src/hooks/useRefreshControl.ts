import { useCallback, useState } from 'react';
import type { QueryObserverResult, RefetchOptions } from '@tanstack/react-query';
import { getErrorMessage } from '../api/client';
import { Colors } from '../constants/theme';

interface RefreshableQuery<TData, TError> {
  isRefetching: boolean;
  refetch: (options?: RefetchOptions) => Promise<QueryObserverResult<TData, TError>>;
}

export const refreshControlTheme = {
  tintColor: Colors.secondary,
  colors: [Colors.secondary] as string[],
};

// Do not bind RefreshControl to query.isRefetching — background refetches would
// show a stuck spinner while content is already visible.
export function useRefreshControl<TData, TError = unknown>(query: RefreshableQuery<TData, TError>) {
  return useQueriesRefreshControl([query]);
}

/** Pull-to-refresh across several queries. `refreshError` is for FormErrorBanner. */
export function useQueriesRefreshControl(queries: RefreshableQuery<unknown, unknown>[]) {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshError(null);
    Promise.all(queries.map(q => q.refetch()))
      .then(results => {
        const failed = results.find(r => r.isError);
        if (failed?.isError) {
          setRefreshError(getErrorMessage(failed.error, 'Could not refresh. Please try again.'));
        }
      })
      .finally(() => setRefreshing(false));
  }, [queries]);

  return { refreshing, onRefresh, refreshError };
}
