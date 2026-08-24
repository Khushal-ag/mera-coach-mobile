export const APP_DISPLAY_NAME = 'Mera Coach';

/** Matches web Contact page — used for support and account deletion requests. */
export const SUPPORT_EMAIL = 'hello@mera-coach.com';

/** Optional public URL for Play Console (set in EAS env when hosted). */
export const PRIVACY_POLICY_URL = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL?.trim() ?? '';
