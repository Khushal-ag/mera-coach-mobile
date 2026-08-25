import { useQuery } from '@tanstack/react-query';
import { getClientDetail, resolveCheckupAssessmentIds } from '../api/clientApi';
import { queryKeys } from '../api/queryKeys';
import { useMappedClientProfile } from './useMappedClientProfile';
import type { ClientSummary } from '../types/models';

export type CheckupAssessmentIdMode = 'checkup' | 'latest';

/**
 * assessmentCode: '' loads latest assessment.
 * assessmentIdMode checkup = same-day resume / else new; latest = keep loaded code (diet-plan save).
 */
export function useCheckupProfile(
  client?: ClientSummary | null,
  options?: { assessmentIdMode?: CheckupAssessmentIdMode },
) {
  const clientCode = client?.clientCode;
  const assessmentIdMode = options?.assessmentIdMode ?? 'checkup';

  const detailQuery = useQuery({
    queryKey: queryKeys.clientDetailCheckup(clientCode),
    queryFn: () => getClientDetail({ clientCode, assessmentCode: '' }),
    enabled: !!clientCode,
  });

  const { profile, profileLoading } = useMappedClientProfile(detailQuery);
  const ids = detailQuery.data
    ? assessmentIdMode === 'latest'
      ? {
          clientCode: detailQuery.data.clientCode ?? clientCode,
          assessmentCode: detailQuery.data.assessmentCode,
        }
      : resolveCheckupAssessmentIds(detailQuery.data)
    : { clientCode };

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
