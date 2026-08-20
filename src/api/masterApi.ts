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
// server-side, not as free text: generate-diet-plan does an internal lookup keyed by these
// exact label strings and throws if the label isn't one it recognizes, so these must be
// fetched live rather than hardcoded to keep them in sync with the backend's vocabulary.
interface RawParamItem {
  itemName: string;
}

export async function getParamList(paramCode: string): Promise<string[]> {
  const data = await apiFetch<RawParamItem[]>(
    `/v{version}/Master/GetMasterItem?ItemType=PARAMLIST&ParamCode=${paramCode}`,
  );
  return (data || []).map(item => item.itemName);
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
