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
  /** Short public tagline from profile-by-id when present. */
  tagline?: string;
  tags: string[];
  /** From API `happyClientCount` (Edit Profile "Happy Clients"). */
  clients: number;
  /** Subscription end date (the coach ValidUpto) when the API provides it. */
  validUpto?: string;
  /** Account/coach creation date when the API provides one (used to derive tenure). */
  createdAt?: string;
  /** Present when loaded via profile-by-id; used for WhatsApp. */
  mobile?: string;
  /** Relative or absolute profile photo URL from API (`profile_Pic_Url`). */
  profilePicUrl?: string;
  /** Relative or absolute logo URL from API (`logo_Url`). */
  logoUrl?: string;
  /** Relative or absolute public banner from API (`cover_Url` / `Cover_Url`). */
  coverUrl?: string;
}

export interface CoachCategory {
  code: string;
  label: string;
  short?: string;
  /** Ionicons fallback when API FontAwesome is missing/unknown. */
  icon: IoniconName;
  /** Raw FontAwesome class from Master API, e.g. "fas fa-dumbbell". */
  faIcon?: string;
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
  mobileNo?: string;
  /** Display-ready date string from the API (not always ISO). */
  lastCheckupDate?: string;
}

/** Row from POST /Client/recheckup-list (server already filters to due clients). */
export interface RecheckupDueClient {
  clientCode?: string;
  name: string;
  mobileNo?: string;
  age?: number;
  lastCheckupDate?: string;
  dueDate?: string;
  daysOverdue: number;
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
  calMin: number;
  calMax: number;
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

/** Typical save-diet-plan responseObj. */
export interface SaveDietPlanResult {
  clientCode?: string;
  assessmentCode?: string;
  status?: string;
}

/** Local photo picked on Add Client personal step; uploaded after clientCode exists. */
export interface PendingClientPhoto {
  id: string;
  uri: string;
  /** data-URL for Document/upload; omitted/cleared after successful upload. */
  dataUrl?: string;
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
  /**
   * Optional local photos for Document/upload as PROGRESS_PHOTO after clientCode exists.
   * Not sent to save-client-detail. `dataUrl` is cleared after a successful upload.
   */
  photos?: PendingClientPhoto[];
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
