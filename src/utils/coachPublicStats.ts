/**
 * Public "Happy Clients" is the manually entered count.
 * The live roster is a separate number on the coach's own profile screen.
 * Rating is a formula and reviewCount is not a review total — do not show either as reviews.
 */

type PublicStatItem = {
  key: string;
  value: string;
  label: string;
};

export function resolvePublicClientCount(opts: {
  coachId?: string;
  /** From API `happyClientCount` — the stored manual count. */
  marketingClients: number;
  viewerCoachCode?: string | null;
  /** Ignored. The live roster must not replace or increment the manual count. */
  liveRosterLength?: number | null;
}): number {
  return opts.marketingClients;
}

export function shouldShowPublicClientCount(count: number | null | undefined): boolean {
  return count != null && count > 0;
}

/** Formula ratings and client totals are not client reviews. */
export function shouldShowPublicRating(_rating: number, _reviews: number): boolean {
  return false;
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
