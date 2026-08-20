import { useCallback } from 'react';
import { Alert } from 'react-native';
import type { QueryObserverResult, RefetchOptions } from '@tanstack/react-query';
import { getErrorMessage } from '../api/client';

interface RefreshableQuery<TData, TError> {
  isRefetching: boolean;
  refetch: (options?: RefetchOptions) => Promise<QueryObserverResult<TData, TError>>;
}

// An explicit pull-to-refresh that fails gets a one-off alert, unlike background/initial-load
// failures which are left to each screen's own error UI.
export function useRefreshControl<TData, TError = unknown>(query: RefreshableQuery<TData, TError>) {
  const onRefresh = useCallback(() => {
    query.refetch().then(result => {
      if (result.isError) {
        Alert.alert('Refresh failed', getErrorMessage(result.error, 'Please try again.'));
      }
    });
  }, [query]);

  return { refreshing: query.isRefetching, onRefresh };
}
