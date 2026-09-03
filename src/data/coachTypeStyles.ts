import { Colors } from '../constants/theme';
import type { IoniconName } from '../types/icons';

export interface CoachTypeStyle {
  short: string;
  icon: IoniconName;
  color: string;
  bg: string;
}

// Keyed by the backend's itemCode. Colors/short labels live here.
// Icons prefer the API `icon` FontAwesome class (mapped in fontAwesomeToIonicon);
// these Ionicons are the offline / unknown-glyph fallback.
export const COACH_TYPE_STYLES: Record<string, CoachTypeStyle> = {
  CT001: { short: 'Gym', icon: 'barbell', color: Colors.secondary, bg: Colors.secondaryLight },
  CT002: { short: 'Health', icon: 'heart', color: Colors.primary, bg: Colors.primaryLight },
  CT003: {
    short: 'Holistic',
    icon: 'leaf',
    color: Colors.secondaryDark,
    bg: Colors.secondaryLight,
  },
  CT004: { short: 'Nutrition', icon: 'nutrition', color: Colors.accent, bg: Colors.accentLight },
  CT005: { short: 'Fitness', icon: 'walk', color: Colors.secondaryDark, bg: Colors.accentLight },
  CT006: { short: 'Weight Loss', icon: 'body', color: Colors.primaryDark, bg: Colors.primaryLight },
  CT007: { short: 'Yoga', icon: 'flower', color: Colors.secondary, bg: Colors.secondaryLight },
  CT008: { short: 'Zumba', icon: 'musical-notes', color: Colors.primary, bg: Colors.primaryLight },
};

export const DEFAULT_COACH_TYPE_STYLE: CoachTypeStyle = {
  short: 'Other',
  icon: 'apps-outline',
  color: Colors.textLight,
  bg: Colors.backgroundTan,
};

export function getCoachTypeStyle(code: string): CoachTypeStyle {
  return COACH_TYPE_STYLES[code] ?? DEFAULT_COACH_TYPE_STYLE;
}
