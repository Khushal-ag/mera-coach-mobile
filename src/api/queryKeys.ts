/** Drop empty filters so Home `{}` and CoachList empty filters share one cache entry. */
function normalizeCoachPublicListParams(
  params: {
    coachTypeCode?: string;
    country?: string;
    state?: string;
    city?: string;
    search?: string;
    minRating?: number;
    sortBy?: string;
    page?: number;
    pageSize?: number;
  } = {},
) {
  const normalized: {
    coachTypeCode?: string;
    country?: string;
    state?: string;
    city?: string;
    search?: string;
    minRating?: number;
    sortBy?: string;
    page?: number;
    pageSize?: number;
  } = {};
  if (params.coachTypeCode) normalized.coachTypeCode = params.coachTypeCode;
  if (params.country) normalized.country = params.country;
  if (params.state) normalized.state = params.state;
  if (params.city) normalized.city = params.city;
  if (params.search) normalized.search = params.search;
  if (params.minRating != null && params.minRating > 0) normalized.minRating = params.minRating;
  if (params.sortBy && params.sortBy !== 'rating') normalized.sortBy = params.sortBy;
  if (params.page != null && params.page !== 1) normalized.page = params.page;
  if (params.pageSize != null && params.pageSize !== 50) normalized.pageSize = params.pageSize;
  return normalized;
}

export const queryKeys = {
  coachCategories: ['coachCategories'] as const,
  coachPublicList: (
    params: {
      coachTypeCode?: string;
      country?: string;
      state?: string;
      city?: string;
      search?: string;
      minRating?: number;
      sortBy?: string;
      page?: number;
      pageSize?: number;
    } = {},
  ) => ['coachPublicList', normalizeCoachPublicListParams(params)] as const,
  coachPublicCities: (params: { coachTypeCode?: string; country?: string; state?: string } = {}) =>
    [
      'coachPublicCities',
      params.coachTypeCode || undefined,
      params.country || undefined,
      params.state || undefined,
    ] as const,
  /** Prefix — invalidates every filtered `coachPublicList` entry. */
  coachPublicListRoot: ['coachPublicList'] as const,
  /**
   * Signed-in coach only — global keys are intentional.
   * One JWT identity at a time; `clearSession` / login wipe RQ so account switches stay isolated.
   */
  coachProfile: ['coachProfile'] as const,
  coachPremium: ['coachPremium'] as const,
  coachPremiumPlans: ['coachPremiumPlans'] as const,
  coachPremiumHistory: ['coachPremiumHistory'] as const,
  coachProfileFull: ['coachProfileFull'] as const,
  storeUpdate: ['storeUpdate'] as const,
  myPackages: ['showcase', 'packages'] as const,
  myPosts: ['showcase', 'posts'] as const,
  coachReviews: (coachCode: string) => ['reviews', 'public', coachCode] as const,
  myReviews: (clientCode?: string) => ['reviews', 'mine', clientCode ?? 'all'] as const,
  publicShowcase: (coachCode: string) => ['showcase', 'public', coachCode] as const,
  postCategories: ['master', 'postCategories'] as const,
  productBrands: ['master', 'productBrands'] as const,
  productItems: (brandCode: string) => ['master', 'productItems', brandCode] as const,
  coachProfileByCode: (coachCode: string) => ['coachProfileByCode', coachCode] as const,
  clientList: (coachCode?: string) => ['clientList', coachCode] as const,
  /** Server-side due list for Checkups tab / dashboard count. */
  recheckupList: (coachCode?: string) => ['recheckupList', coachCode] as const,
  clientDetail: (clientCode?: string, assessmentCode?: string) =>
    ['clientDetail', clientCode, assessmentCode] as const,
  /** Prefix — Client Detail + checkup variants for one client. */
  clientDetailRoot: (clientCode: string) => ['clientDetail', clientCode] as const,
  /** Checkup wizard loads latest assessment via assessmentCode: ''. */
  clientDetailCheckup: (clientCode?: string) => ['clientDetail', clientCode, 'checkup'] as const,
  foodMaster: (country?: string, region?: string) => ['foodMaster', country, region] as const,
  bmiReport: (clientCode?: string, assessmentCode?: string) =>
    ['bmiReport', clientCode, assessmentCode] as const,
  /** Saved AI diet plan for Client Detail → Diet Plan. */
  dietPlanReport: (clientCode?: string, assessmentCode?: string) =>
    ['dietPlanReport', clientCode, assessmentCode] as const,
  enquiryLeads: (coachCode?: string) => ['enquiryLeads', coachCode] as const,
  countries: ['countries'] as const,
  locationByPin: (countryCode: string, pinCode: string) =>
    ['locationByPin', countryCode, pinCode] as const,
  paramList: (paramCode: string) => ['paramList', paramCode] as const,
  servicesForCategory: (categoryCode: string) => ['servicesForCategory', categoryCode] as const,
  progressPhotos: (coachCode: string, clientCode: string) =>
    ['progressPhotos', coachCode, clientCode] as const,
  clientProfilePhoto: (coachCode: string, clientCode: string) =>
    ['clientProfilePhoto', coachCode, clientCode] as const,
};

/** Shared invalidation after coach profile / packages / events saves. */
export function invalidateCoachProfileCaches(
  queryClient: {
    invalidateQueries: (filters: { queryKey: readonly unknown[] }) => Promise<unknown>;
  },
  coachCode: string,
): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.coachProfile });
  void queryClient.invalidateQueries({ queryKey: queryKeys.coachProfileFull });
  void queryClient.invalidateQueries({ queryKey: queryKeys.coachPublicListRoot });
  void queryClient.invalidateQueries({ queryKey: queryKeys.coachProfileByCode(coachCode) });
}
