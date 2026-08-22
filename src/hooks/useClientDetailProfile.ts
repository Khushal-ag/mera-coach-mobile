import { useQuery } from '@tanstack/react-query';
import { getClientDetail, mapClientDetailToProfile } from '../api/clientApi';
import { queryKeys } from '../api/queryKeys';
import { getClientProfile } from '../data/clientProfiles';
import type { ClientProfile, ClientSummary } from '../types/models';

/**
 * Load full client detail for edit wizards.
 * On API failure returns profile: null so screens can block Save (avoids wiping server data).
 */
export function useClientDetailProfile(client?: ClientSummary | null) {
  const clientCode = client?.clientCode;
  const assessmentCode = client?.assessmentCode;
  const hasIds = !!(clientCode || assessmentCode);

  const query = useQuery({
    queryKey: queryKeys.clientDetail(clientCode, assessmentCode),
    queryFn: () => getClientDetail({ clientCode, assessmentCode }),
    enabled: hasIds,
  });

  let profile: ClientProfile | null = null;
  if (query.data) {
    profile = mapClientDetailToProfile(query.data);
  } else if (!hasIds) {
    // No codes to fetch — blank form with name only (rare; Add Client uses createBlankProfile).
    profile = getClientProfile(client);
  } else if (query.isError) {
    profile = null;
  }

  return {
    profile,
    isLoading: hasIds && query.isPending,
    isError: query.isError,
    error: query.error,
    dataUpdatedAt: query.dataUpdatedAt,
    refetch: query.refetch,
  };
}
