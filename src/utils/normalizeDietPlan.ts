import type { GeneratedDietPlan, GeneratedDietPlanMeal } from '../types/models';

/** Replace AI typography dashes/hyphens with plain ASCII for mobile display. */
export function normalizePlanText(value: string): string {
  return value
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-') // hyphens / dashes
    .replace(/\u00A0/g, ' ')
    .trim();
}

function asNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function asText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return normalizePlanText(value);
}

function asOptions(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(v => (typeof v === 'string' ? normalizePlanText(v) : '')).filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) {
    // Some payloads send pipe-joined options (same format used when saving).
    return value
      .split('|')
      .map(s => normalizePlanText(s))
      .filter(Boolean);
  }
  return [];
}

/** Prefer generate shape; also accept save-diet-plan / diet-plan-report meal fields. */
function normalizeMeal(raw: Record<string, unknown>): GeneratedDietPlanMeal {
  return {
    mealType: asText(raw.mealType ?? raw.mealSlot) || 'Meal',
    mealTime: asText(raw.mealTime ?? raw.plnMealTime),
    options: asOptions(raw.options ?? raw.plnOptions),
    calMin: asNumber(raw.calMin ?? raw.caloriesMin ?? raw.plnCalMin),
    calMax: asNumber(raw.calMax ?? raw.caloriesMax ?? raw.plnCalMax),
    tip: asText(raw.tip ?? raw.plnTip) || undefined,
  };
}

function unwrapPlanRoot(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return {};
  const root = raw as Record<string, unknown>;
  for (const key of ['dietPlan', 'plan', 'data', 'report'] as const) {
    const nested = root[key];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      const nestedObj = nested as Record<string, unknown>;
      // Only unwrap when the nested object looks like a plan payload.
      if (
        nestedObj.weeklyPlan != null ||
        nestedObj.meals != null ||
        nestedObj.summary != null ||
        nestedObj.recommendations != null ||
        nestedObj.dailyCalTarget != null
      ) {
        return nestedObj;
      }
    }
  }
  return root;
}

/** True when a normalized plan has meals or any summary/recommendation content to show. */
export function hasDietPlanContent(plan: GeneratedDietPlan | null | undefined): boolean {
  if (!plan) return false;
  if ((plan.weeklyPlan?.length ?? 0) > 0) return true;
  if (plan.summary?.dailyCalTarget || plan.summary?.bmi || plan.summary?.bmiCategory) return true;
  const rec = plan.recommendations;
  if (rec?.waterIntake || rec?.foodsToAvoid || rec?.supplements || rec?.healthTips) {
    return true;
  }
  return false;
}

/**
 * Coerce generate-diet-plan or diet-plan-report responseObj into a stable UI model.
 * Accepts generate shape (summary/weeklyPlan/recommendations) and saved flat shape
 * (dailyCalTarget + meals with pln* fields).
 */
export function normalizeGeneratedDietPlan(raw: unknown): GeneratedDietPlan {
  const root = unwrapPlanRoot(raw);
  const summaryRaw =
    root.summary && typeof root.summary === 'object'
      ? (root.summary as Record<string, unknown>)
      : root;
  const recRaw =
    root.recommendations && typeof root.recommendations === 'object'
      ? (root.recommendations as Record<string, unknown>)
      : root;
  const weeklyRaw = Array.isArray(root.weeklyPlan)
    ? root.weeklyPlan
    : Array.isArray(root.meals)
      ? root.meals
      : [];

  return {
    summary: {
      bmi: asNumber(summaryRaw.bmi),
      bmiCategory: asText(summaryRaw.bmiCategory),
      dailyCalTarget: asNumber(summaryRaw.dailyCalTarget),
    },
    recommendations: {
      waterIntake: asText(recRaw.waterIntake),
      foodsToAvoid: asText(recRaw.foodsToAvoid),
      supplements: asText(recRaw.supplements),
      healthTips: asText(recRaw.healthTips),
    },
    weeklyPlan: weeklyRaw
      .filter((m): m is Record<string, unknown> => !!m && typeof m === 'object')
      .map(normalizeMeal),
  };
}
