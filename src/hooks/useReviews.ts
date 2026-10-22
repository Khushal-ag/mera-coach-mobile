import { useInfiniteQuery } from '@tanstack/react-query';
import { getCoachReviews, getMyReviews, type ReviewsPage } from '../api/reviewsApi';
import { queryKeys } from '../api/queryKeys';

function nextPageParam(last: ReviewsPage, pages: ReviewsPage[]): number | undefined {
  const loaded = pages.reduce((sum, p) => sum + p.items.length, 0);
  return loaded < last.totalCount ? pages.length + 1 : undefined;
}

/** The signed-in coach's reviews, newest first. Pass a clientCode for one client's review. */
export function useMyReviews(clientCode?: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.myReviews(clientCode),
    queryFn: ({ pageParam }) => getMyReviews({ clientCode, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
    enabled,
  });
}

/** A coach's public reviews for the public profile. */
export function useCoachReviews(coachCode: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.coachReviews(coachCode),
    queryFn: ({ pageParam }) => getCoachReviews(coachCode, pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
    enabled: !!coachCode,
  });
}
