import { MEAL_SLOTS } from './dietCatalog';
import type { ClientProfile, ClientSummary, DietPlan } from '../types/models';

export function createBlankDiet(): DietPlan {
  return MEAL_SLOTS.reduce<DietPlan>((acc, slot) => {
    acc[slot.id] = [];
    return acc;
  }, {});
}

export function createBlankProfile(): ClientProfile {
  return {
    name: '',
    phone: '',
    email: '',
    alternateMobile: '',
    location: '',
    dob: '',
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

// Edit flows seed from ClientDetail via useClientDetailProfile + mapClientDetailToProfile.
// This helper is only for name-only blank shells when no detail IDs exist.
export function getClientProfile(client?: ClientSummary | null): ClientProfile {
  return { ...createBlankProfile(), name: client?.name || '' };
}
