import { useMemo } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { mapClientDetailToProfile, type RawClientDetail } from '../api/clientApi';
import { getFoodMaster } from '../api/masterApi';
import { getCoachProfile } from '../api/coachApi';
import { queryKeys } from '../api/queryKeys';
import type { ClientProfile } from '../types/models';

function mealsNeedFoodMaster(raw?: RawClientDetail): boolean {
  return !!raw?.meals?.some(m => (m.curFoodItems ?? '').trim());
}

/** Map ClientDetail to ClientProfile, optionally waiting for food-master to resolve kcal. */
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

  const foodMasterQuery = useQuery({
    queryKey: queryKeys.foodMaster(coachQuery.data?.country, detailQuery.data?.regionalCuisine),
    queryFn: () =>
      getFoodMaster(coachQuery.data?.country || 'India', detailQuery.data?.regionalCuisine ?? ''),
    enabled: needsFoodMaster && !!detailQuery.data,
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
