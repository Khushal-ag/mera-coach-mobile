import { apiFetch } from './client';
import { getCurrentCoachCode, getCurrentCoachName } from '../auth/session';
import { createBlankDiet } from '../data/clientProfiles';
import { MEAL_SLOT_ORDER, MEAL_SLOT_TO_API_LABEL, describeDietItems } from '../data/mealSlotLabels';
import type { BodyMetrics } from '../utils/bmi';
import type { ClientProfile, ClientSummary, DietPlan, GeneratedDietPlan } from '../types/models';

function initialsOf(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

interface RawClientListItem {
  clientCode?: string;
  assessmentCode?: string;
  clientName?: string;
  age?: number;
  status_Cd?: string;
}

function mapClientListItem(raw: RawClientListItem): ClientSummary {
  return {
    id: raw.clientCode,
    clientCode: raw.clientCode,
    assessmentCode: raw.assessmentCode,
    name: raw.clientName ?? '',
    age: raw.age,
    status: raw.status_Cd,
    initials: raw.clientName ? initialsOf(raw.clientName) : undefined,
  };
}

export interface GetClientListParams {
  coachCode?: string;
  searchOption?: string;
  searchText?: string;
}

export async function getClientList(params: GetClientListParams = {}): Promise<ClientSummary[]> {
  const coachCode = params.coachCode ?? getCurrentCoachCode();
  const items = await apiFetch<RawClientListItem[]>('/v{version}/Client/ClientList', {
    method: 'POST',
    body: JSON.stringify({
      coachCode,
      searchOption: params.searchOption,
      searchText: params.searchText,
    }),
  });
  return (items || []).map(mapClientListItem);
}

interface RawClientMeal {
  mealSlot?: string;
  curFoodItems?: string;
  curCalories?: number;
}

// Confirmed against the website's AddClient.cshtml read path (loadClientData()): these fields
// are flat on the response, not nested under a "lifestyle" object.
interface RawClientDetail {
  clientCode?: string;
  assessmentCode?: string;
  clientName?: string;
  mobileNo?: string;
  emailId?: string;
  alternateMobileNo?: string;
  location?: string;
  dob?: string;
  gender?: string;
  assessmentDate?: string;
  age?: number;
  weight?: number;
  height?: number;
  foodPreference?: string;
  regionalCuisine?: string;
  physicalActivity?: string;
  workType?: string;
  sleepDuration?: string;
  pregnancy?: string;
  medicalConditions?: string;
  foodAllergies?: string;
  primaryGoal?: string;
  targetTimeline?: string;
  additionalNotes?: string;
  meals?: RawClientMeal[];
}

function splitCsvField(value: string | undefined): string[] {
  return value
    ? value
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    : [];
}

export async function getClientDetail(params: {
  clientCode?: string;
  assessmentCode?: string;
}): Promise<RawClientDetail> {
  return apiFetch<RawClientDetail>('/v{version}/Client/ClientDetail', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// Diet isn't reconstructed here — the backend stores meals as a flattened per-slot string
// that can't be split back into qty/kcal entries, so edit screens start from a blank diet.
export function mapClientDetailToProfile(raw: RawClientDetail): ClientProfile {
  return {
    name: raw.clientName ?? '',
    phone: raw.mobileNo ?? '',
    email: raw.emailId ?? '',
    age: raw.age != null ? String(raw.age) : '',
    gender: raw.gender ?? '',
    height: raw.height != null ? String(raw.height) : '',
    weight: raw.weight != null ? String(raw.weight) : '',
    physicalActivity: raw.physicalActivity ?? '',
    workType: raw.workType ?? '',
    sleepDuration: raw.sleepDuration ?? '',
    pregnancyBf: raw.pregnancy ?? 'Not Applicable',
    foodPreference: raw.foodPreference ?? '',
    regionalCuisine: raw.regionalCuisine ?? '',
    medicalConditions: splitCsvField(raw.medicalConditions),
    foodAllergies: splitCsvField(raw.foodAllergies),
    primaryGoal: raw.primaryGoal ?? '',
    targetTimeline: raw.targetTimeline ?? '',
    notes: raw.additionalNotes ?? '',
    diet: createBlankDiet(),
    saveBmiCheckup: true,
  };
}

// ── Wizard save chain ──────────────────────────────────────────────────────
// Mirrors the website's AddClient.cshtml save chain exactly: each step's response carries
// clientCode/assessmentCode forward into the next. See the approved plan for the full
// endpoint-by-endpoint contract this was reverse-engineered from.

export interface AssessmentIds {
  clientCode?: string;
  assessmentCode?: string;
}

function savedBy(): string {
  return getCurrentCoachName() ?? '';
}

export async function saveClientDetail(
  profile: ClientProfile,
  ids: AssessmentIds,
): Promise<AssessmentIds> {
  const data = await apiFetch<{ clientCode: string; assessmentCode: string }>(
    '/v{version}/Client/save-client-detail',
    {
      method: 'POST',
      body: JSON.stringify({
        clientCode: ids.clientCode ?? '',
        assessmentCode: ids.assessmentCode ?? '',
        coachCode: getCurrentCoachCode(),
        clientName: profile.name,
        mobileNo: profile.phone,
        emailId: profile.email,
        alternateMobileNo: '',
        location: '',
        dob: '',
        gender: profile.gender,
        assessmentDate: new Date().toISOString().split('T')[0],
        age: parseInt(profile.age, 10) || 0,
        weight: parseFloat(profile.weight) || 0,
        height: parseInt(profile.height, 10) || 0,
        savedBy: savedBy(),
      }),
    },
  );
  return { clientCode: data.clientCode, assessmentCode: data.assessmentCode };
}

export async function saveLifestyle(profile: ClientProfile, ids: AssessmentIds): Promise<void> {
  await apiFetch('/v{version}/Client/save-lifestyle', {
    method: 'POST',
    body: JSON.stringify({
      assessmentCode: ids.assessmentCode,
      coachCode: getCurrentCoachCode(),
      clientCode: ids.clientCode,
      foodPreference: profile.foodPreference,
      regionalCuisine: profile.regionalCuisine,
      physicalActivity: profile.physicalActivity,
      workType: profile.workType,
      sleepDuration: profile.sleepDuration,
      pregnancy: profile.pregnancyBf,
      medicalConditions: profile.medicalConditions.join(', '),
      foodAllergies: profile.foodAllergies.join(', '),
      primaryGoal: profile.primaryGoal,
      targetTimeline: profile.targetTimeline,
      additionalNotes: profile.notes,
      savedBy: savedBy(),
    }),
  });
}

export async function saveMeals(diet: DietPlan, ids: AssessmentIds): Promise<void> {
  const meals = Object.entries(MEAL_SLOT_TO_API_LABEL).map(([slotId, mealSlot]) => {
    const { text, cal } = describeDietItems(diet, slotId);
    return {
      mealSlot,
      mealOrder: MEAL_SLOT_ORDER[slotId],
      curFoodItems: text,
      curCalories: cal,
    };
  });
  await apiFetch('/v{version}/Client/save-meals', {
    method: 'POST',
    body: JSON.stringify({
      assessmentCode: ids.assessmentCode,
      coachCode: getCurrentCoachCode(),
      clientCode: ids.clientCode,
      savedBy: savedBy(),
      meals,
    }),
  });
}

export async function saveBmi(
  metrics: BodyMetrics,
  ids: AssessmentIds,
  totalDailyIntakeCal: number,
): Promise<void> {
  await apiFetch('/v{version}/Client/save-bmi', {
    method: 'POST',
    body: JSON.stringify({
      assessmentCode: ids.assessmentCode,
      bmi: metrics.bmi,
      bmiCategory: metrics.bmiCategory,
      bodyFatPct: metrics.bodyFatPct,
      visceralFat: metrics.visceralFat,
      skeletalMusclePct: metrics.skeletalMusclePct,
      restingMetabolism: metrics.restingMetabolism,
      bodyAge: metrics.bodyAge,
      totalDailyIntakeCal,
      savedBy: savedBy(),
    }),
  });
}

// The AI plan's own mealType labels ("Mid-Morning Snack"/"Evening Snack") differ from the
// canonical DB labels ("Mid Morning"/"Evening") — same mismatch mealSlotLabels.ts solves for
// food-master, but this is the plan-response's own vocabulary, not ours, so it's mapped here.
const PLAN_MEAL_TYPE_TO_DB_LABEL: Record<string, string> = {
  'Mid-Morning Snack': 'Mid Morning',
  'Evening Snack': 'Evening',
};

export async function saveDietPlan(plan: GeneratedDietPlan, ids: AssessmentIds): Promise<void> {
  await apiFetch('/v{version}/Client/save-diet-plan', {
    method: 'POST',
    body: JSON.stringify({
      assessmentCode: ids.assessmentCode,
      coachCode: getCurrentCoachCode(),
      clientCode: ids.clientCode,
      dailyCalTarget: plan.summary?.dailyCalTarget ?? 0,
      bmiCategory: plan.summary?.bmiCategory ?? '',
      waterIntake: plan.recommendations?.waterIntake ?? '',
      foodsToAvoid: plan.recommendations?.foodsToAvoid ?? '',
      supplements: plan.recommendations?.supplements ?? '',
      healthTips: plan.recommendations?.healthTips ?? '',
      savedBy: savedBy(),
      meals: (plan.weeklyPlan || []).map(m => ({
        mealSlot: PLAN_MEAL_TYPE_TO_DB_LABEL[m.mealType] ?? m.mealType,
        plnMealTime: m.mealTime ?? '',
        plnOptions: (m.options || []).join('|'),
        plnCalMin: m.calMin ?? m.caloriesMin ?? 0,
        plnCalMax: m.calMax ?? m.caloriesMax ?? 0,
        plnTip: m.tip ?? '',
      })),
    }),
  });
}

export async function markComplete(ids: AssessmentIds): Promise<void> {
  await apiFetch('/v{version}/Client/mark-complete', {
    method: 'POST',
    body: JSON.stringify({ assessmentCode: ids.assessmentCode, savedBy: savedBy() }),
  });
}

interface RawBmiMeasurement {
  assessmentDate?: string;
  height?: number;
  weight?: number;
  bmi?: number;
  bodyFatPct?: number;
  visceralFat?: number;
  skeletalMusclePct?: number;
  bodyAge?: number;
  restingMetabolism?: number;
}

export interface BmiReport {
  client: { clientName?: string; age?: number; gender?: string; location?: string };
  coach: {
    businessName?: string;
    coachName?: string;
    logoUrl?: string;
    address?: string;
    email?: string;
    mobile?: string;
  };
  current: RawBmiMeasurement;
  history?: RawBmiMeasurement[];
  bmiCategory?: string;
  targetWeight?: number;
  weightDelta?: number;
  reportDate?: string;
}

export async function getBmiReport(ids: AssessmentIds): Promise<BmiReport> {
  const query = new URLSearchParams({ coachCode: getCurrentCoachCode() ?? '' });
  if (ids.clientCode) query.set('clientCode', ids.clientCode);
  if (ids.assessmentCode) query.set('assessmentCode', ids.assessmentCode);
  return apiFetch<BmiReport>(`/v{version}/Client/bmi-report?${query.toString()}`);
}
