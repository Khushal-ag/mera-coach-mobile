import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
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
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    query
      .refetch()
      .then(result => {
        if (result.isError) {
          Alert.alert('Refresh failed', getErrorMessage(result.error, 'Please try again.'));
        }
      })
      .finally(() => setRefreshing(false));
  }, [query]);

  return { refreshing, onRefresh };
}
