import { apiFetch, apiGet, apiPost, apiPut, withQuery, ApiError } from './client';
import { getCoachTypeStyle } from '../data/coachTypeStyles';
import { pickCoachCreatedAt } from '../utils/experience';
import { fontAwesomeToIonicon } from '../utils/fontAwesomeToIonicon';
import { parseCoachEvents } from '../utils/coachEvents';
import { parseCoachPackages } from '../utils/coachPackages';
import type { Coach, CoachCategory, CoachEvent, CoachPackage } from '../types/models';
import { fetchMasterItems, type MasterOption } from './masterApi';

export async function getCoachCategories(context?: {
  signal?: AbortSignal;
}): Promise<CoachCategory[]> {
  const items = await fetchMasterItems({ ItemType: 'CoachType' }, context?.signal);
  return items.map(item => {
    const style = getCoachTypeStyle(item.itemCode);
    return {
      code: item.itemCode,
      label: item.itemName,
      short: style.short,
      // Keep Ionicons fallback for screens that still use `icon` directly.
      icon: fontAwesomeToIonicon(item.icon) ?? style.icon,
      faIcon: item.icon || undefined,
      color: style.color,
      bg: style.bg,
      description: item.description,
    };
  });
}

export interface RegisterCoachParams {
  coachName: string;
  coachTypeCode?: string;
  mobile: string;
  email: string;
  /** Optional referrer mobile — send only when non-empty. */
  referrerMobile?: string;
}

export interface RegisterCoachResult {
  plainPassword: string;
  [key: string]: unknown;
}

export async function registerCoach(params: RegisterCoachParams): Promise<RegisterCoachResult> {
  return apiPost<RegisterCoachResult>('/v{version}/Coach/save', params);
}

export interface CoachPublicListParams {
  coachTypeCode?: string;
  country?: string;
  state?: string;
  city?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

/** IsProfileVisible: accept PascalCase, camelCase, or legacy Is_profileVisible. */
export function parseIsProfileVisible(raw: Record<string, unknown>): boolean | undefined {
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

/** Required public fields for auto isProfileVisible on Coach/save. */
export function isPublicProfileDataSufficient(fields: {
  experienceYears?: number | null;
  happyClientCount?: number | null;
  coachDesc?: string | null;
  add_Line?: string | null;
  pinCode?: string | null;
}): boolean {
  const pinDigits = String(fields.pinCode ?? '').replace(/\D/g, '');
  return (
    fields.experienceYears != null &&
    Number.isFinite(fields.experienceYears) &&
    fields.experienceYears >= 0 &&
    fields.happyClientCount != null &&
    Number.isFinite(fields.happyClientCount) &&
    fields.happyClientCount >= 0 &&
    !!String(fields.coachDesc ?? '').trim() &&
    !!String(fields.add_Line ?? '').trim() &&
    pinDigits.length === 6
  );
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
  const packages = parseCoachPackages(pickPackagesRaw(bag));
  const events = parseCoachEvents(pickEventsRaw(bag));
  return {
    id: raw.coachCode,
    name: raw.coachName,
    categoryCode: raw.coachTypeCode,
    category: raw.coachTypeName,
    rating: raw.rating ?? 0,
    // Public list currently mirrors happyClientCount into reviewCount; profile-by-id often omits it.
    reviews: raw.reviewCount ?? 0,
    // Self-reported marketing field (Edit Profile Experience yrs), not tenure from signup.
    experience: raw.experienceYears ?? 0,
    city: raw.city_Cd ?? '',
    country: raw.country_Cd,
    online: false, // API has no live presence field

    bio: raw.coachDesc ?? '',
    tags: splitServiceNames(raw.serviceNames),
    clients: raw.happyClientCount ?? 0,
    createdAt: pickCoachCreatedAt(raw as unknown as Record<string, unknown>),
    logoUrl: raw.logo_Url ?? '',
    profilePicUrl: raw.profile_Pic_Url ?? '',
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
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 50, // no pagination UI yet
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
    totalCount: visibilityKnown ? visibleItems.length : (data?.totalCount ?? 0),
  };
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
  coachDesc?: string;
  bmiReportTemplate?: string;
  dietChartTemplate?: string;
  IsProfileVisible?: boolean | number | string;
  isProfileVisible?: boolean | number | string;
  Is_profileVisible?: boolean | number | string;
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
  coachDesc: string;
  bmiReportTemplate: string;
  dietChartTemplate: string;
  /** undefined if API omits the field. */
  isProfileVisible?: boolean;
  packages: CoachPackage[];
  events: CoachEvent[];
}

export async function getCoachProfileFull(): Promise<CoachProfileFull> {
  const raw = await apiGet<RawCoachProfileFull | null>('/v{version}/Coach/profile');
  if (raw == null) {
    throw new ApiError('Coach profile not found.', 204);
  }
  const bag = raw as unknown as Record<string, unknown>;
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
    logoUrl: raw.logo_Url ?? '',
    profilePicUrl: raw.profile_Pic_Url ?? '',
    coachDesc: raw.coachDesc ?? '',
    bmiReportTemplate: raw.bmiReportTemplate ?? '',
    dietChartTemplate: raw.dietChartTemplate ?? '',
    isProfileVisible: parseIsProfileVisible(bag),
    packages: parseCoachPackages(pickPackagesRaw(bag)),
    events: parseCoachEvents(pickEventsRaw(bag)),
  };
}

export interface CoachEnquiryParams {
  coachCode?: string;
  clientName: string;
  clientMobile: string;
  clientEmail?: string;
  lookingFor: string;
}

export async function submitCoachEnquiry(params: CoachEnquiryParams): Promise<void> {
  await apiPost('/v{version}/Coach/enquiry', params);
}

export interface BmiLeadParams {
  clientName: string;
  clientMobile: string;
  gender?: string;
  age?: number | null;
  heightCm: number;
  weightKg: number;
  bmiValue: number;
  bmiCategory: string;
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
export interface SaveCoachProfileParams {
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
  coachDesc?: string;
  bmiReportTemplate?: string;
  dietChartTemplate?: string;
  /** 1/0; computed from public-field sufficiency when omitted. */
  isProfileVisible?: number;
  /** Attached when provided (including empty arrays to clear). */
  packages?: CoachPackage[];
  /** Attached when provided (including empty arrays to clear). */
  events?: CoachEvent[];
}

export async function saveCoachProfile(params: SaveCoachProfileParams): Promise<void> {
  const { packages, events, ...rest } = params;
  const isProfileVisible =
    params.isProfileVisible ?? (isPublicProfileDataSufficient(params) ? 1 : 0);
  const body: Record<string, unknown> = { ...rest, isProfileVisible };

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
  const experienceYears = profile.experienceYears;
  const happyClientCount = profile.happyClientCount;
  const coachDesc = profile.coachDesc;
  const add_Line = profile.addLine;
  const pinCode = profile.pinCode;
  return {
    coachId: profile.coachId,
    coachName: profile.coachName,
    coachTypeCode: profile.coachTypeCode,
    mobile: profile.mobile,
    email: profile.email,
    businessName: profile.businessName,
    serviceCodes: profile.serviceCodes,
    experienceYears,
    happyClientCount,
    certificationCount: profile.certificationCount,
    tagline: profile.tagline,
    localLanguage: profile.localLanguage,
    locality: profile.locality,
    add_Line,
    city_Cd: profile.cityCd,
    state_Cd: profile.stateCd,
    pinCode,
    country_Cd: profile.countryCd,
    logo_Url: profile.logoUrl,
    profile_Pic_Url: profile.profilePicUrl,
    coachDesc,
    bmiReportTemplate: profile.bmiReportTemplate,
    dietChartTemplate: profile.dietChartTemplate,
    packages: overrides?.packages ?? profile.packages,
    events: overrides?.events ?? profile.events,
    isProfileVisible: isPublicProfileDataSufficient({
      experienceYears,
      happyClientCount,
      coachDesc,
      add_Line,
      pinCode,
    })
      ? 1
      : 0,
  };
}

export interface ChangePasswordParams {
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
