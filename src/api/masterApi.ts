import { apiFetch, apiGet, apiPost, withQuery } from './client';
import type { GeneratedDietPlan } from '../types/models';
import { normalizeGeneratedDietPlan } from '../utils/normalizeDietPlan';
import type { MasterOption } from '../utils/masterResolve';

export type { MasterOption };
export { resolveMasterLabel, resolveMasterCode, resolveMasterCodes } from '../utils/masterResolve';

interface RawMasterOption {
  itemCode: string;
  itemName: string;
  /** FontAwesome class from Master items, e.g. "fas fa-dumbbell". */
  icon?: string;
  description?: string;
}

/** GetMasterItem fetch; query key casing must match what the endpoint expects. */
export async function fetchMasterItems(
  query: Record<string, string>,
  signal?: AbortSignal,
): Promise<RawMasterOption[]> {
  const items = await apiFetch<RawMasterOption[]>(
    withQuery('/v{version}/Master/GetMasterItem', query),
    { signal },
  );
  return items || [];
}

function mapMasterOptions(items: RawMasterOption[]): MasterOption[] {
  return items.map(i => ({ code: i.itemCode, label: i.itemName }));
}

export async function getCountries(): Promise<MasterOption[]> {
  return mapMasterOptions(await fetchMasterItems({ ItemType: 'Country' }));
}

export interface LocationByPin {
  pinCode?: string;
  city?: string;
  state?: string;
  country?: string;
}

export async function getLocationByPin(
  countryCode: string,
  pinCode: string,
): Promise<LocationByPin | null> {
  return apiGet<LocationByPin | null>('/v{version}/Master/GetLocationByPin', {
    countryCode,
    pinCode,
  });
}

export interface FoodMasterItem {
  id: string;
  name: string;
  cal: number;
  cat: 'veg' | 'nonveg' | 'vegan';
}

// Keyed by the exact meal-slot label strings in mealSlotLabels.ts (e.g. 'Early Morning').
export type FoodMaster = Record<string, FoodMasterItem[]>;

export async function getFoodMaster(country: string, region: string): Promise<FoodMaster> {
  const data = await apiGet<FoodMaster>('/v{version}/Master/food-master', { country, region });
  return data ?? {};
}

export async function getFoodCalories(foodName: string, qty = 1): Promise<number> {
  const data = await apiPost<{ cal?: number }>('/v{version}/Master/food-calories', {
    foodName,
    qty,
  });
  return data?.cal ?? 0;
}

// PARAMLIST (PC001–PC010): form + save use itemCode; UI shows labels via resolveMasterLabel.
export async function getParamList(paramCode: string): Promise<MasterOption[]> {
  const data = await fetchMasterItems({ ItemType: 'PARAMLIST', ParamCode: paramCode });
  return data.map(item => ({
    code: item.itemCode || item.itemName,
    label: item.itemName,
  }));
}

/** POST body for /Master/generate-diet-plan. */
export interface GenerateDietPlanParams {
  clientName: string;
  gender: string;
  age: number;
  weight: number;
  height: number;
  country: string;
  foodType: string;
  cuisine: string;
  activity: string;
  workType: string;
  sleep: string;
  pregnancy: string;
  medical: string;
  allergies: string;
  goal: string;
  timeline: string;
  notes: string;
  curEM: string;
  curEMCal: number;
  curBreakfast: string;
  curBreakfastCal: number;
  curMidMorning: string;
  curMidMorningCal: number;
  curLunch: string;
  curLunchCal: number;
  curEvening: string;
  curEveningCal: number;
  curDinner: string;
  curDinnerCal: number;
}

export async function generateDietPlan(params: GenerateDietPlanParams): Promise<GeneratedDietPlan> {
  const raw = await apiPost<unknown>('/v{version}/Master/generate-diet-plan', params);
  return normalizeGeneratedDietPlan(raw);
}
