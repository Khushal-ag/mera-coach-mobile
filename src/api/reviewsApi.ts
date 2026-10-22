import { apiGet } from './client';

export interface ReviewSummary {
  reviewCount: number;
  average: number;
  knowledge: number;
  communication: number;
  personalAttention: number;
  guidanceResponse: number;
  resultsProgress: number;
  /** Reviews per whole star: index 0 is one star, index 4 is five stars. */
  starCounts: number[];
}

export interface Review {
  feedbackId: number;
  /** Empty on the public list. */
  clientCode: string;
  clientName: string;
  knowledge: number;
  communication: number;
  personalAttention: number;
  guidanceResponse: number;
  resultsProgress: number;
  overall: number;
  comments: string;
  /** ISO date-time. */
  createdOn: string;
}

export interface ReviewsPage {
  summary: ReviewSummary;
  items: Review[];
  page: number;
  totalCount: number;
}

const REVIEWS_PAGE_SIZE = 10;

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function mapReviews(raw: unknown): ReviewsPage {
  const r = (raw ?? {}) as Record<string, unknown>;
  const s = (r.summary ?? {}) as Record<string, unknown>;
  const stars = Array.isArray(s.starCounts) ? s.starCounts.map(num) : [];
  return {
    summary: {
      reviewCount: num(s.reviewCount),
      average: num(s.average),
      knowledge: num(s.knowledge),
      communication: num(s.communication),
      personalAttention: num(s.personalAttention),
      guidanceResponse: num(s.guidanceResponse),
      resultsProgress: num(s.resultsProgress),
      starCounts: [0, 1, 2, 3, 4].map(i => stars[i] ?? 0),
    },
    items: (Array.isArray(r.items) ? r.items : []).map(item => {
      const i = (item ?? {}) as Record<string, unknown>;
      return {
        feedbackId: num(i.feedbackId),
        clientCode: text(i.clientCode),
        clientName: text(i.clientName),
        knowledge: num(i.knowledge),
        communication: num(i.communication),
        personalAttention: num(i.personalAttention),
        guidanceResponse: num(i.guidanceResponse),
        resultsProgress: num(i.resultsProgress),
        overall: num(i.overall),
        comments: text(i.comments).trim(),
        createdOn: text(i.createdOn),
      };
    }),
    page: num(r.page) || 1,
    totalCount: num(r.totalCount),
  };
}

/** A coach's public reviews: each client's latest feedback, first names only. */
export async function getCoachReviews(coachCode: string, page = 1): Promise<ReviewsPage> {
  const raw = await apiGet<unknown>('/v{version}/Coach/reviews', {
    coachCode,
    page,
    pageSize: REVIEWS_PAGE_SIZE,
  });
  return mapReviews(raw);
}

/** The signed-in coach's own reviews, with full client names. Optional client filter. */
export async function getMyReviews(
  options: { clientCode?: string; page?: number } = {},
): Promise<ReviewsPage> {
  const raw = await apiGet<unknown>('/v{version}/Coach/my-reviews', {
    clientCode: options.clientCode,
    page: options.page ?? 1,
    pageSize: REVIEWS_PAGE_SIZE,
  });
  return mapReviews(raw);
}
