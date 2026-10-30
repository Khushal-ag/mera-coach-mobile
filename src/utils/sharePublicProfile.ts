import { Platform, Share } from 'react-native';

import { getCurrentCoachCode, getCurrentCoachName } from '../auth/session';
import { WEB_BASE_URL } from '../config/appConfig';

/** Public web profile URL: `{EXPO_PUBLIC_WEB_BASE_URL}/coach/{friendly name}`, or the coach code when there is none yet. */
export function buildCoachPublicProfileUrl(
  coachCode?: string,
  urlFriendlyName?: string,
): string | null {
  const slug = urlFriendlyName?.trim() || (coachCode ?? getCurrentCoachCode())?.trim();
  if (!slug) return null;
  const base = WEB_BASE_URL.replace(/\/$/, '');
  return `${base}/coach/${encodeURIComponent(slug)}`;
}

/**
 * Opens the native share sheet with the coach's public web profile URL.
 * Mirrors web "Share profile" intent.
 */
export async function shareCoachPublicProfile(options?: {
  coachCode?: string;
  coachName?: string;
  urlFriendlyName?: string;
}): Promise<void> {
  const url = buildCoachPublicProfileUrl(options?.coachCode, options?.urlFriendlyName);
  if (!url) {
    throw new Error('Your coach code is missing, so the public profile link cannot be shared.');
  }
  const name = (options?.coachName ?? getCurrentCoachName() ?? 'Coach').trim() || 'Coach';
  const title = `${name} on Mera Coach`;
  const text = `Check out ${name}'s coaching profile on Mera Coach.`;

  await Share.share(
    Platform.OS === 'ios' ? { title, message: text, url } : { title, message: `${text}\n${url}` },
  );
}
