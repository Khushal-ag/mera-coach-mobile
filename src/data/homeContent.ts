import type { CoachCategory } from '../types/models';
import { getCoachTypeStyle } from './coachTypeStyles';

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
