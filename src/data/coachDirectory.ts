export const SORT_OPTIONS: string[] = ['Top Rated', 'Most Reviewed', 'Most Experience'];

export const RATING_FILTER_OPTIONS: string[] = ['Any rating', '4.0+', '3.0+'];

/** Maps Find-a-Coach sort labels to `GET Coach/public?sortBy=` values. */
export function coachPublicSortParam(sortLabel: string): 'rating' | 'reviews' | 'experience' {
  if (sortLabel === 'Most Reviewed') return 'reviews';
  if (sortLabel === 'Most Experience') return 'experience';
  return 'rating';
}

/** Maps rating filter chips to `GET Coach/public?minRating=` (undefined = any). */
export function coachPublicMinRatingParam(ratingLabel: string): number | undefined {
  if (ratingLabel === '4.0+') return 4;
  if (ratingLabel === '3.0+') return 3;
  return undefined;
}
