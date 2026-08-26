import { useQuery } from '@tanstack/react-query';
import { getParamList, type MasterOption } from '../api/masterApi';
import { MASTER_STALE_MS } from '../api/queryClient';
import { queryKeys } from '../api/queryKeys';

// Live PARAMLIST with offline fallback. Form state should store `code` (itemCode).
export function useParamMasterOptions(paramCode: string, fallbackLabels: string[]): MasterOption[] {
  const query = useQuery({
    queryKey: queryKeys.paramList(paramCode),
    queryFn: () => getParamList(paramCode),
    staleTime: MASTER_STALE_MS,
  });
  if (query.data?.length) return query.data;
  return fallbackLabels.map(label => ({ code: label, label }));
}
