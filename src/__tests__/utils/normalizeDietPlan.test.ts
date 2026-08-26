import {
  hasDietPlanContent,
  normalizeGeneratedDietPlan,
  normalizePlanText,
} from '../../utils/normalizeDietPlan';

describe('normalizePlanText', () => {
  it('replaces en/em dashes and fancy hyphens with ASCII hyphen', () => {
    expect(normalizePlanText('2.5–3 liters')).toBe('2.5-3 liters');
    expect(normalizePlanText('protein‑rich')).toBe('protein-rich');
    expect(normalizePlanText('omega—3')).toBe('omega-3');
  });
});

describe('normalizeGeneratedDietPlan', () => {
  it('maps the generate-diet-plan response shape used by the API', () => {
    const plan = normalizeGeneratedDietPlan({
      summary: { bmi: 22.1, bmiCategory: 'Normal weight', dailyCalTarget: 2200 },
      weeklyPlan: [
        {
          mealType: 'Breakfast',
          mealTime: '7:30 AM',
          options: ['Idli (≈380 kcal)', 'protein‑rich paneer'],
          calMin: 380,
          calMax: 420,
          tip: 'Choose a protein‑rich filling.',
        },
      ],
      recommendations: {
        waterIntake: '2.5–3 liters daily',
        foodsToAvoid: 'Processed snacks',
        supplements: 'DHA omega‑3',
        healthTips: 'Rest well.',
      },
    });

    expect(plan.summary.dailyCalTarget).toBe(2200);
    expect(plan.weeklyPlan).toHaveLength(1);
    expect(plan.weeklyPlan[0]!.options[1]).toBe('protein-rich paneer');
    expect(plan.weeklyPlan[0]!.calMin).toBe(380);
    expect(plan.weeklyPlan[0]!.tip).toBe('Choose a protein-rich filling.');
    expect(plan.recommendations.waterIntake).toBe('2.5-3 liters daily');
    expect(plan.recommendations.supplements).toBe('DHA omega-3');
  });

  it('accepts caloriesMin/caloriesMax aliases and pipe-joined options', () => {
    const plan = normalizeGeneratedDietPlan({
      weeklyPlan: [
        {
          mealType: 'Lunch',
          options: 'Rice|Dal',
          caloriesMin: 600,
          caloriesMax: 700,
        },
      ],
    });
    expect(plan.weeklyPlan[0]!.options).toEqual(['Rice', 'Dal']);
    expect(plan.weeklyPlan[0]!.calMin).toBe(600);
    expect(plan.weeklyPlan[0]!.calMax).toBe(700);
  });

  it('maps saved diet-plan-report / save shape (flat fields + pln* meals)', () => {
    const plan = normalizeGeneratedDietPlan({
      dailyCalTarget: 1800,
      bmiCategory: 'Overweight',
      waterIntake: '3–3.5 liters',
      foodsToAvoid: 'Fried food',
      supplements: 'Vitamin D',
      healthTips: 'Walk daily',
      meals: [
        {
          mealSlot: 'Breakfast',
          plnMealTime: '8:00 AM',
          plnOptions: 'Oats|Eggs',
          plnCalMin: 300,
          plnCalMax: 400,
          plnTip: 'Keep it light',
        },
      ],
    });

    expect(plan.summary.dailyCalTarget).toBe(1800);
    expect(plan.summary.bmiCategory).toBe('Overweight');
    expect(plan.recommendations.waterIntake).toBe('3-3.5 liters');
    expect(plan.recommendations.foodsToAvoid).toBe('Fried food');
    expect(plan.weeklyPlan).toHaveLength(1);
    expect(plan.weeklyPlan[0]!.mealType).toBe('Breakfast');
    expect(plan.weeklyPlan[0]!.mealTime).toBe('8:00 AM');
    expect(plan.weeklyPlan[0]!.options).toEqual(['Oats', 'Eggs']);
    expect(plan.weeklyPlan[0]!.calMin).toBe(300);
    expect(plan.weeklyPlan[0]!.calMax).toBe(400);
    expect(plan.weeklyPlan[0]!.tip).toBe('Keep it light');
  });

  it('unwraps nested dietPlan payloads', () => {
    const plan = normalizeGeneratedDietPlan({
      dietPlan: {
        summary: { bmi: 21, bmiCategory: 'Normal', dailyCalTarget: 2000 },
        weeklyPlan: [{ mealType: 'Dinner', options: ['Soup'], calMin: 250, calMax: 300 }],
        recommendations: { waterIntake: '2 liters' },
      },
    });
    expect(plan.summary.dailyCalTarget).toBe(2000);
    expect(plan.weeklyPlan[0]!.mealType).toBe('Dinner');
    expect(plan.recommendations.waterIntake).toBe('2 liters');
  });

  it('returns empty defaults for invalid payloads', () => {
    const plan = normalizeGeneratedDietPlan(null);
    expect(plan.summary.bmi).toBe(0);
    expect(plan.weeklyPlan).toEqual([]);
    expect(plan.recommendations.waterIntake).toBe('');
  });
});

describe('hasDietPlanContent', () => {
  it('is false for empty defaults and true when meals exist', () => {
    expect(hasDietPlanContent(normalizeGeneratedDietPlan(null))).toBe(false);
    expect(
      hasDietPlanContent(
        normalizeGeneratedDietPlan({
          weeklyPlan: [{ mealType: 'Lunch', options: ['Dal'], calMin: 1, calMax: 2 }],
        }),
      ),
    ).toBe(true);
  });
});
