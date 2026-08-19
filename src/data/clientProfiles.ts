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
    pregnancyBf: 'Not Applicable / NA',
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

// Dummy full profiles for the sample clients seeded in ClientListScreen, keyed by id.
const DUMMY_PROFILES: Record<string, Partial<ClientProfile>> = {
  '1': {
    name: 'Priya Sharma',
    age: '28',
    gender: 'Female',
    height: '162',
    weight: '72',
    physicalActivity: 'Sedentary (No exercise)',
    workType: 'Desk Job (Sitting most of day)',
    sleepDuration: '6-8 hours (Ideal)',
    foodPreference: 'Vegetarian',
    regionalCuisine: 'North Indian',
    medicalConditions: ['None of the above'],
    foodAllergies: ['None'],
    primaryGoal: 'Weight Loss',
    targetTimeline: '6 Months',
  },
  '2': {
    name: 'Rahul Verma',
    age: '32',
    gender: 'Male',
    height: '178',
    weight: '82',
    physicalActivity: 'Active (5-6 days/week)',
    workType: 'Field Job (Standing/Walking)',
    sleepDuration: '6-8 hours (Ideal)',
    foodPreference: 'Non-Vegetarian',
    regionalCuisine: 'North Indian',
    medicalConditions: ['None of the above'],
    foodAllergies: ['None'],
    primaryGoal: 'Muscle Gain',
    targetTimeline: '1 Year',
  },
  '3': {
    name: 'Anjali Mehta',
    age: '45',
    gender: 'Female',
    height: '158',
    weight: '68',
    physicalActivity: 'Light (1-2 days/week)',
    workType: 'Home Maker',
    sleepDuration: '5-6 hours',
    foodPreference: 'Vegetarian',
    regionalCuisine: 'West Indian',
    medicalConditions: ['Diabetes (Type 2)'],
    foodAllergies: ['None'],
    primaryGoal: 'Diabetes Management',
    targetTimeline: 'Ongoing',
  },
  '4': {
    name: 'Suresh Patel',
    age: '38',
    gender: 'Male',
    height: '172',
    weight: '84',
    physicalActivity: 'Moderate (3-4 days/week)',
    workType: 'Desk Job (Sitting most of day)',
    sleepDuration: 'Less than 5 hours',
    foodPreference: 'Vegetarian',
    regionalCuisine: 'West Indian',
    medicalConditions: ['Hypertension'],
    foodAllergies: ['None'],
    primaryGoal: 'Weight Loss',
    targetTimeline: '3 Months',
  },
  '5': {
    name: 'Neha Singh',
    age: '26',
    gender: 'Female',
    height: '160',
    weight: '65',
    physicalActivity: 'Light (1-2 days/week)',
    workType: 'Student',
    sleepDuration: '6-8 hours (Ideal)',
    foodPreference: 'Eggetarian',
    regionalCuisine: 'North Indian',
    medicalConditions: ['PCOD/PCOS'],
    foodAllergies: ['Dairy / Lactose'],
    primaryGoal: 'General Wellness',
    targetTimeline: '6 Months',
  },
  '6': {
    name: 'Vikram Rao',
    age: '52',
    gender: 'Male',
    height: '170',
    weight: '79',
    physicalActivity: 'Sedentary (No exercise)',
    workType: 'Desk Job (Sitting most of day)',
    sleepDuration: '5-6 hours',
    foodPreference: 'Non-Vegetarian',
    regionalCuisine: 'South Indian',
    medicalConditions: ['Heart Disease'],
    foodAllergies: ['None'],
    primaryGoal: 'Heart Health',
    targetTimeline: 'Ongoing',
  },
};

export function getClientProfile(client?: ClientSummary | null): ClientProfile {
  const base = createBlankProfile();
  const dummy = (client && DUMMY_PROFILES[client.id ?? '']) || {};
  return {
    ...base,
    ...dummy,
    name: client?.name || dummy.name || base.name,
  };
}
