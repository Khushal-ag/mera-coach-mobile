import { MEAL_SLOTS } from './dietCatalog';
import type { ClientProfile, ClientSummary, DietPlan } from '../types/models';

export function createBlankDiet(): DietPlan {
  return MEAL_SLOTS.reduce<DietPlan>((acc, slot) => {
    acc[slot.id] = slot.defaults.map(d => ({ ...d }));
    return acc;
  }, {});
}

export function createBlankProfile(): ClientProfile {
  return {
    name: '',
    phone: '',
    email: '',
    age: '',
    gender: '',
    height: '',
    weight: '',
    physicalActivity: '',
    workType: '',
    sleepDuration: '',
    pregnancyBf: 'Not Applicable',
    foodPreference: '',
    regionalCuisine: '',
    medicalConditions: [],
    foodAllergies: [],
    primaryGoal: '',
    targetTimeline: '',
    notes: '',
    diet: createBlankDiet(),
    saveBmiCheckup: true,
  };
}

// Edit flows (Lifestyle/Diet/BMI) have no endpoint yet to seed full fields from — blank
// profile with just the name filled in. Pending Phase 5 (mapClientDetailToProfile).
export function getClientProfile(client?: ClientSummary | null): ClientProfile {
  return { ...createBlankProfile(), name: client?.name || '' };
}
