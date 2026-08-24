import { createBlankDiet } from '../data/clientProfiles';
import { MEAL_SLOT_TO_API_LABEL } from '../data/mealSlotLabels';
import type { FoodMaster } from '../api/masterApi';
import type { DietItem, DietPlan } from '../types/models';

export interface RawClientMeal {
  mealSlot?: string;
  curFoodItems?: string;
  curCalories?: number;
}

const API_LABEL_TO_SLOT = Object.fromEntries(
  Object.entries(MEAL_SLOT_TO_API_LABEL).map(([slotId, label]) => [label, slotId]),
) as Record<string, string>;

/** Split meal text into structured name/qty pairs (supports web "2x Roti" and mobile "Roti x2"). */
export function parseFoodItemsText(text: string): { name: string; qty: number }[] {
  return text
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(part => {
      const leadingQty = part.match(/^(\d+)x\s+(.+)$/i);
      if (leadingQty) {
        return { qty: parseInt(leadingQty[1], 10) || 1, name: leadingQty[2].trim() };
      }
      const trailingQty = part.match(/^(.+?)\s+x(\d+)$/i);
      if (trailingQty) {
        return { qty: parseInt(trailingQty[2], 10) || 1, name: trailingQty[1].trim() };
      }
      return { qty: 1, name: part };
    });
}

function masterCalForName(
  name: string,
  masterItems: { name: string; cal: number }[],
): number | null {
  const found = masterItems.find(it => it.name.toLowerCase() === name.toLowerCase());
  return found ? found.cal : null;
}

function assignSlotCalories(
  parsed: { name: string; qty: number }[],
  masterItems: { name: string; cal: number }[],
  slotCalories: number,
): DietItem[] {
  const items: DietItem[] = parsed.map(({ name, qty }) => ({
    name,
    qty,
    kcal: masterCalForName(name, masterItems) ?? 0,
  }));

  const matchedTotal = items.reduce((sum, i) => sum + (i.kcal > 0 ? i.kcal * i.qty : 0), 0);
  const unmatched = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.kcal === 0);

  if (unmatched.length === 0) return items;

  const remaining =
    slotCalories > matchedTotal ? slotCalories - matchedTotal : slotCalories > 0 ? slotCalories : 0;

  if (remaining <= 0) return items;

  const unmatchedQty = unmatched.reduce((sum, { item }) => sum + item.qty, 0);
  const perUnit = Math.max(1, Math.round(remaining / unmatchedQty));

  return items.map(item => (item.kcal > 0 ? item : { ...item, kcal: perUnit }));
}

/** Rebuild ClientProfile.diet from ClientDetail.meals[] — best-effort like web fpRestoreFromText(). */
export function rehydrateDietFromMeals(
  meals: RawClientMeal[] | undefined,
  foodMaster?: FoodMaster,
): DietPlan {
  const diet = createBlankDiet();
  if (!meals?.length) return diet;

  for (const meal of meals) {
    const slotLabel = meal.mealSlot?.trim();
    const slotId = slotLabel ? API_LABEL_TO_SLOT[slotLabel] : undefined;
    if (!slotId) continue;

    const text = (meal.curFoodItems ?? '').trim();
    if (!text) continue;

    const parsed = parseFoodItemsText(text);
    if (parsed.length === 0) continue;

    const masterItems = slotLabel ? (foodMaster?.[slotLabel] ?? []) : [];
    diet[slotId] = assignSlotCalories(parsed, masterItems, meal.curCalories ?? 0);
  }

  return diet;
}
