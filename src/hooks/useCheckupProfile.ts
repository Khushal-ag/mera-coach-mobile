import { useQuery } from '@tanstack/react-query';
import { getClientDetail, resolveCheckupAssessmentIds } from '../api/clientApi';
import { queryKeys } from '../api/queryKeys';
import { useMappedClientProfile } from './useMappedClientProfile';
import type { ClientSummary } from '../types/models';

/**
 * Load client detail for a full checkup wizard.
 * Uses assessmentCode: '' (latest assessment) and mirrors web same-day resume logic.
 */
export function useCheckupProfile(client?: ClientSummary | null) {
  const clientCode = client?.clientCode;

  const detailQuery = useQuery({
    queryKey: queryKeys.clientDetailCheckup(clientCode),
    queryFn: () => getClientDetail({ clientCode, assessmentCode: '' }),
    enabled: !!clientCode,
  });

  const { profile, profileLoading } = useMappedClientProfile(detailQuery);
  const ids = detailQuery.data ? resolveCheckupAssessmentIds(detailQuery.data) : { clientCode };

  return {
    profile,
    ids,
    isLoading: !!clientCode && profileLoading,
    isError: detailQuery.isError,
    error: detailQuery.error,
    dataUpdatedAt: detailQuery.dataUpdatedAt,
    refetch: detailQuery.refetch,
  };
}
