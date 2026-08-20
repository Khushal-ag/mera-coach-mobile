// Centralized so screens fetching the same data share one cache entry.
export const queryKeys = {
  coachCategories: ['coachCategories'] as const,
  coachPublicList: (params: { coachTypeCode?: string; search?: string }) =>
    ['coachPublicList', params] as const,
  coachProfile: ['coachProfile'] as const,
  clientList: (coachCode?: string) => ['clientList', coachCode] as const,
  clientDetail: (clientCode?: string, assessmentCode?: string) =>
    ['clientDetail', clientCode, assessmentCode] as const,
};
