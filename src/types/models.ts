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
  country?: string;
  online: boolean;
  bio: string;
  tags: string[];
  /** Marketing "happy clients" from profile API — not the live ClientList count. */
  clients: number;
  /** Account/coach creation date when the API provides one (used to derive tenure). */
  createdAt?: string;
  /** Present when loaded via profile-by-id; used for WhatsApp. */
  mobile?: string;
  /** Relative or absolute profile photo URL from API (`profile_Pic_Url`). */
  profilePicUrl?: string;
  /** Relative or absolute logo URL from API (`logo_Url`). */
  logoUrl?: string;
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
  clientCode?: string;
  assessmentCode?: string;
  name: string;
  goal?: string;
  age?: number;
  status?: string;
  initials?: string;
  mobileNo?: string;
  /** Display-ready date string from the API, not ISO — see utils/recheckup before comparing. */
  lastCheckupDate?: string;
}

export interface DietItem {
  name: string;
  qty: number;
  kcal: number;
}

export type DietPlan = Record<string, DietItem[]>;

export interface GeneratedDietPlanMeal {
  mealType: string;
  mealTime: string;
  options: string[];
  calMin?: number;
  calMax?: number;
  caloriesMin?: number;
  caloriesMax?: number;
  tip?: string;
}

export interface GeneratedDietPlan {
  summary: { bmi: number; bmiCategory: string; dailyCalTarget: number };
  recommendations: {
    waterIntake: string;
    foodsToAvoid: string;
    supplements: string;
    healthTips: string;
  };
  weeklyPlan: GeneratedDietPlanMeal[];
}

export interface ClientProfile {
  name: string;
  phone: string;
  email: string;
  alternateMobile: string;
  location: string;
  /** Date of birth as DD/MM/YYYY for UI; converted to YYYY-MM-DD on save. */
  dob: string;
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
  dietPlan?: GeneratedDietPlan;
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
