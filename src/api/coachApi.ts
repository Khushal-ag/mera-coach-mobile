import { apiFetch, apiGet, apiPost, apiPut, withQuery, ApiError } from './client';
import { getCoachTypeStyle } from '../data/coachTypeStyles';
import { readCoachMediaFields } from '../utils/coachMediaFields';
import { pickCoachCreatedAt } from '../utils/experience';
import { fontAwesomeToIonicon } from '../utils/fontAwesomeToIonicon';
import { parseCoachEvents } from '../utils/coachEvents';
import { parseCoachPackages } from '../utils/coachPackages';
import {
  mapPremiumCatalog,
  mapPremiumOffer,
  type PremiumCatalog,
  type PremiumOffer,
} from '../utils/premiumOffer';
import type { Coach, CoachCategory, CoachEvent, CoachPackage } from '../types/models';
import { fetchMasterItems, type MasterOption } from './masterApi';

export async function getCoachCategories(context?: {
  signal?: AbortSignal;
}): Promise<CoachCategory[]> {
  const items = await fetchMasterItems({ ItemType: 'CoachType' }, context?.signal);
  // Return every active CoachType from Master — do not filter to a local allowlist.
  return items.map(item => {
    const style = getCoachTypeStyle(item.itemCode, item.itemName);
    return {
      code: item.itemCode,
      label: item.itemName,
      short: style.short,
      // Prefer API FontAwesome → Ionicon; else brand/style fallback (including unknown codes).
      icon: fontAwesomeToIonicon(item.icon) ?? style.icon,
      faIcon: item.icon || undefined,
      color: style.color,
      bg: style.bg,
      description: item.description,
    };
  });
}

interface RegisterCoachParams {
  coachName: string;
  coachTypeCode?: string;
  mobile: string;
  email: string;
  /** Optional referrer mobile — send only when non-empty. */
  referrerMobile?: string;
}

/** Credentials are emailed by the API — the app never reads the response body. */
export async function registerCoach(params: RegisterCoachParams): Promise<void> {
  await apiPost('/v{version}/Coach/save', params);
}

interface CoachPublicListParams {
  coachTypeCode?: string;
  country?: string;
  state?: string;
  city?: string;
  search?: string;
  /** Minimum rating filter (e.g. 3 or 4). Omitted = any rating. */
  minRating?: number;
  /** Server sort: rating | reviews | experience. Default rating. */
  sortBy?: 'rating' | 'reviews' | 'experience';
  page?: number;
  pageSize?: number;
}

/** IsProfileVisible: accept PascalCase, camelCase, or legacy Is_profileVisible. */
function parseIsProfileVisible(raw: Record<string, unknown>): boolean | undefined {
  const v =
    raw.IsProfileVisible ?? raw.isProfileVisible ?? raw.Is_profileVisible ?? raw.is_profileVisible;
  if (v === undefined || v === null) return undefined;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v === 1;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === '1' || s === 'true') return true;
    if (s === '0' || s === 'false') return false;
  }
  return undefined;
}

function parseMissingPublicFields(raw: Record<string, unknown>): string[] | undefined {
  const v = raw.missingPublicFields ?? raw.MissingPublicFields;
  if (!Array.isArray(v)) return undefined;
  return v.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

interface RawPublicCoach {
  coachCode: string;
  coachName: string;
  coachTypeCode: string;
  coachTypeName: string;
  city_Cd?: string;
  country_Cd?: string;
  experienceYears?: number;
  happyClientCount?: number;
  coachDesc?: string;
  serviceNames?: string;
  rating?: number;
  reviewCount?: number;
  logo_Url?: string;
  profile_Pic_Url?: string;
  IsProfileVisible?: boolean | number | string;
  isProfileVisible?: boolean | number | string;
  Is_profileVisible?: boolean | number | string;
}

interface CoachPublicListResponse {
  items: RawPublicCoach[];
  totalCount: number;
}

function splitServiceNames(serviceNames?: string): string[] {
  if (!serviceNames?.trim()) return [];
  return serviceNames
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function pickPackagesRaw(raw: Record<string, unknown>): unknown {
  return raw.packages ?? raw.packagesJson ?? raw.products ?? raw.productsJson;
}

function pickEventsRaw(raw: Record<string, unknown>): unknown {
  return raw.events ?? raw.eventsJson ?? raw.coachEvents ?? raw.coachEventsJson;
}

function mapPublicCoach(raw: RawPublicCoach): Coach {
  const bag = raw as unknown as Record<string, unknown>;
  const media = readCoachMediaFields(bag);
  const packages = parseCoachPackages(pickPackagesRaw(bag));
  const events = parseCoachEvents(pickEventsRaw(bag));
  return {
    id: raw.coachCode,
    name: raw.coachName,
    categoryCode: raw.coachTypeCode,
    category: raw.coachTypeName,
    rating: raw.rating ?? 0,
    // Number of client feedback ratings behind `rating`; 0 means no ratings yet.
    reviews: raw.reviewCount ?? 0,
    // Self-reported marketing field (Edit Profile Experience yrs), not tenure from signup.
    experience: raw.experienceYears ?? 0,
    city: raw.city_Cd ?? '',
    country: raw.country_Cd,
    online: false, // API has no live presence field

    bio: raw.coachDesc ?? '',
    tags: splitServiceNames(raw.serviceNames),
    clients: raw.happyClientCount ?? 0,
    validUpto: String(bag.validUpto ?? bag.ValidUpto ?? '').trim() || undefined,
    createdAt: pickCoachCreatedAt(raw as unknown as Record<string, unknown>),
    logoUrl: media.logoUrl,
    profilePicUrl: media.profilePicUrl,
    coverUrl: media.coverUrl,
    packages: packages.length ? packages : undefined,
    events: events.length ? events : undefined,
  };
}

export async function getCoachPublicList(
  params: CoachPublicListParams = {},
  signal?: AbortSignal,
): Promise<{ coaches: Coach[]; totalCount: number }> {
  const data = await apiFetch<CoachPublicListResponse | null>(
    withQuery('/v{version}/Coach/public', {
      coachTypeCode: params.coachTypeCode || undefined,
      country: params.country || undefined,
      state: params.state || undefined,
      city: params.city || undefined,
      search: params.search || undefined,
      minRating: params.minRating != null && params.minRating > 0 ? params.minRating : undefined,
      sortBy: params.sortBy && params.sortBy !== 'rating' ? params.sortBy : undefined,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 50,
    }),
    { signal },
  );
  const items = data?.items || [];
  // Prefer server-side filter (IsProfileVisible=1). Client defense in depth:
  // - If ANY item has the flag, keep only explicit visible (true/1); omit/missing → drop.
  // - If ALL items lack the flag, leave the list as-is (trust server already filtered).
  const visibilityKnown = items.some(
    item => parseIsProfileVisible(item as unknown as Record<string, unknown>) !== undefined,
  );
  const visibleItems = visibilityKnown
    ? items.filter(item => {
        const v = parseIsProfileVisible(item as unknown as Record<string, unknown>);
        return v === true;
      })
    : items;
  return {
    coaches: visibleItems.map(mapPublicCoach),
    // Prefer server totalCount even when we drop hidden rows on this page —
    // visibleItems.length is only a page slice and undercounts the directory.
    totalCount: data?.totalCount ?? visibleItems.length,
  };
}

/** Distinct cities for Find-a-Coach dropdown (visible public coaches only). */
export async function getCoachPublicCities(
  params: { coachTypeCode?: string; country?: string; state?: string } = {},
  signal?: AbortSignal,
): Promise<string[]> {
  const data = await apiFetch<string[] | null>(
    withQuery('/v{version}/Coach/public-cities', {
      coachTypeCode: params.coachTypeCode || undefined,
      country: params.country || undefined,
      state: params.state || undefined,
    }),
    { signal },
  );
  return (data ?? []).map(c => c.trim()).filter(Boolean);
}

export async function getCoachProfile(): Promise<Coach> {
  const raw = await apiGet<RawPublicCoach | null>('/v{version}/Coach/profile');
  if (raw == null) {
    throw new ApiError('Coach profile not found.', 204);
  }
  return mapPublicCoach(raw);
}

export async function getCoachProfileByCode(coachCode: string): Promise<Coach> {
  const raw = await apiGet<RawCoachProfileFull & RawPublicCoach>(
    '/v{version}/Coach/profile-by-id',
    { coachCode },
  );
  const resolvedCode = raw.coachCode?.trim() || coachCode;
  return {
    ...mapPublicCoach({
      ...(raw as RawPublicCoach),
      coachCode: resolvedCode,
      coachName: raw.coachName ?? '',
      coachTypeCode: raw.coachTypeCode ?? '',
      coachTypeName: (raw as { coachTypeName?: string }).coachTypeName ?? '',
    }),
    tagline: raw.tagline?.trim() || undefined,
    mobile: normalizeCoachMobile(raw.mobile),
  };
}

/** profile-by-id sometimes returns mobiles as scientific notation (e.g. "9.8874e+009"). */
function normalizeCoachMobile(mobile?: string | number | null): string {
  if (mobile == null) return '';
  const raw = String(mobile).trim();
  if (!raw) return '';
  if (/e[+-]?\d+/i.test(raw)) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) {
      // Prefer integer digit string; float storage may already have lost precision.
      return Math.round(n).toString();
    }
  }
  return raw.replace(/\D/g, '');
}

/** wa.me URL from Indian mobile (matches web WhatsAppUrl intent). */
export function whatsAppUrlFromMobile(mobile?: string): string | null {
  const digits = normalizeCoachMobile(mobile).replace(/^0+/, '');
  if (!digits) return null;
  // 10-digit local mobile: always prefix 91 (even if number starts with 91, e.g. 9123456789).
  if (digits.length === 10) return `https://wa.me/91${digits}`;
  // Already includes country code.
  if (digits.length === 12 && digits.startsWith('91')) return `https://wa.me/${digits}`;
  return null;
}

// Full profile GET fields not mapped into the public Coach model.
interface RawCoachProfileFull {
  coachId?: number;
  coachCode?: string;
  coachName?: string;
  coachTypeCode?: string;
  mobile?: string;
  email?: string;
  businessName?: string;
  serviceCodes?: string[];
  experienceYears?: number;
  happyClientCount?: number;
  certificationCount?: number;
  tagline?: string;
  localLanguage?: string;
  locality?: string;
  add_Line?: string;
  city_Cd?: string;
  state_Cd?: string;
  pinCode?: string;
  country_Cd?: string;
  logo_Url?: string;
  profile_Pic_Url?: string;
  cover_Url?: string;
  coachDesc?: string;
  bmiReportTemplate?: string;
  dietChartTemplate?: string;
  IsProfileVisible?: boolean | number | string;
  isProfileVisible?: boolean | number | string;
  Is_profileVisible?: boolean | number | string;
  missingPublicFields?: string[];
  MissingPublicFields?: string[];
  packages?: unknown;
  packagesJson?: unknown;
  products?: unknown;
  events?: unknown;
  eventsJson?: unknown;
  coachEvents?: unknown;
}

export interface CoachProfileFull {
  coachId: number;
  coachCode: string;
  coachName: string;
  coachTypeCode: string;
  mobile: string;
  email: string;
  businessName: string;
  serviceCodes: string[];
  experienceYears: number;
  happyClientCount: number;
  certificationCount: number;
  tagline: string;
  localLanguage: string;
  locality: string;
  addLine: string;
  cityCd: string;
  stateCd: string;
  pinCode: string;
  countryCd: string;
  logoUrl: string;
  profilePicUrl: string;
  coverUrl: string;
  coachDesc: string;
  bmiReportTemplate: string;
  dietChartTemplate: string;
  /** undefined if API omits the field. Stored directory flag — not a client override. */
  isProfileVisible?: boolean;
  /**
   * Required public fields still empty. Same labels as the server visibility rules.
   * Undefined when the API omits the list.
   */
  missingPublicFields?: string[];
  packages: CoachPackage[];
  events: CoachEvent[];
}

export async function getCoachProfileFull(): Promise<CoachProfileFull> {
  const raw = await apiGet<RawCoachProfileFull | null>('/v{version}/Coach/profile');
  if (raw == null) {
    throw new ApiError('Coach profile not found.', 204);
  }
  const bag = raw as unknown as Record<string, unknown>;
  const media = readCoachMediaFields(bag);
  return {
    coachId: raw.coachId ?? 0,
    coachCode: raw.coachCode ?? '',
    coachName: raw.coachName ?? '',
    coachTypeCode: raw.coachTypeCode ?? '',
    mobile: raw.mobile ?? '',
    email: raw.email ?? '',
    businessName: raw.businessName ?? '',
    serviceCodes: raw.serviceCodes ?? [],
    experienceYears: raw.experienceYears ?? 0,
    happyClientCount: raw.happyClientCount ?? 0,
    certificationCount: raw.certificationCount ?? 0,
    tagline: raw.tagline ?? '',
    localLanguage: raw.localLanguage ?? '',
    locality: raw.locality ?? '',
    addLine: raw.add_Line ?? '',
    cityCd: raw.city_Cd ?? '',
    stateCd: raw.state_Cd ?? '',
    pinCode: raw.pinCode ?? '',
    countryCd: raw.country_Cd ?? '',
    logoUrl: media.logoUrl,
    profilePicUrl: media.profilePicUrl,
    coverUrl: media.coverUrl,
    coachDesc: raw.coachDesc ?? '',
    bmiReportTemplate: raw.bmiReportTemplate ?? '',
    dietChartTemplate: raw.dietChartTemplate ?? '',
    isProfileVisible: parseIsProfileVisible(bag),
    missingPublicFields: parseMissingPublicFields(bag),
    packages: parseCoachPackages(pickPackagesRaw(bag)),
    events: parseCoachEvents(pickEventsRaw(bag)),
  };
}

/** Signed-in coach: paid flag, the app plan, and one suggested promo (or none). */
export async function getCoachPremiumOffer(signal?: AbortSignal): Promise<PremiumOffer> {
  const raw = await apiFetch<unknown>('/v{version}/Coach/premium', { signal });
  if (raw == null || typeof raw !== 'object') {
    throw new ApiError('Premium plan could not be loaded.', 204);
  }
  return mapPremiumOffer(raw);
}

/** Every active subscription plan and the suggested promo. Prices come from the API. */
export async function getCoachPremiumPlans(signal?: AbortSignal): Promise<PremiumCatalog> {
  const raw = await apiFetch<unknown>('/v{version}/Coach/premium-plans', { signal });
  if (raw == null || typeof raw !== 'object') {
    throw new ApiError('Premium plans could not be loaded.', 204);
  }
  return mapPremiumCatalog(raw);
}

interface CoachEnquiryParams {
  coachCode?: string;
  clientName: string;
  clientMobile: string;
  clientEmail?: string;
  lookingFor: string;
}

export async function submitCoachEnquiry(params: CoachEnquiryParams): Promise<void> {
  await apiPost('/v{version}/Coach/enquiry', params);
}

interface BmiLeadParams {
  clientName: string;
  clientMobile: string;
  gender?: string;
  age?: number | null;
  /** Omit when the screen did not measure height, weight, or BMI. */
  heightCm?: number;
  weightKg?: number;
  bmiValue?: number;
  bmiCategory?: string;
}

export async function submitBmiLead(params: BmiLeadParams): Promise<void> {
  await apiPost('/v{version}/Coach/bmi-lead', params);
}

export async function getServicesForCategory(categoryCode: string): Promise<MasterOption[]> {
  if (!categoryCode) return [];
  // Service filter uses lowercase itemType (Country/CoachType use ItemType).
  const items = await fetchMasterItems({ itemType: 'Service', filterText: categoryCode });
  return items.map(i => ({ code: i.itemCode, label: i.itemName }));
}

/** Coach/save body. packages/events are only attached when non-empty. */
interface SaveCoachProfileParams {
  coachId: number;
  coachName: string;
  coachTypeCode: string;
  mobile: string;
  email: string;
  businessName?: string;
  serviceCodes: string[];
  experienceYears?: number;
  happyClientCount?: number;
  certificationCount?: number;
  tagline?: string;
  localLanguage?: string;
  locality?: string;
  add_Line?: string;
  city_Cd?: string;
  state_Cd?: string;
  pinCode?: string;
  country_Cd?: string;
  logo_Url?: string;
  profile_Pic_Url?: string;
  cover_Url?: string;
  coachDesc?: string;
  bmiReportTemplate?: string;
  dietChartTemplate?: string;
  /** Attached when provided (including empty arrays to clear). */
  packages?: CoachPackage[];
  /** Attached when provided (including empty arrays to clear). */
  events?: CoachEvent[];
}

export async function saveCoachProfile(params: SaveCoachProfileParams): Promise<void> {
  const { packages, events, ...rest } = params;
  // Visibility is recomputed on the server. Do not send a client flag.
  const body: Record<string, unknown> = { ...rest };

  // Always send when defined so empty arrays clear PackagesJson / EventsJson on the API.
  if (packages !== undefined) {
    body.packages = packages;
    body.packagesJson = JSON.stringify(packages);
  }
  if (events !== undefined) {
    body.events = events;
    body.eventsJson = JSON.stringify(events);
  }

  await apiPost('/v{version}/Coach/save', body);
}

/**
 * Map a loaded full profile into a Coach/save body.
 * Includes packages/events from profile (or overrides) so dedicated editors can
 * round-trip them; empty arrays are sent so clears persist.
 */
export function buildSaveCoachProfileParams(
  profile: CoachProfileFull,
  overrides?: Partial<Pick<SaveCoachProfileParams, 'packages' | 'events'>>,
): SaveCoachProfileParams {
  return {
    coachId: profile.coachId,
    coachName: profile.coachName,
    coachTypeCode: profile.coachTypeCode,
    mobile: profile.mobile,
    email: profile.email,
    businessName: profile.businessName,
    serviceCodes: profile.serviceCodes,
    // Manual happy-client count. Do not add the live roster before save.
    experienceYears: profile.experienceYears,
    happyClientCount: profile.happyClientCount,
    certificationCount: profile.certificationCount,
    tagline: profile.tagline,
    localLanguage: profile.localLanguage,
    locality: profile.locality,
    add_Line: profile.addLine,
    city_Cd: profile.cityCd,
    state_Cd: profile.stateCd,
    pinCode: profile.pinCode,
    country_Cd: profile.countryCd,
    logo_Url: profile.logoUrl,
    profile_Pic_Url: profile.profilePicUrl,
    cover_Url: profile.coverUrl,
    coachDesc: profile.coachDesc,
    bmiReportTemplate: profile.bmiReportTemplate,
    dietChartTemplate: profile.dietChartTemplate,
    packages: overrides?.packages ?? profile.packages,
    events: overrides?.events ?? profile.events,
  };
}

interface ChangePasswordParams {
  currentPassword: string;
  newPassword: string;
}

/** Send plaintext — do not client-hash (double-hash fails with "Current password is incorrect"). */
export async function changePassword(params: ChangePasswordParams): Promise<void> {
  await apiPut('/v{version}/Coach/change-password', {
    currentPassword: params.currentPassword,
    newPassword: params.newPassword,
  });
}
