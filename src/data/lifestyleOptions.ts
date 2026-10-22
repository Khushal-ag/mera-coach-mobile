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

// Offline fallbacks for PARAMLIST labels when master fetch is unavailable.
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
 * Wire `code` is `NONE_OF_THE_BELOW`. It is listed first, so the label says "None of the below".
 */
export const NONE_OPTION = {
  code: 'NONE_OF_THE_BELOW',
  label: 'None of the below',
} as const;

// Older data and the server master may still say "None of the above".
const NONE_LABELS = new Set(['none of the above', 'none of the below']);

function isNoneOption(opt: { code: string; label: string }): boolean {
  return opt.code === NONE_OPTION.code || NONE_LABELS.has(opt.label.trim().toLowerCase());
}

/** Prefer a live PARAMLIST code when the master already ships this exclusive option. */
export function resolveNoneCode(options: { code: string; label: string }[]): string {
  const hit = options.find(isNoneOption);
  return hit?.code ?? NONE_OPTION.code;
}

/** True when a stored code/label is the exclusive none sentinel (any known wording). */
export function isNoneValue(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  return isNoneOption({ code: v, label: v });
}

/**
 * Map legacy "None of the above" / synthetic codes onto the live exclusive-none code
 * so multi-select exclusivity and chips stay consistent after master load.
 */
export function coerceNoneValues(
  values: string[],
  options: { code: string; label: string }[],
): string[] {
  const noneCode = resolveNoneCode(options);
  return values.map(v => (isNoneValue(v) ? noneCode : v));
}

/**
 * Ensure "None of the below" exists and is always the first row.
 * Live PARAMLIST may omit it, or include it anywhere in the list (any known code/label), so pin it to the top.
 * Existing server codes are preserved; display label is normalized to "None of the below".
 */
export function ensureNoneFirst<T extends { code: string; label: string }>(options: T[]): T[] {
  const existing = options.find(isNoneOption);
  const rest = options.filter(o => !isNoneOption(o));
  const none = {
    ...(existing ?? { code: NONE_OPTION.code }),
    label: NONE_OPTION.label,
  } as T;
  return [none, ...rest];
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
