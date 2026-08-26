import { buildGenerateDietPlanBody } from '../../utils/generateDietPlanBody';
import { createBlankDiet, createBlankProfile } from '../../data/clientProfiles';

describe('buildGenerateDietPlanBody', () => {
  it('maps profile + meals to the generate-diet-plan schema', () => {
    const diet = createBlankDiet();
    diet.earlyMorning = [{ name: 'Warm water', qty: 1, kcal: 0 }];
    diet.breakfast = [
      { name: 'Idli', qty: 2, kcal: 50 },
      { name: 'Sambar', qty: 1, kcal: 120 },
    ];

    const body = buildGenerateDietPlanBody(
      {
        ...createBlankProfile(),
        name: 'Ananya',
        gender: 'F',
        age: '30',
        weight: '58.5',
        height: '162',
        foodPreference: 'LI0001',
        regionalCuisine: 'LI0005',
        physicalActivity: 'LI0011',
        workType: 'LI0021',
        sleepDuration: 'LI0025',
        pregnancyBf: 'LI0028',
        medicalConditions: ['LI0040', 'LI0041'],
        foodAllergies: ['LI0050'],
        primaryGoal: 'LI0031',
        targetTimeline: 'LI0035',
        notes: 'Prefer home food',
        diet,
      },
      { countryCd: 'IN', cuisineLabel: 'South Indian' },
    );

    expect(body).toEqual({
      clientName: 'Ananya',
      gender: 'F',
      age: 30,
      weight: 58.5,
      height: 162,
      country: 'IN',
      foodType: 'LI0001',
      cuisine: 'South Indian',
      activity: 'LI0011',
      workType: 'LI0021',
      sleep: 'LI0025',
      pregnancy: 'LI0028',
      medical: 'LI0040, LI0041',
      allergies: 'LI0050',
      goal: 'LI0031',
      timeline: 'LI0035',
      notes: 'Prefer home food',
      curEM: 'Warm water',
      curEMCal: 0,
      curBreakfast: '2x Idli, Sambar',
      curBreakfastCal: 220,
      curMidMorning: '',
      curMidMorningCal: 0,
      curLunch: '',
      curLunchCal: 0,
      curEvening: '',
      curEveningCal: 0,
      curDinner: '',
      curDinnerCal: 0,
    });
  });

  it('defaults missing country to IN and empty lifestyle to blank/0', () => {
    const body = buildGenerateDietPlanBody(createBlankProfile(), {
      countryCd: '',
      cuisineLabel: '',
    });
    expect(body.country).toBe('IN');
    expect(body.foodType).toBe('');
    expect(body.cuisine).toBe('');
    expect(body.age).toBe(0);
    expect(body.weight).toBe(0);
    expect(body.curDinnerCal).toBe(0);
  });
});
