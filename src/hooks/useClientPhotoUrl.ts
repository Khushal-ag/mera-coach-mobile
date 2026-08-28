import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';
import { resolveMediaUrl } from '../utils/mediaUrl';
import { progressPhotosCoachCode, useProgressPhotosQuery } from './useProgressPhotosQuery';

/** Latest client progress photo used as profile avatar on list/detail screens. */
export function useClientPhotoUrl(clientCode?: string) {
  const coachCode = progressPhotosCoachCode();
  const queryClient = useQueryClient();
  const query = useProgressPhotosQuery(clientCode);

  const photoUrl = useMemo(() => {
    const items = query.data ?? [];
    if (!items.length) return undefined;
    // Prefer newest by docId — Document/list order is not guaranteed.
    const newest = items.reduce((best, item) => (item.docId > best.docId ? item : best));
    return newest.filePath ? resolveMediaUrl(newest.filePath) : undefined;
  }, [query.data]);

  const invalidate = useCallback(() => {
    if (!coachCode || !clientCode) return;
    // Photos are not embedded in ClientList — only bust the shared photo cache.
    void queryClient.invalidateQueries({
      queryKey: queryKeys.progressPhotos(coachCode, clientCode),
    });
  }, [queryClient, coachCode, clientCode]);

  return { photoUrl, isLoading: query.isPending, invalidate };
}
