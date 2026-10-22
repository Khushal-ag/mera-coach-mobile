/**
 * Public "Happy Clients" is the manually entered count.
 * The live roster is a separate number on the coach's own profile screen.
 * Rating is the average of the clients' latest feedback and reviewCount is the number of those
 * reviews, so a rating is shown only when at least one review exists.
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

/** A rating needs at least one client review behind it. */
export function shouldShowPublicRating(rating: number, reviews: number): boolean {
  return reviews > 0 && rating > 0;
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
