// Centralized so screens fetching the same data share one cache entry.
export const queryKeys = {
  coachCategories: ['coachCategories'] as const,
  coachPublicList: (params: { coachTypeCode?: string; search?: string }) =>
    ['coachPublicList', params] as const,
  coachProfile: ['coachProfile'] as const,
  coachProfileFull: ['coachProfileFull'] as const,
  coachProfileByCode: (coachCode: string) => ['coachProfileByCode', coachCode] as const,
  clientList: (coachCode?: string) => ['clientList', coachCode] as const,
  clientDetail: (clientCode?: string, assessmentCode?: string) =>
    ['clientDetail', clientCode, assessmentCode] as const,
  /** Checkup wizard loads latest assessment via assessmentCode: ''. */
  clientDetailCheckup: (clientCode?: string) => ['clientDetail', clientCode, 'checkup'] as const,
  foodMaster: (country?: string, region?: string) => ['foodMaster', country, region] as const,
  bmiReport: (clientCode?: string, assessmentCode?: string) =>
    ['bmiReport', clientCode, assessmentCode] as const,
  countries: ['countries'] as const,
  paramList: (paramCode: string) => ['paramList', paramCode] as const,
  servicesForCategory: (categoryCode: string) => ['servicesForCategory', categoryCode] as const,
};
