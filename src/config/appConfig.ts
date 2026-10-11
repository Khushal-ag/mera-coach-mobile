export const APP_DISPLAY_NAME = 'Mera Coach';

/** Matches web Contact page — used for support and account deletion requests. */
export const SUPPORT_EMAIL = 'hello@mera-coach.com';

/** Optional public URL for Play Console (set in EAS env when hosted). */
export const PRIVACY_POLICY_URL = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL?.trim() ?? '';

/** Public site for SMS feedback links (EXPO_PUBLIC_WEB_BASE_URL). */
export const WEB_BASE_URL =
  process.env.EXPO_PUBLIC_WEB_BASE_URL?.trim() || 'https://mera-coach.com';

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

/** Document/list + upload docType for coach public photo gallery. */
export const COACH_GALLERY_DOC_TYPE = 'GALLERY';
export const COACH_GALLERY_REF_TYPE = 'COACH';
export const COACH_GALLERY_MAX_PHOTOS = 12;

/** Document upload docTypes for package/event covers (refType COACH; segregated from CLIENT progress photos). */
export const COACH_PACKAGE_IMAGE_DOC_TYPE = 'PACKAGE_IMAGE';
export const COACH_EVENT_IMAGE_DOC_TYPE = 'EVENT_IMAGE';
