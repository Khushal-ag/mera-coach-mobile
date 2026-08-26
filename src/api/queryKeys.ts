export const queryKeys = {
  coachCategories: ['coachCategories'] as const,
  coachPublicList: (params: {
    coachTypeCode?: string;
    country?: string;
    state?: string;
    city?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) => ['coachPublicList', params] as const,
  coachProfile: ['coachProfile'] as const,
  coachProfileFull: ['coachProfileFull'] as const,
  coachProfileByCode: (coachCode: string) => ['coachProfileByCode', coachCode] as const,
  clientList: (coachCode?: string) => ['clientList', coachCode] as const,
  /** Server-side due list for Checkups tab / dashboard count. */
  recheckupList: (coachCode?: string) => ['recheckupList', coachCode] as const,
  clientDetail: (clientCode?: string, assessmentCode?: string) =>
    ['clientDetail', clientCode, assessmentCode] as const,
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
};
