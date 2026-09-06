// Param codes for the live PARAMLIST-backed dropdowns (see api/masterApi.ts's getParamList).
export const PARAM_CODES = {
  foodPreference: 'PC001',
  regionalCuisine: 'PC002',
  physicalActivity: 'PC003',
  workType: 'PC004',
  sleepDuration: 'PC005',
  pregnancy: 'PC006',
  primaryGoal: 'PC007',
  targetTimeline: 'PC008',
  medicalConditions: 'PC009',
  foodAllergies: 'PC010',
} as const;

// Offline fallbacks — confirmed against a live GetMasterItem?ItemType=PARAMLIST call per code
// above, so they match the backend's exact vocabulary until a live fetch replaces them.
export const FOOD_PREFERENCES = ['Vegetarian', 'Vegan', 'Eggetarian', 'Non-Vegetarian'];

export const REGIONAL_CUISINES = [
  'North Indian',
  'South Indian',
  'East Indian',
  'West Indian',
  'Continental',
  'Mixed',
];

export const PHYSICAL_ACTIVITY_LEVELS = [
  'Sedentary (little or no exercise)',
  'Lightly Active (1-3 days/week)',
  'Moderately Active (3-5 days/week)',
  'Very Active (6-7 days/week)',
  'Extra Active (physical job)',
];

export const WORK_TYPES = [
  'Desk Job (Sitting)',
  'Field Job (Standing/Moving)',
  'Physical Labour',
  'Work from Home',
  'Homemaker',
  'Student',
];

export const SLEEP_DURATIONS = [
  'Less than 5 hrs',
  '5-6 hrs',
  '6-7 hrs',
  '7-8 hrs',
  'More than 8 hrs',
];

export const PREGNANCY_BF_OPTIONS = [
  'Not Applicable',
  'Pregnant',
  'Breastfeeding',
  'Planning Pregnancy',
];

export const MEDICAL_CONDITIONS = [
  'Diabetes (Type 2)',
  'Diabetes (Type 1)',
  'High Blood Pressure',
  'Low Blood Pressure',
  'Thyroid (Hypothyroid)',
  'Thyroid (Hyperthyroid)',
  'PCOD / PCOS',
  'High Cholesterol',
  'Kidney Issues',
  'Heart Disease',
  'Arthritis / Joint Pain',
];

export const FOOD_ALLERGIES = [
  'Dairy / Lactose',
  'Gluten / Wheat',
  'Nuts',
  'Eggs',
  'Soy',
  'Seafood',
];

/**
 * Synthetic exclusive option for medical/allergy multi-selects.
 * `code` stays `NONE_OF_THE_BELOW` for backend compatibility; UI label is "None of the above".
 */
export const NONE_OF_THE_ABOVE = {
  code: 'NONE_OF_THE_BELOW',
  label: 'None of the above',
} as const;

const NONE_OF_THE_ABOVE_LABELS = new Set(['none of the above', 'none of the below']);

function isNoneOfTheAboveOption(opt: { code: string; label: string }): boolean {
  return (
    opt.code === NONE_OF_THE_ABOVE.code ||
    NONE_OF_THE_ABOVE_LABELS.has(opt.label.trim().toLowerCase())
  );
}

/** Prefer a live PARAMLIST code when the master already ships this exclusive option. */
export function resolveNoneOfTheAboveCode(options: { code: string; label: string }[]): string {
  const hit = options.find(isNoneOfTheAboveOption);
  return hit?.code ?? NONE_OF_THE_ABOVE.code;
}

/** True when a stored code/label is the exclusive none sentinel (any known wording). */
export function isNoneOfTheAboveValue(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  return isNoneOfTheAboveOption({ code: v, label: v });
}

/**
 * Map legacy "None of the below" / synthetic codes onto the live exclusive-none code
 * so multi-select exclusivity and chips stay consistent after master load.
 */
export function coerceNoneOfTheAboveValues(
  values: string[],
  options: { code: string; label: string }[],
): string[] {
  const noneCode = resolveNoneOfTheAboveCode(options);
  return values.map(v => (isNoneOfTheAboveValue(v) ? noneCode : v));
}

/**
 * Ensure "None of the above" exists and is always the last row.
 * Live PARAMLIST may omit it, or include it mid-list (any known code/label) — pin to bottom.
 * Existing server codes are preserved; display label is normalized to "None of the above".
 */
export function ensureNoneOfTheAboveAtBottom<T extends { code: string; label: string }>(
  options: T[],
): T[] {
  const existing = options.find(isNoneOfTheAboveOption);
  const rest = options.filter(o => !isNoneOfTheAboveOption(o));
  const none = {
    ...(existing ?? { code: NONE_OF_THE_ABOVE.code }),
    label: NONE_OF_THE_ABOVE.label,
  } as T;
  return [...rest, none];
}

export const PRIMARY_GOALS = [
  'Weight Loss',
  'Weight Gain',
  'Muscle Building',
  'Maintain Weight',
  'Improve Stamina',
  'Manage Medical Condition',
  'General Wellness',
];

export const TARGET_TIMELINES = [
  '1 Month',
  '2 Months',
  '3 Months',
  '6 Months',
  '1 Year',
  'Ongoing',
];
