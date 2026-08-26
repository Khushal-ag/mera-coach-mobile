import { useMemo } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { mapClientDetailToProfile, type RawClientDetail } from '../api/clientApi';
import { getFoodMaster } from '../api/masterApi';
import { getCoachProfile } from '../api/coachApi';
import { MASTER_STALE_MS } from '../api/queryClient';
import { queryKeys } from '../api/queryKeys';
import type { ClientProfile } from '../types/models';

function mealsNeedFoodMaster(raw?: RawClientDetail): boolean {
  return !!raw?.meals?.some(m => (m.curFoodItems ?? '').trim());
}

/** Waits for food-master when meals need kcal resolution. */
export function useMappedClientProfile(detailQuery: UseQueryResult<RawClientDetail>): {
  profile: ClientProfile | null;
  profileLoading: boolean;
} {
  const needsFoodMaster = mealsNeedFoodMaster(detailQuery.data);

  const coachQuery = useQuery({
    queryKey: queryKeys.coachProfile,
    queryFn: getCoachProfile,
    enabled: needsFoodMaster,
  });

  // Wait for coach to settle so the food-master key does not flip (undefined → real country).
  const country = coachQuery.data?.country || 'India';
  const cuisine = detailQuery.data?.regionalCuisine ?? '';

  const foodMasterQuery = useQuery({
    queryKey: queryKeys.foodMaster(country, cuisine),
    queryFn: () => getFoodMaster(country, cuisine),
    enabled: needsFoodMaster && !!detailQuery.data && !coachQuery.isPending,
    staleTime: MASTER_STALE_MS,
  });

  const profile = useMemo(() => {
    if (!detailQuery.data) return null;
    return mapClientDetailToProfile(detailQuery.data, {
      foodMaster: foodMasterQuery.data,
    });
  }, [detailQuery.data, foodMasterQuery.data]);

  const profileLoading =
    detailQuery.isPending ||
    (needsFoodMaster && (coachQuery.isPending || foodMasterQuery.isPending));

  return { profile, profileLoading };
}
