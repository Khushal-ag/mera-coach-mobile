/**
 * Coach profile JSON uses the database names (`Profile_Pic_Url`, `Cover_Url`).
 * System.Text.Json camelCase keeps the underscores (`profile_Pic_Url`).
 * Accept both, plus camelCase without underscores, so a casing difference
 * cannot drop the photo or cover before the profile card renders them.
 */

const PROFILE_PIC_KEYS = [
  'profile_Pic_Url',
  'Profile_Pic_Url',
  'profilePicUrl',
  'ProfilePicUrl',
] as const;

const LOGO_KEYS = ['logo_Url', 'Logo_Url', 'logoUrl', 'LogoUrl'] as const;

const COVER_KEYS = ['cover_Url', 'Cover_Url', 'coverUrl', 'CoverUrl'] as const;

function pickString(raw: Record<string, unknown>, keys: readonly string[]): string {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }

  const wanted = new Set(keys.map(key => key.toLowerCase()));
  for (const [key, value] of Object.entries(raw)) {
    if (!wanted.has(key.toLowerCase()) || typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return '';
}

export function readCoachMediaFields(raw: Record<string, unknown>): {
  profilePicUrl: string;
  logoUrl: string;
  coverUrl: string;
} {
  return {
    profilePicUrl: pickString(raw, PROFILE_PIC_KEYS),
    logoUrl: pickString(raw, LOGO_KEYS),
    coverUrl: pickString(raw, COVER_KEYS),
  };
}
