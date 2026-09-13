import { useQuery } from '@tanstack/react-query';
import { getClientDetail, resolveCheckupAssessmentIds } from '../api/clientApi';
import { queryKeys } from '../api/queryKeys';
import { useMappedClientProfile } from './useMappedClientProfile';
import type { ClientSummary } from '../types/models';

type CheckupAssessmentIdMode = 'checkup' | 'latest';

/**
 * assessmentCode: '' loads latest assessment.
 * assessmentIdMode checkup = same-day resume / else new; latest = keep loaded code (diet-plan save).
 * When latest + route has assessmentCode, reuse Client Detail cache instead of a second ClientDetail call.
 */
export function useCheckupProfile(
  client?: ClientSummary | null,
  options?: { assessmentIdMode?: CheckupAssessmentIdMode },
) {
  const clientCode = client?.clientCode;
  const assessmentIdMode = options?.assessmentIdMode ?? 'checkup';
  const routeAssessmentCode = client?.assessmentCode;
  const reuseDetail = assessmentIdMode === 'latest' && !!routeAssessmentCode;

  const detailQuery = useQuery({
    queryKey: reuseDetail
      ? queryKeys.clientDetail(clientCode, routeAssessmentCode)
      : queryKeys.clientDetailCheckup(clientCode),
    queryFn: () =>
      getClientDetail({
        clientCode,
        assessmentCode: reuseDetail ? routeAssessmentCode : '',
      }),
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
    /** True once ClientDetail has settled (ids usable); does not wait for food-master mapping. */
    detailReady: !!clientCode && !detailQuery.isPending && !detailQuery.isError,
    isLoading: !!clientCode && profileLoading,
    isError: detailQuery.isError,
    error: detailQuery.error,
    dataUpdatedAt: detailQuery.dataUpdatedAt,
    refetch: detailQuery.refetch,
    isFetching: detailQuery.isFetching,
  };
}
