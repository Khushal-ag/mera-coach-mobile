import type { DietPlan } from '../types/models';

interface MealSlot {
  id: string;
  label: string;
}

/** Meal slots of a day. Foods come from the food master (API), never from here. */
export const MEAL_SLOTS: MealSlot[] = [
  { id: 'earlyMorning', label: 'Early Morning' },
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'midMorningSnack', label: 'Mid-Morning Snack' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'eveningSnack', label: 'Evening Snack' },
  { id: 'dinner', label: 'Dinner' },
];

/** True when no meal slot has any food items. */
export function isDietEmpty(diet: DietPlan): boolean {
  return MEAL_SLOTS.every(slot => (diet[slot.id]?.length ?? 0) === 0);
}
