import { useQuery } from '@tanstack/react-query';
import { getParamList } from '../api/masterApi';
import { queryKeys } from '../api/queryKeys';

// Live PARAMLIST options with an offline fallback — same pattern CoachListScreen uses for
// categories. Falls back rather than blocking the field while the live list loads.
export function useParamOptions(paramCode: string, fallback: string[]): string[] {
  const query = useQuery({
    queryKey: queryKeys.paramList(paramCode),
    queryFn: () => getParamList(paramCode),
  });
  return query.data?.length ? query.data : fallback;
}
