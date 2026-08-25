/**
 * Document upload / profile APIs return relative paths like
 * `/document/CH001/CH001_….jpg`. React Native Image needs an absolute URI.
 * Matches web: prefix ApiBaseUrl when the path starts with `/document/`.
 */
export function resolveMediaUrl(url?: string | null): string {
  const trimmed = url?.trim() ?? '';
  if (!trimmed) return '';

  if (
    /^https?:\/\//i.test(trimmed) ||
    trimmed.startsWith('file://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('content://') ||
    trimmed.startsWith('ph://') ||
    trimmed.startsWith('assets-library://')
  ) {
    return trimmed;
  }

  const base = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');
  if (!base) return trimmed;

  if (trimmed.startsWith('/')) return `${base}${trimmed}`;
  return `${base}/${trimmed}`;
}
