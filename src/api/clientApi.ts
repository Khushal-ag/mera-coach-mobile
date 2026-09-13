import { apiGet, apiPost, ApiError } from './client';
import { getCurrentCoachCode, getCurrentCoachName } from '../auth/session';
import { queryClient } from './queryClient';
import { queryKeys } from './queryKeys';
import { MEAL_SLOT_ORDER, MEAL_SLOT_TO_API_LABEL, describeDietItems } from '../data/mealSlotLabels';
import { rehydrateDietFromMeals, type RawClientMeal } from '../utils/mealRehydration';
import { hasDietPlanContent, normalizeGeneratedDietPlan } from '../utils/normalizeDietPlan';
import type { FoodMaster } from './masterApi';
import { formatLocalDate, normalizeGender, toApiDob, toDisplayDob } from '../utils/validation';
import type { BodyMetrics } from '../utils/bmi';
import type {
  Coach,
  ClientProfile,
  ClientSummary,
  DietPlan,
  GeneratedDietPlan,
  RecheckupDueClient,
  SaveDietPlanResult,
} from '../types/models';

interface RawClientListItem {
  clientCode?: string;
  assessmentCode?: string;
  clientName?: string;
  mobileNo?: string;
  age?: number;
  status_Cd?: string;
  lastCheckupDate?: string;
}

function mapClientListItem(raw: RawClientListItem): ClientSummary {
  const lastCheckupDate = (raw.lastCheckupDate ?? '').trim() || undefined;
  return {
    id: raw.clientCode,
    clientCode: raw.clientCode,
    assessmentCode: raw.assessmentCode,
    name: raw.clientName ?? '',
    mobileNo: (raw.mobileNo ?? '').trim() || undefined,
    age: raw.age,
    status: raw.status_Cd,
    lastCheckupDate,
  };
}

interface GetClientListParams {
  coachCode?: string;
  searchOption?: string;
  searchText?: string;
}

export async function getClientList(params: GetClientListParams = {}): Promise<ClientSummary[]> {
  const coachCode = params.coachCode ?? getCurrentCoachCode();
  const items = await apiPost<RawClientListItem[]>('/v{version}/Client/ClientList', {
    coachCode,
    searchOption: params.searchOption,
    searchText: params.searchText,
  });
  return (items || []).map(mapClientListItem);
}

interface RawRecheckupListItem {
  sNo?: number;
  clientCode?: string;
  clientName?: string;
  mobileNo?: string;
  age?: number;
  lastCheckupDate?: string;
  dueDate?: string;
  daysOverdue?: number;
}

function mapRecheckupListItem(raw: RawRecheckupListItem): RecheckupDueClient {
  const name = raw.clientName ?? '';
  const days =
    typeof raw.daysOverdue === 'number' && Number.isFinite(raw.daysOverdue)
      ? Math.max(0, Math.floor(raw.daysOverdue))
      : 0;
  return {
    clientCode: raw.clientCode,
    name,
    mobileNo: (raw.mobileNo ?? '').trim() || undefined,
    age: raw.age,
    lastCheckupDate: (raw.lastCheckupDate ?? '').trim() || undefined,
    dueDate: (raw.dueDate ?? '').trim() || undefined,
    daysOverdue: days,
  };
}

interface GetRecheckupListParams {
  coachCode?: string;
  searchOption?: string;
  searchText?: string;
}

/** Server-filtered due list (same contract as web RecheckupList). */
export async function getRecheckupList(
  params: GetRecheckupListParams = {},
): Promise<RecheckupDueClient[]> {
  const coachCode = params.coachCode ?? getCurrentCoachCode();
  const items = await apiPost<RawRecheckupListItem[]>('/v{version}/Client/recheckup-list', {
    coachCode,
    searchOption: params.searchOption ?? '',
    searchText: params.searchText ?? '',
  });
  return (items || []).map(mapRecheckupListItem);
}

/** Flat ClientDetail fields (identity + lifestyle + meals on one object). */
export interface RawClientDetail {
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
  // errorCode 1 = no records → empty success at transport; this call needs a payload.
  const raw = await apiPost<RawClientDetail | null>('/v{version}/Client/ClientDetail', params);
  if (raw == null) {
    throw new ApiError('Client not found.', 204);
  }
  return raw;
}

/** Same-day assessment resumes; otherwise start a fresh checkup (empty assessmentCode). */
export function resolveCheckupAssessmentIds(raw: RawClientDetail): AssessmentIds {
  const isToday = raw.assessmentDate === formatLocalDate();
  return {
    clientCode: raw.clientCode,
    assessmentCode: isToday ? raw.assessmentCode : undefined,
  };
}

export function mapClientDetailToProfile(
  raw: RawClientDetail,
  options?: { foodMaster?: FoodMaster },
): ClientProfile {
  return {
    name: raw.clientName ?? '',
    phone: raw.mobileNo ?? '',
    email: raw.emailId ?? '',
    alternateMobile: raw.alternateMobileNo ?? '',
    location: raw.location ?? '',
    dob: toDisplayDob(raw.dob ?? ''),
    age: raw.age != null ? String(raw.age) : '',
    gender: normalizeGender(raw.gender),
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
    diet: rehydrateDietFromMeals(raw.meals, options?.foodMaster),
  };
}

/** Wizard step saves return/update these ids for the next call. */
export interface AssessmentIds {
  clientCode?: string;
  assessmentCode?: string;
}

/** Coach display name for FCBY/savedBy — never coach code or id. */
function savedBy(): string {
  const fromSession = getCurrentCoachName();
  if (fromSession) return fromSession;
  const full = queryClient.getQueryData<{ coachName?: string }>(queryKeys.coachProfileFull);
  const fromFull = full?.coachName?.trim();
  if (fromFull) return fromFull;
  const summary = queryClient.getQueryData<Coach>(queryKeys.coachProfile);
  return summary?.name?.trim() ?? '';
}

function assessmentContext(ids: AssessmentIds) {
  return {
    assessmentCode: ids.assessmentCode,
    coachCode: getCurrentCoachCode(),
    clientCode: ids.clientCode,
    savedBy: savedBy(),
  };
}

export async function saveClientDetail(
  profile: ClientProfile,
  ids: AssessmentIds,
): Promise<AssessmentIds> {
  const data = await apiPost<{ clientCode: string; assessmentCode: string }>(
    '/v{version}/Client/save-client-detail',
    {
      clientCode: ids.clientCode ?? '',
      assessmentCode: ids.assessmentCode ?? '',
      coachCode: getCurrentCoachCode(),
      clientName: profile.name,
      mobileNo: profile.phone,
      emailId: profile.email,
      // Field still required even though the UI no longer collects it.
      alternateMobileNo: '',
      location: profile.location,
      // DOB must be YYYY-MM-DD (same as assessmentDate), not DD/MM/YYYY.
      dob: toApiDob(profile.dob),
      gender: profile.gender,
      assessmentDate: formatLocalDate(),
      age: parseInt(profile.age, 10) || 0,
      weight: parseFloat(profile.weight) || 0,
      height: parseFloat(profile.height) || 0,
      savedBy: savedBy(),
    },
  );
  return { clientCode: data.clientCode, assessmentCode: data.assessmentCode };
}

export async function saveLifestyle(profile: ClientProfile, ids: AssessmentIds): Promise<void> {
  await apiPost('/v{version}/Client/save-lifestyle', {
    ...assessmentContext(ids),
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
  await apiPost('/v{version}/Client/save-meals', {
    ...assessmentContext(ids),
    meals,
  });
}

export async function saveBmi(
  metrics: BodyMetrics,
  ids: AssessmentIds,
  totalDailyIntakeCal: number,
): Promise<void> {
  await apiPost('/v{version}/Client/save-bmi', {
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
  });
}

// AI mealType labels differ from DB meal-slot labels (e.g. "Mid-Morning Snack" → "Mid Morning").
const PLAN_MEAL_TYPE_TO_DB_LABEL: Record<string, string> = {
  'Mid-Morning Snack': 'Mid Morning',
  'Evening Snack': 'Evening',
};

export async function saveDietPlan(
  plan: GeneratedDietPlan,
  ids: AssessmentIds,
): Promise<SaveDietPlanResult> {
  const data = await apiPost<SaveDietPlanResult | null>('/v{version}/Client/save-diet-plan', {
    ...assessmentContext(ids),
    dailyCalTarget: plan.summary?.dailyCalTarget ?? 0,
    bmiCategory: plan.summary?.bmiCategory ?? '',
    waterIntake: plan.recommendations?.waterIntake ?? '',
    foodsToAvoid: plan.recommendations?.foodsToAvoid ?? '',
    supplements: plan.recommendations?.supplements ?? '',
    healthTips: plan.recommendations?.healthTips ?? '',
    meals: (plan.weeklyPlan || []).map(m => ({
      mealSlot: PLAN_MEAL_TYPE_TO_DB_LABEL[m.mealType] ?? m.mealType,
      plnMealTime: m.mealTime ?? '',
      plnOptions: (m.options || []).join('|'),
      plnCalMin: m.calMin ?? 0,
      plnCalMax: m.calMax ?? 0,
      plnTip: m.tip ?? '',
    })),
  });
  return {
    clientCode: data?.clientCode ?? ids.clientCode,
    assessmentCode: data?.assessmentCode ?? ids.assessmentCode,
    status: data?.status,
  };
}

export async function markComplete(ids: AssessmentIds): Promise<void> {
  await apiPost('/v{version}/Client/mark-complete', {
    assessmentCode: ids.assessmentCode,
    savedBy: savedBy(),
  });
}

interface RawBmiMeasurement {
  assessmentDate?: string;
  height?: number;
  weight?: number;
  /** Preferred camelCase field when present. */
  bmi?: number;
  /** Alias some responses use instead of `bmi`. */
  bMI?: number;
  bodyFatPct?: number;
  visceralFat?: number;
  skeletalMusclePct?: number;
  bodyAge?: number;
  restingMetabolism?: number;
}

function normalizeBmiMeasurement(raw?: RawBmiMeasurement | null): RawBmiMeasurement | undefined {
  if (!raw) return undefined;
  const bmi = raw.bmi ?? raw.bMI;
  return bmi === undefined ? raw : { ...raw, bmi };
}

interface BmiReport {
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

export async function getBmiReport(ids: AssessmentIds): Promise<BmiReport | null> {
  const raw = await apiGet<BmiReport | null>('/v{version}/Client/bmi-report', {
    coachCode: getCurrentCoachCode() ?? '',
    clientCode: ids.clientCode || undefined,
    assessmentCode: ids.assessmentCode || undefined,
  });
  if (raw == null) return null;
  return {
    ...raw,
    current: normalizeBmiMeasurement(raw.current) ?? raw.current,
    history: raw.history?.map(row => normalizeBmiMeasurement(row) ?? row),
  };
}

/** Returns null when none exists (HTTP 204 / empty) or payload has no plan content. */
export async function getDietPlanReport(ids: AssessmentIds): Promise<GeneratedDietPlan | null> {
  const raw = await apiGet<unknown>('/v{version}/Client/diet-plan-report', {
    coachCode: getCurrentCoachCode() ?? '',
    clientCode: ids.clientCode || undefined,
    assessmentCode: ids.assessmentCode || undefined,
  });
  if (raw == null) return null;
  const plan = normalizeGeneratedDietPlan(raw);
  return hasDietPlanContent(plan) ? plan : null;
}

interface RawEnquiryLead {
  coachEnquiryLeadId?: number;
  fcdt?: string;
  clientName?: string;
  clientMobile?: string;
  clientEmail?: string;
  lookingFor?: string;
  isContacted?: boolean;
  notes?: string;
}

export interface EnquiryLead {
  id: number;
  dateLabel: string;
  clientName: string;
  clientMobile: string;
  clientEmail: string;
  lookingFor: string;
  isContacted: boolean;
  notes: string;
}

function mapEnquiryLead(raw: RawEnquiryLead): EnquiryLead | null {
  const id = raw.coachEnquiryLeadId;
  if (id == null || !Number.isFinite(id)) return null;
  const clientName = (raw.clientName ?? '').trim();
  return {
    id,
    dateLabel: (raw.fcdt ?? '').trim(),
    clientName,
    clientMobile: (raw.clientMobile ?? '').trim(),
    clientEmail: (raw.clientEmail ?? '').trim(),
    lookingFor: (raw.lookingFor ?? '').trim(),
    isContacted: Boolean(raw.isContacted),
    notes: (raw.notes ?? '').trim(),
  };
}

export async function getEnquiryLeads(coachCode?: string): Promise<EnquiryLead[]> {
  const items = await apiGet<RawEnquiryLead[]>('/v{version}/Client/coach-enquiry-lead', {
    mode: 'list',
    coachCode: coachCode ?? getCurrentCoachCode() ?? '',
  });
  return (items || []).map(mapEnquiryLead).filter((l): l is EnquiryLead => l != null);
}

interface UpdateEnquiryLeadParams {
  leadId: number;
  isContacted?: boolean;
  notes?: string;
}

export async function updateEnquiryLead(params: UpdateEnquiryLeadParams): Promise<void> {
  await apiPost('/v{version}/Client/coach-enquiry-lead', {
    mode: 'update',
    leadId: params.leadId,
    ...(params.isContacted !== undefined ? { isContacted: params.isContacted } : {}),
    ...(params.notes !== undefined ? { notes: params.notes } : {}),
  });
}
