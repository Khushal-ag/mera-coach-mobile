export const APP_DISPLAY_NAME = 'Mera Coach';

/** Matches web Contact page — used for support and account deletion requests. */
export const SUPPORT_EMAIL = 'hello@mera-coach.com';

/** Public site for SMS feedback, privacy, and payment fallbacks. */
export const WEB_BASE_URL =
  process.env.EXPO_PUBLIC_WEB_BASE_URL?.trim() || 'https://mera-coach.com';

/**
 * Hosted privacy policy. EXPO_PUBLIC_PRIVACY_POLICY_URL when set, otherwise
 * the public site `/privacy` page so Legal → View online stays wired.
 */
export const PRIVACY_POLICY_URL =
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL?.trim() ||
  `${WEB_BASE_URL.replace(/\/$/, '')}/privacy`;

/**
 * Website checkout opened by Pay Now. Card entry stays on the site.
 * EXPO_PUBLIC_PAYMENT_URL, or {EXPO_PUBLIC_WEB_BASE_URL}/premium.
 * Read at call time so a build-time env change is the value that ships.
 */
export function getPaymentPageUrl(): string {
  const configured = process.env.EXPO_PUBLIC_PAYMENT_URL?.trim();
  if (configured) return configured;
  const web = process.env.EXPO_PUBLIC_WEB_BASE_URL?.trim() || 'https://mera-coach.com';
  return `${web.replace(/\/$/, '')}/premium`;
}

/**
 * Hard limit on Add Client.
 * EXPO_PUBLIC_SUBSCRIPTION_REQUIRED=yes, true, or 1 (case-insensitive, trimmed).
 * no, false, 0, empty, or unset leaves the limit off.
 * Read at call time so a build-time env change is the value that ships.
 */
export function isSubscriptionRequired(): boolean {
  const raw = process.env.EXPO_PUBLIC_SUBSCRIPTION_REQUIRED?.trim().toLowerCase() ?? '';
  return raw === 'yes' || raw === 'true' || raw === '1';
}

/** Owner type of a coach's own uploaded files (post photos and videos). */
export const COACH_GALLERY_REF_TYPE = 'COACH';
