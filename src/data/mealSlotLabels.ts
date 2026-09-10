import type { DietPlan } from '../types/models';

// Maps internal meal-slot ids (src/data/dietCatalog.ts) to API meal labels
// — only 2 of 6 differ ("Mid-Morning Snack"/"Evening Snack" drop the "Snack" suffix).
export const MEAL_SLOT_TO_API_LABEL: Record<string, string> = {
  earlyMorning: 'Early Morning',
  breakfast: 'Breakfast',
  midMorningSnack: 'Mid Morning',
  lunch: 'Lunch',
  eveningSnack: 'Evening',
  dinner: 'Dinner',
};

export const MEAL_SLOT_ORDER: Record<string, number> = {
  earlyMorning: 1,
  breakfast: 2,
  midMorningSnack: 3,
  lunch: 4,
  eveningSnack: 5,
  dinner: 6,
};

// Flattens one slot's items into free-text summary + total calories
// (curFoodItems/curCalories). Reverse parsing lives in utils/mealRehydration.ts.
export function describeDietItems(diet: DietPlan, slotId: string): { text: string; cal: number } {
  const items = diet[slotId] || [];
  const text = items.map(i => (i.qty > 1 ? `${i.qty}x ${i.name}` : i.name)).join(', ');
  const cal = items.reduce((sum, i) => sum + i.kcal * i.qty, 0);
  return { text, cal };
}
