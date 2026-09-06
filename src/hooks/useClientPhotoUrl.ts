import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listDocuments } from '../api/documentApi';
import { PHOTO_STALE_MS } from '../api/queryClient';
import { queryKeys } from '../api/queryKeys';
import { resolveMediaUrl } from '../utils/mediaUrl';
import { progressPhotosCoachCode } from './useProgressPhotosQuery';

const DOC_TYPE = 'PROFILE_PIC';
const REF_TYPE = 'CLIENT';

/** Latest client profile photo used as avatar on list/detail screens. */
export function useClientPhotoUrl(clientCode?: string) {
  const coachCode = progressPhotosCoachCode();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.clientProfilePhoto(coachCode, clientCode ?? ''),
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

  const photoUrl = useMemo(() => {
    const items = query.data ?? [];
    if (!items.length) return undefined;
    // Prefer newest by docId — Document/list order is not guaranteed.
    const newest = items.reduce((best, item) => (item.docId > best.docId ? item : best));
    return newest.filePath ? resolveMediaUrl(newest.filePath) : undefined;
  }, [query.data]);

  const invalidate = useCallback(() => {
    if (!coachCode || !clientCode) return;
    // Avatars are not embedded in ClientList — bust only this photo cache.
    void queryClient.invalidateQueries({
      queryKey: queryKeys.clientProfilePhoto(coachCode, clientCode),
    });
  }, [queryClient, coachCode, clientCode]);

  return { photoUrl, isLoading: query.isPending, invalidate };
}
