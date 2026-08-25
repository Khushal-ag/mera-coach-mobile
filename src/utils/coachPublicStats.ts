/**
 * Public coach stats helpers.
 *
 * Backend notes (confirmed against live GET /Coach/public):
 * - `happyClientCount` is the Edit Profile "Happy Clients" marketing field — NOT
 *   the live POST /Client/ClientList roster length.
 * - On the public list, `reviewCount` currently equals `happyClientCount` for every
 *   coach (they move together). profile-by-id often omits `reviewCount`.
 * - `rating` is often seeded (~3.5) even when `reviewCount` is 0.
 *
 * When the viewer is logged in as this coach and ClientList is loaded, prefer live
 * roster length for Clients / Happy Clients. Everyone else sees happyClientCount.
 *
 * Display rule: only show stats with real positive values. Hide zero/empty clients,
 * experience, services, and unreviewed ratings — never use em-dash placeholders.
 */

export type PublicStatItem = {
  key: string;
  value: string;
  label: string;
};

export function resolvePublicClientCount(opts: {
  coachId: string;
  /** Mapped from API `happyClientCount`. */
  marketingClients: number;
  viewerCoachCode?: string | null;
  /** Live roster length when the viewer is this coach; omit when unknown. */
  liveRosterLength?: number | null;
}): number {
  const { coachId, marketingClients, viewerCoachCode, liveRosterLength } = opts;
  if (viewerCoachCode && coachId === viewerCoachCode && liveRosterLength != null) {
    return liveRosterLength;
  }
  return marketingClients;
}

/**
 * Format a known numeric count for list/profile.
 * Returns null when missing so callers can skip rendering (no em-dash placeholders).
 */
export function formatPublicStat(value: number | null | undefined): string | null {
  if (value == null) return null;
  return String(value);
}

/** Happy Clients / Clients — hide when count is missing or zero. */
export function shouldShowPublicClientCount(count: number | null | undefined): boolean {
  return count != null && count > 0;
}

/**
 * Avoid showing backend-seeded ratings that have no review count as social proof.
 * When reviews > 0, show rating + (reviews) as returned by the API.
 */
export function shouldShowPublicRating(rating: number, reviews: number): boolean {
  return rating > 0 && reviews > 0;
}

/**
 * Build the public profile stats strip from available values only.
 * Flex layout among returned items; omit empty cells and their dividers.
 */
export function buildPublicProfileStats(opts: {
  clientCount: number | null | undefined;
  experience: number;
  servicesCount: number;
  rating: number;
  reviews: number;
}): PublicStatItem[] {
  const items: PublicStatItem[] = [];

  if (shouldShowPublicClientCount(opts.clientCount)) {
    items.push({
      key: 'clients',
      value: String(opts.clientCount),
      label: 'Happy Clients',
    });
  }

  if (opts.experience > 0) {
    items.push({
      key: 'experience',
      value: String(opts.experience),
      label: 'Years Exp.',
    });
  }

  if (opts.servicesCount > 0) {
    items.push({
      key: 'services',
      value: String(opts.servicesCount),
      label: 'Services',
    });
  }

  if (shouldShowPublicRating(opts.rating, opts.reviews)) {
    items.push({
      key: 'rating',
      value: String(opts.rating),
      label: 'Rating',
    });
  }

  return items;
}
