import type { DietItem } from '../types/models';

export interface MealSlot {
  id: string;
  label: string;
  defaults: DietItem[];
}

export interface FoodCatalogItem {
  name: string;
  kcal: number;
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

export const FOOD_CATALOG: FoodCatalogItem[] = [
  { name: 'Boiled egg (1 pc)', kcal: 70 },
  { name: 'Poha (1 bowl)', kcal: 180 },
  { name: 'Idli (2 pc)', kcal: 150 },
  { name: 'Dosa (1 pc)', kcal: 170 },
  { name: 'Upma (1 bowl)', kcal: 190 },
  { name: 'Fruit bowl', kcal: 90 },
  { name: 'Sprouts salad', kcal: 110 },
  { name: 'Rice (1 katori)', kcal: 150 },
  { name: 'Paneer curry (1 katori)', kcal: 220 },
  { name: 'Chicken curry (1 katori)', kcal: 250 },
  { name: 'Fish curry (1 katori)', kcal: 200 },
  { name: 'Salad (1 bowl)', kcal: 40 },
  { name: 'Nuts (mixed, handful)', kcal: 160 },
  { name: 'Milk (1 glass)', kcal: 120 },
  { name: 'Green tea (1 cup)', kcal: 2 },
  { name: 'Biscuits (2 pc)', kcal: 90 },
];
