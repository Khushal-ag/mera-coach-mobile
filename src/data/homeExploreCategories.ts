import { COACH_CATEGORIES } from './homeContent';
import type { CoachCategory } from '../types/models';

/** Client explore screen shows these six categories in this order. */
export const EXPLORE_CATEGORY_CODES = [
  'CT002',
  'CT001',
  'CT007',
  'CT004',
  'CT008',
  'CT003',
] as const;

const EXPLORE_LABELS: Record<string, string> = {
  CT002: 'Health & Wellness Coach',
  CT001: 'Gym Trainer',
  CT007: 'Yoga Coach',
  CT004: 'Diet Coach',
  CT008: 'Zumba',
  CT003: 'Life Coach',
};

const fallbackByCode = new Map(COACH_CATEGORIES.map(cat => [cat.code, cat]));

/** Always returns six explore categories, using API data when available and local fallbacks otherwise. */
export function pickExploreCategories(categories: CoachCategory[]): CoachCategory[] {
  const apiByCode = new Map(categories.map(cat => [cat.code, cat]));

  return EXPLORE_CATEGORY_CODES.map(code => apiByCode.get(code) ?? fallbackByCode.get(code)).filter(
    (cat): cat is CoachCategory => cat != null,
  );
}

export function exploreCategoryLabel(cat: CoachCategory): string {
  return EXPLORE_LABELS[cat.code] ?? cat.label;
}
