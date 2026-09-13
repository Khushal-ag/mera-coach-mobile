import type { DietItem, DietPlan } from '../types/models';

interface MealSlot {
  id: string;
  label: string;
  defaults: DietItem[];
}

export const MEAL_SLOTS: MealSlot[] = [
  {
    id: 'earlyMorning',
    label: 'Early Morning',
    defaults: [
      { name: 'Warm water with lemon', qty: 1, kcal: 5 },
      { name: 'Black coffee (1 cup)', qty: 1, kcal: 5 },
    ],
  },
  {
    id: 'breakfast',
    label: 'Breakfast',
    defaults: [{ name: 'Paratha with butter (1 pc)', qty: 1, kcal: 200 }],
  },
  {
    id: 'midMorningSnack',
    label: 'Mid-Morning Snack',
    defaults: [{ name: 'Buttermilk / Chaas (1 glass)', qty: 1, kcal: 60 }],
  },
  {
    id: 'lunch',
    label: 'Lunch',
    defaults: [
      { name: 'Roti / Chapati (1 pc)', qty: 1, kcal: 80 },
      { name: 'Dal makhani (1 katori)', qty: 1, kcal: 200 },
      { name: 'Sabzi / Veg curry (1 katori)', qty: 1, kcal: 80 },
      { name: 'Curd / Raita (1 katori)', qty: 1, kcal: 120 },
    ],
  },
  {
    id: 'eveningSnack',
    label: 'Evening Snack',
    defaults: [{ name: 'Chai with milk & sugar (1 cup)', qty: 1, kcal: 80 }],
  },
  {
    id: 'dinner',
    label: 'Dinner',
    defaults: [
      { name: 'Roti / Chapati (1 pc)', qty: 1, kcal: 80 },
      { name: 'Sabzi / Veg curry (1 katori)', qty: 1, kcal: 80 },
      { name: 'Mix veg curry (1 katori)', qty: 1, kcal: 120 },
    ],
  },
];

/** True when no meal slot has any food items. */
export function isDietEmpty(diet: DietPlan): boolean {
  return MEAL_SLOTS.every(slot => (diet[slot.id]?.length ?? 0) === 0);
}
