import { apiFetch } from './client';
import type { CoachCategory } from '../types/models';
import type { IoniconName } from '../types/icons';

interface MasterItem {
  itemCode: string;
  itemName: string;
  icon?: string;
  description?: string;
}

// The backend's master-data `icon` field is a free-text string, not guaranteed to be a
// valid Ionicons glyph name — this is the trust boundary where we accept that risk with a
// safe fallback, rather than threading an unchecked `string` through the UI layer.
const DEFAULT_CATEGORY_ICON: IoniconName = 'apps-outline';

export async function getCoachCategories(): Promise<CoachCategory[]> {
  const items = await apiFetch<MasterItem[]>('/v{version}/Master/GetMasterItem?ItemType=CoachType');
  return (items || []).map(item => ({
    code: item.itemCode,
    label: item.itemName,
    icon: (item.icon as IoniconName) || DEFAULT_CATEGORY_ICON,
    description: item.description,
  }));
}

export interface RegisterCoachParams {
  coachName: string;
  coachTypeCode?: string;
  mobile: string;
  email: string;
}

export interface RegisterCoachResult {
  plainPassword: string;
  [key: string]: unknown;
}

export async function registerCoach(params: RegisterCoachParams): Promise<RegisterCoachResult> {
  return apiFetch<RegisterCoachResult>('/v{version}/Coach/save', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
