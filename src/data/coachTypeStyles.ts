import type { IoniconName } from '../types/icons';

export interface CoachTypeStyle {
  short: string;
  icon: IoniconName;
  color: string;
  bg: string;
}

// Keyed by the backend's itemCode. The API's own `icon` field is a FontAwesome class our
// Ionicons UI can't render, so this is the source of truth instead.
export const COACH_TYPE_STYLES: Record<string, CoachTypeStyle> = {
  CT001: { short: 'Gym', icon: 'barbell', color: '#1b4332', bg: '#e8f5e9' },
  CT002: { short: 'Health', icon: 'heart', color: '#9333ea', bg: '#f3e8ff' },
  CT003: { short: 'Holistic', icon: 'leaf', color: '#2d6a4f', bg: '#e8f5e9' },
  CT004: { short: 'Nutrition', icon: 'nutrition', color: '#c9882a', bg: '#fdf3e0' },
  CT005: { short: 'Fitness', icon: 'walk', color: '#3b82f6', bg: '#e0ecff' },
  CT006: { short: 'Weight Loss', icon: 'body', color: '#ec4899', bg: '#fce7f3' },
  CT007: { short: 'Yoga', icon: 'flower', color: '#0d9488', bg: '#e0f5f3' },
  CT008: { short: 'Zumba', icon: 'musical-notes', color: '#c04b2b', bg: '#fceee9' },
};

export const DEFAULT_COACH_TYPE_STYLE: CoachTypeStyle = {
  short: 'Other',
  icon: 'apps-outline',
  color: '#6b7280',
  bg: '#f3f4f6',
};

export function getCoachTypeStyle(code: string): CoachTypeStyle {
  return COACH_TYPE_STYLES[code] ?? DEFAULT_COACH_TYPE_STYLE;
}
