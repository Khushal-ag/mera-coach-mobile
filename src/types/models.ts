import type { IoniconName } from './icons';

export interface Coach {
  id: string;
  name: string;
  categoryCode: string;
  category: string;
  rating: number;
  reviews: number;
  experience: number;
  city: string;
  online: boolean;
  bio: string;
  tags: string[];
  clients: number;
}

export interface CoachCategory {
  code: string;
  label: string;
  short?: string;
  icon: IoniconName;
  color?: string;
  bg?: string;
  description?: string;
}

export interface ClientSummary {
  id?: string;
  name: string;
  goal?: string;
  age?: number;
  status?: string;
  initials?: string;
}

export interface DietItem {
  name: string;
  qty: number;
  kcal: number;
}

export type DietPlan = Record<string, DietItem[]>;

export interface ClientProfile {
  name: string;
  phone: string;
  email: string;
  age: string;
  gender: string;
  height: string;
  weight: string;
  physicalActivity: string;
  workType: string;
  sleepDuration: string;
  pregnancyBf: string;
  foodPreference: string;
  regionalCuisine: string;
  medicalConditions: string[];
  foodAllergies: string[];
  primaryGoal: string;
  targetTimeline: string;
  notes: string;
  diet: DietPlan;
  saveBmiCheckup: boolean;
}

export interface Session {
  token: string;
  coachId?: string;
  coachCode?: string;
  fullName?: string;
  email?: string;
  mobile?: string;
}

export interface BmiCategory {
  label: string;
  color: string;
  bg: string;
}
