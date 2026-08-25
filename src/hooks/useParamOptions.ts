import { useQuery } from '@tanstack/react-query';
import { getParamList, type MasterOption } from '../api/masterApi';
import { queryKeys } from '../api/queryKeys';

// Live PARAMLIST options with an offline fallback — same pattern CoachListScreen uses for
// categories. Falls back rather than blocking the field while the live list loads.
// Each option is { code: itemCode, label: itemName }; form state should store `code`.
export function useParamMasterOptions(paramCode: string, fallbackLabels: string[]): MasterOption[] {
  const query = useQuery({
    queryKey: queryKeys.paramList(paramCode),
    queryFn: () => getParamList(paramCode),
  });
  if (query.data?.length) return query.data;
  return fallbackLabels.map(label => ({ code: label, label }));
}
