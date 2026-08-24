import { parseFoodItemsText, rehydrateDietFromMeals } from '../mealRehydration';
import type { FoodMaster } from '../../api/masterApi';

describe('parseFoodItemsText', () => {
  it('parses leading qty (web style)', () => {
    expect(parseFoodItemsText('2x Roti, 1x Dal')).toEqual([
      { qty: 2, name: 'Roti' },
      { qty: 1, name: 'Dal' },
    ]);
  });

  it('parses trailing qty (mobile style)', () => {
    expect(parseFoodItemsText('Roti x2, Dal x1')).toEqual([
      { qty: 2, name: 'Roti' },
      { qty: 1, name: 'Dal' },
    ]);
  });

  it('defaults unmatched parts to qty 1', () => {
    expect(parseFoodItemsText('Banana, Milk')).toEqual([
      { qty: 1, name: 'Banana' },
      { qty: 1, name: 'Milk' },
    ]);
  });

  it('ignores empty segments', () => {
    expect(parseFoodItemsText('  , Roti,  ')).toEqual([{ qty: 1, name: 'Roti' }]);
  });
});

describe('rehydrateDietFromMeals', () => {
  const foodMaster: FoodMaster = {
    Breakfast: [
      { id: '1', name: 'Roti', cal: 100, cat: 'veg' },
      { id: '2', name: 'Dal', cal: 150, cat: 'veg' },
    ],
  };

  it('returns a blank diet when meals are missing', () => {
    const diet = rehydrateDietFromMeals(undefined);
    expect(diet.breakfast).toEqual([]);
    expect(diet.lunch).toEqual([]);
  });

  it('maps API meal slots and resolves kcal from food master', () => {
    const diet = rehydrateDietFromMeals(
      [{ mealSlot: 'Breakfast', curFoodItems: '2x Roti, Dal', curCalories: 350 }],
      foodMaster,
    );
    expect(diet.breakfast).toEqual([
      { name: 'Roti', qty: 2, kcal: 100 },
      { name: 'Dal', qty: 1, kcal: 150 },
    ]);
  });

  it('skips unknown meal slots and empty food text', () => {
    const diet = rehydrateDietFromMeals([
      { mealSlot: 'Unknown Slot', curFoodItems: '2x Roti' },
      { mealSlot: 'Lunch', curFoodItems: '   ' },
    ]);
    expect(diet.lunch).toEqual([]);
    expect(Object.values(diet).every(items => items.length === 0)).toBe(true);
  });

  it('assigns remaining slot calories across unmatched items', () => {
    const diet = rehydrateDietFromMeals(
      [{ mealSlot: 'Breakfast', curFoodItems: 'Roti, Mystery', curCalories: 300 }],
      foodMaster,
    );
    // Roti matched (100); remaining 200 goes to Mystery qty 1
    expect(diet.breakfast).toEqual([
      { name: 'Roti', qty: 1, kcal: 100 },
      { name: 'Mystery', qty: 1, kcal: 200 },
    ]);
  });
});
