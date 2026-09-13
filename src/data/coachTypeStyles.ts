import { Colors } from '../constants/theme';
import type { IoniconName } from '../types/icons';

interface CoachTypeStyle {
  short: string;
  icon: IoniconName;
  color: string;
  bg: string;
}

// Optional brand polish for known coach-type codes. Unknown codes always get a
// fallback so new Master/CoachType rows appear without an app release.
const COACH_TYPE_STYLES: Record<string, CoachTypeStyle> = {
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

/** Brand palette rotation when the code is not in COACH_TYPE_STYLES. */
const FALLBACK_PALETTE: Pick<CoachTypeStyle, 'color' | 'bg'>[] = [
  { color: Colors.primary, bg: Colors.primaryLight },
  { color: Colors.secondary, bg: Colors.secondaryLight },
  { color: Colors.accent, bg: Colors.accentLight },
  { color: Colors.secondaryDark, bg: Colors.secondaryLight },
  { color: Colors.primaryDark, bg: Colors.primaryLight },
];

const DEFAULT_ICON: IoniconName = 'apps-outline';

function paletteForCode(code: string): Pick<CoachTypeStyle, 'color' | 'bg'> {
  let hash = 0;
  for (let i = 0; i < code.length; i += 1) {
    hash = (hash * 31 + code.charCodeAt(i)) | 0;
  }
  return FALLBACK_PALETTE[Math.abs(hash) % FALLBACK_PALETTE.length]!;
}

/** Short pill label from master item name (e.g. "Yoga & Wellness Trainer" → "Yoga"). */
export function shortLabelFromName(label?: string | null): string {
  const trimmed = label?.trim();
  if (!trimmed) return 'Other';
  const withoutRole = trimmed
    .replace(/\s+(&\s+)?(Coach|Trainer|Consultant|Instructor|Specialist)\s*$/i, '')
    .trim();
  const words = (withoutRole || trimmed).split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'Other';
  if (words.length === 1) {
    const only = words[0]!;
    return only.length > 14 ? `${only.slice(0, 12)}…` : only;
  }
  // Prefer a single strong first word when long enough.
  if (words[0]!.length >= 4) {
    return words[0]!.length > 14 ? `${words[0]!.slice(0, 12)}…` : words[0]!;
  }
  return words.slice(0, 2).join(' ');
}

export function getCoachTypeStyle(code: string, label?: string | null): CoachTypeStyle {
  const known = COACH_TYPE_STYLES[code];
  if (known) return known;
  const palette = paletteForCode(code);
  return {
    short: shortLabelFromName(label),
    icon: DEFAULT_ICON,
    color: palette.color,
    bg: palette.bg,
  };
}
