export const APP_DISPLAY_NAME = 'Mera Coach';

/** Matches web Contact page — used for support and account deletion requests. */
export const SUPPORT_EMAIL = 'hello@mera-coach.com';

/** Optional public URL for Play Console (set in EAS env when hosted). */
export const PRIVACY_POLICY_URL = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL?.trim() ?? '';

/** Public site for SMS feedback links (EXPO_PUBLIC_WEB_BASE_URL). */
export const WEB_BASE_URL =
  process.env.EXPO_PUBLIC_WEB_BASE_URL?.trim() || 'https://mera-coach.com';

/** Document/list + upload docType for coach public photo gallery. */
export const COACH_GALLERY_DOC_TYPE = 'GALLERY';
export const COACH_GALLERY_REF_TYPE = 'COACH';
export const COACH_GALLERY_MAX_PHOTOS = 12;

/** Document upload docTypes for package/event covers (refType COACH; segregated from CLIENT progress photos). */
export const COACH_PACKAGE_IMAGE_DOC_TYPE = 'PACKAGE_IMAGE';
export const COACH_EVENT_IMAGE_DOC_TYPE = 'EVENT_IMAGE';
