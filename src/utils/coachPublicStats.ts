/**
 * Prefer live ClientList length when viewing your own profile.
 * Otherwise use happyClientCount; hide rating when reviewCount is 0.
 */

type PublicStatItem = {
  key: string;
  value: string;
  label: string;
};

export function resolvePublicClientCount(opts: {
  coachId: string;
  /** From API `happyClientCount`. */
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

export function shouldShowPublicClientCount(count: number | null | undefined): boolean {
  return count != null && count > 0;
}

/** Hide seeded ratings when reviewCount is 0. */
export function shouldShowPublicRating(rating: number, reviews: number): boolean {
  return rating > 0 && reviews > 0;
}

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
