import type { CoachCategory } from '../types/models';
import { getCoachTypeStyle } from './coachTypeStyles';

export interface HomeStat {
  value: string;
  label: string;
}

// Aspirational marketing copy — no real aggregate exists yet. Unlike these, "Categories" and
// "Avg. Rating" are computed from live data (see HomeScreen).
export const HOME_STATS: HomeStat[] = [
  { value: '500+', label: 'Verified Coaches' },
  { value: '25K+', label: 'Happy Clients' },
];

// Offline fallback while HomeScreen/RegisterScreen's live category fetch is in flight.
// Mirrors Master/GetMasterItem?ItemType=CoachType; styling always comes from coachTypeStyles.ts.
const FALLBACK_CATEGORY_LABELS: { code: string; label: string }[] = [
  { code: 'CT001', label: 'Gym Trainer' },
  { code: 'CT002', label: 'Health & Wellness Coach' },
  { code: 'CT003', label: 'Holistic Health Coach' },
  { code: 'CT004', label: 'Nutrition & Lifestyle Consultant' },
  { code: 'CT005', label: 'Personal Fitness Trainer' },
  { code: 'CT006', label: 'Weight Loss & Body Transformation Coach' },
  { code: 'CT007', label: 'Yoga & Wellness Trainer' },
  { code: 'CT008', label: 'Zumba' },
];

export const COACH_CATEGORIES: CoachCategory[] = FALLBACK_CATEGORY_LABELS.map(({ code, label }) => {
  const style = getCoachTypeStyle(code);
  return { code, label, short: style.short, icon: style.icon, color: style.color, bg: style.bg };
});
