import { useQuery } from '@tanstack/react-query';
import { listDocuments } from '../api/documentApi';
import { PHOTO_STALE_MS } from '../api/queryClient';
import { queryKeys } from '../api/queryKeys';
import { getCurrentCoachCode } from '../auth/session';

const DOC_TYPE = 'PROGRESS_PHOTO';
const REF_TYPE = 'CLIENT';

/**
 * Shared Document/list query for ProgressPhotos.
 * Same key + staleTime so wizard and detail screen share one cache entry per client.
 */
export function useProgressPhotosQuery(clientCode?: string) {
  const coachCode = getCurrentCoachCode() ?? '';

  return useQuery({
    queryKey: queryKeys.progressPhotos(coachCode, clientCode ?? ''),
    queryFn: () =>
      listDocuments({
        coachCode,
        refCode: clientCode!,
        refType: REF_TYPE,
        docType: DOC_TYPE,
      }),
    enabled: !!coachCode && !!clientCode,
    staleTime: PHOTO_STALE_MS,
  });
}

export function progressPhotosCoachCode(): string {
  return getCurrentCoachCode() ?? '';
}
