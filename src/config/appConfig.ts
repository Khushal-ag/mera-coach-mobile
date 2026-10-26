import { Platform } from 'react-native';

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

/**
 * YouTube channel whose latest videos fill the dashboard carousel: the channel id ("UC" + 22 characters, not the
 * @handle) from EXPO_PUBLIC_YOUTUBE_CHANNEL_ID. Blank hides the carousel. Find a channel's id in YouTube Studio >
 * Settings > Channel > Advanced settings.
 */
export const YOUTUBE_CHANNEL_ID = process.env.EXPO_PUBLIC_YOUTUBE_CHANNEL_ID?.trim() ?? '';

const DEFAULT_PAYMENT_PLATFORMS = 'android';

/** "ios, Android" becomes ['ios', 'android']. "none" (or nothing usable) becomes []. */
export function parsePaymentPlatforms(raw: string | undefined): string[] {
  const text = raw?.trim() ? raw : DEFAULT_PAYMENT_PLATFORMS;
  return text
    .split(',')
    .map(part => part.trim().toLowerCase())
    .filter(part => part === 'ios' || part === 'android');
}

/**
 * Whether this app may send a coach to the website to buy or renew a plan. App Store rules do not allow an in-app link to
 * an outside payment page for a digital subscription (outside a few regions), and Google Play has similar billing rules,
 * so the platforms are chosen by EXPO_PUBLIC_EXTERNAL_PAYMENT_PLATFORMS: "ios", "android", "ios,android" or "none".
 * Unset means Android only. Where it is off, the app only shows the subscription status, with no prices or payment link.
 */
export function externalPaymentsAllowed(
  os: string = Platform.OS,
  raw: string | undefined = process.env.EXPO_PUBLIC_EXTERNAL_PAYMENT_PLATFORMS,
): boolean {
  return parsePaymentPlatforms(raw).includes(os);
}
