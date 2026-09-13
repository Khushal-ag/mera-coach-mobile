/**
 * Document APIs return relative paths like `/document/CH001/….jpg`.
 * Image needs an absolute URI from the same API host as the rest of the app
 * (`EXPO_PUBLIC_API_BASE_URL`) — same pattern as logo / profile / progress.
 */

function isAbsoluteOrLocalUri(url: string): boolean {
  return (
    /^https?:\/\//i.test(url) ||
    url.startsWith('file://') ||
    url.startsWith('data:') ||
    url.startsWith('content://') ||
    url.startsWith('ph://') ||
    url.startsWith('assets-library://')
  );
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

function getApiBaseUrl(): string {
  return trimTrailingSlash(process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || '');
}

export function resolveMediaUrl(url?: string | null): string {
  const trimmed = url?.trim() ?? '';
  if (!trimmed) return '';

  if (isAbsoluteOrLocalUri(trimmed)) return trimmed;

  const base = getApiBaseUrl();
  if (!base) return trimmed;
  return trimmed.startsWith('/') ? `${base}${trimmed}` : `${base}/${trimmed}`;
}

/**
 * 1×1 (or similarly tiny) uploads decode fine but stretch into solid color
 * blocks in cover/contain layouts — treat them as unusable media.
 */
export function isDegenerateImageSize(width?: number | null, height?: number | null): boolean {
  if (width == null || height == null) return false;
  if (!Number.isFinite(width) || !Number.isFinite(height)) return false;
  return width <= 2 || height <= 2;
}

/** True while a picker URI is still uploading (not yet a stored document path). */
export function isPendingLocalMediaUrl(url?: string | null): boolean {
  const trimmed = url?.trim() ?? '';
  if (!trimmed) return false;
  // Local/data URIs only — remote https(s) means upload already finished.
  return isAbsoluteOrLocalUri(trimmed) && !/^https?:\/\//i.test(trimmed);
}

/** Public list prefers profile pic; logo is secondary when present. */
export function resolveCoachPhotoUrl(coach: {
  profilePicUrl?: string | null;
  logoUrl?: string | null;
}): string {
  return resolveMediaUrl(coach.profilePicUrl || coach.logoUrl);
}
