import type { IoniconName } from '../types/icons';

/**
 * Master/CoachType returns FontAwesome class strings (e.g. "fas fa-dumbbell").
 * The app renders Ionicons, so we map the FA glyph name to the closest Ionicon.
 */
const FA_TO_IONICON: Record<string, IoniconName> = {
  dumbbell: 'barbell',
  heart: 'heart',
  'heart-pulse': 'heart',
  heartbeat: 'heart',
  leaf: 'leaf',
  seedling: 'leaf',
  spa: 'flower',
  om: 'flower',
  yoga: 'flower',
  apple: 'nutrition',
  'apple-alt': 'nutrition',
  carrot: 'nutrition',
  utensils: 'restaurant',
  music: 'musical-notes',
  'music-note': 'musical-notes',
  walking: 'walk',
  person: 'walk',
  running: 'walk',
  child: 'body',
  weight: 'body',
  'weight-hanging': 'body',
  users: 'people',
  user: 'person',
  'user-friends': 'people',
  brain: 'bulb',
  'hand-holding-heart': 'heart',
  medkit: 'medkit',
  'briefcase-medical': 'medkit',
  fire: 'flame',
  star: 'star',
  home: 'home',
  globe: 'globe',
};

/** Extracts the glyph from "fas fa-dumbbell" / "fa-dumbbell" / "dumbbell". */
export function parseFontAwesomeGlyph(icon: string | null | undefined): string | null {
  if (!icon) return null;
  const parts = icon.trim().toLowerCase().split(/\s+/);
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const part = parts[i];
    if (part.startsWith('fa-') && part.length > 3) return part.slice(3);
  }
  const last = parts[parts.length - 1];
  if (last && !last.startsWith('fa') && last !== 'fas' && last !== 'far' && last !== 'fab') {
    return last;
  }
  return null;
}

type FontAwesomeStyle = 'solid' | 'regular' | 'brand';

export function parseFontAwesomeStyle(icon: string | null | undefined): FontAwesomeStyle {
  if (!icon) return 'solid';
  const parts = icon.trim().toLowerCase().split(/\s+/);
  if (parts.includes('fab')) return 'brand';
  if (parts.includes('far')) return 'regular';
  return 'solid';
}

export function fontAwesomeToIonicon(icon: string | null | undefined): IoniconName | null {
  const glyph = parseFontAwesomeGlyph(icon);
  if (!glyph) return null;
  return FA_TO_IONICON[glyph] ?? null;
}
