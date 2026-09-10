export const APP_DISPLAY_NAME = 'Mera Coach';

/** Matches web Contact page — used for support and account deletion requests. */
export const SUPPORT_EMAIL = 'hello@mera-coach.com';

/** Optional public URL for Play Console (set in EAS env when hosted). */
export const PRIVACY_POLICY_URL = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL?.trim() ?? '';

/** Public site for SMS feedback links (EXPO_PUBLIC_WEB_BASE_URL). */
export const WEB_BASE_URL =
  process.env.EXPO_PUBLIC_WEB_BASE_URL?.trim() || 'https://mera-coach.com';

export const FEEDBACK_WEB_BASE_URL = WEB_BASE_URL;

/** Document/list + upload docType for coach public photo gallery. */
export const COACH_GALLERY_DOC_TYPE = 'GALLERY';
export const COACH_GALLERY_REF_TYPE = 'COACH';
export const COACH_GALLERY_MAX_PHOTOS = 12;

/**
 * When true (default if unset), packages / events / gallery use local demo data
 * when the API returns empty or fails, and edits persist on-device via AsyncStorage.
 * Set EXPO_PUBLIC_USE_MVP_MOCKS=false for empty sections without demo seed.
 */
const mvpMocksEnv = process.env.EXPO_PUBLIC_USE_MVP_MOCKS?.trim().toLowerCase();
export const USE_MVP_MOCKS = mvpMocksEnv == null || mvpMocksEnv === '' || mvpMocksEnv === 'true';
