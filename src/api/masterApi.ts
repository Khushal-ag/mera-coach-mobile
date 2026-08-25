import { apiFetch } from './client';
import type { GeneratedDietPlan } from '../types/models';

export interface MasterOption {
  code: string;
  label: string;
}

interface RawMasterOption {
  itemCode: string;
  itemName: string;
}

export async function getCountries(): Promise<MasterOption[]> {
  const items = await apiFetch<RawMasterOption[]>(
    '/v{version}/Master/GetMasterItem?ItemType=Country',
  );
  return (items || []).map(i => ({ code: i.itemCode, label: i.itemName }));
}

/** Response from GET /Master/GetLocationByPin (city/state autofill). */
export interface LocationByPin {
  pinCode?: string;
  city?: string;
  state?: string;
  country?: string;
}

export async function getLocationByPin(
  countryCode: string,
  pinCode: string,
): Promise<LocationByPin> {
  const query = new URLSearchParams({ countryCode, pinCode });
  return apiFetch<LocationByPin>(`/v{version}/Master/GetLocationByPin?${query.toString()}`);
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
  const query = new URLSearchParams({ country, region });
  const data = await apiFetch<FoodMaster>(`/v{version}/Master/food-master?${query.toString()}`);
  return data ?? {};
}

export async function getFoodCalories(foodName: string, qty = 1): Promise<number> {
  const data = await apiFetch<{ cal?: number }>('/v{version}/Master/food-calories', {
    method: 'POST',
    body: JSON.stringify({ foodName, qty }),
  });
  return data?.cal ?? 0;
}

// Backing dropdown/multi-select vocabulary (food type, cuisine, activity, work type, sleep,
// pregnancy, medical conditions, allergies, goal, timeline — param codes PC001-PC010) lives
// server-side. ClientDetail / save-lifestyle store itemCode (e.g. LI0031); web dropdowns use
// value=itemCode, text=itemName. Mobile matches: form state + save payloads use codes; UI shows
// labels via resolveMasterLabel.
export async function getParamList(paramCode: string): Promise<MasterOption[]> {
  const data = await apiFetch<RawMasterOption[]>(
    `/v{version}/Master/GetMasterItem?ItemType=PARAMLIST&ParamCode=${paramCode}`,
  );
  return (data || []).map(item => ({
    code: item.itemCode || item.itemName,
    label: item.itemName,
  }));
}

/** Map a stored master code (or already-human label) to the display name. */
export function resolveMasterLabel(
  value: string | undefined | null,
  options: MasterOption[],
): string {
  const v = (value ?? '').trim();
  if (!v) return '';
  const byCode = options.find(o => o.code === v);
  if (byCode) return byCode.label;
  const byLabel = options.find(o => o.label === v);
  if (byLabel) return byLabel.label;
  return v;
}

/** Normalize a stored code or legacy label to the master itemCode for form state / save. */
export function resolveMasterCode(
  value: string | undefined | null,
  options: MasterOption[],
): string {
  const v = (value ?? '').trim();
  if (!v) return '';
  const byCode = options.find(o => o.code === v);
  if (byCode) return byCode.code;
  const byLabel = options.find(o => o.label === v);
  if (byLabel) return byLabel.code;
  return v;
}

/** Normalize a CSV/multi-select list of codes or legacy labels to itemCodes. */
export function resolveMasterCodes(values: string[], options: MasterOption[]): string[] {
  return values.map(v => resolveMasterCode(v, options)).filter(Boolean);
}

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
  return apiFetch<GeneratedDietPlan>('/v{version}/Master/generate-diet-plan', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
