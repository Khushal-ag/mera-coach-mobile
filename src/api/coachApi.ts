import { apiFetch, apiGet, apiPost, apiPut, withQuery } from './client';
import { getCoachTypeStyle } from '../data/coachTypeStyles';
import { pickCoachCreatedAt } from '../utils/experience';
import { fontAwesomeToIonicon } from '../utils/fontAwesomeToIonicon';
import type { Coach, CoachCategory } from '../types/models';
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
      // Prefer rendering this with FontAwesome5 (CategoryIcon).
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

/**
 * Backend DB column `IsProfileVisible` (int4: 1 = public). JSON may use PascalCase
 * (`IsProfileVisible`) or camelCase (`isProfileVisible`); older shapes used `Is_profileVisible`.
 * Confirmed on live GET /Coach/profile-by-id; public list may omit it when already filtered.
 * On save we send camelCase `isProfileVisible` as 1/0 from public-field sufficiency.
 */
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

/**
 * Same public fields required on Edit Profile: experience, happy clients, description,
 * address, pincode. Used to set `isProfileVisible` on Coach/save.
 */
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

// Field names checked against a live GET /Coach/public response.
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
  /** Present on some endpoints; public list often omits when server already filters. */
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

function mapPublicCoach(raw: RawPublicCoach): Coach {
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
    online: false, // no live presence field on the backend

    bio: raw.coachDesc ?? '',
    tags: splitServiceNames(raw.serviceNames),
    // Edit Profile "Happy Clients"; shown as Clients on public list/profile.
    clients: raw.happyClientCount ?? 0,
    createdAt: pickCoachCreatedAt(raw as unknown as Record<string, unknown>),
    logoUrl: raw.logo_Url ?? '',
    profilePicUrl: raw.profile_Pic_Url ?? '',
  };
}

export async function getCoachPublicList(
  params: CoachPublicListParams = {},
  signal?: AbortSignal,
): Promise<{ coaches: Coach[]; totalCount: number }> {
  const data = await apiFetch<CoachPublicListResponse>(
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
  // Save sends isProfileVisible 1/0 from public-field sufficiency; keep this filter anyway.
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
  const raw = await apiGet<RawPublicCoach>('/v{version}/Coach/profile');
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
      coachCode: resolvedCode,
      coachName: raw.coachName ?? '',
      coachTypeCode: raw.coachTypeCode ?? '',
      coachTypeName: (raw as { coachTypeName?: string }).coachTypeName ?? '',
      city_Cd: raw.city_Cd,
      country_Cd: raw.country_Cd,
      experienceYears: raw.experienceYears,
      happyClientCount: raw.happyClientCount,
      coachDesc: raw.coachDesc,
      serviceNames: (raw as { serviceNames?: string }).serviceNames,
      rating: (raw as { rating?: number }).rating,
      reviewCount: (raw as { reviewCount?: number }).reviewCount,
      logo_Url: raw.logo_Url,
      profile_Pic_Url: raw.profile_Pic_Url,
    }),
    tagline: raw.tagline?.trim() || undefined,
    mobile: normalizeCoachMobile(raw.mobile),
  };
}

/**
 * profile-by-id sometimes returns mobiles as scientific notation
 * (e.g. "9.8874e+009") when the backend stored them as floats.
 */
function normalizeCoachMobile(mobile?: string | number | null): string {
  if (mobile == null) return '';
  const raw = String(mobile).trim();
  if (!raw) return '';
  if (/e[+-]?\d+/i.test(raw)) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) {
      // Prefer integer digit string; precision may already be lost server-side.
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

// Confirmed against live GET /Coach/profile + OpenAPI CoachSaveRequest: edit-relevant fields
// (mobile, address, service codes, image URLs, templates/language) that mapPublicCoach's
// public-facing Coach model deliberately leaves out.
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
  /** Diet-plan / report language code (e.g. "hi"). */
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
  /**
   * Whether this coach appears on Find a Coach / public Home.
   * undefined if API omits the field.
   */
  isProfileVisible?: boolean;
}

export async function getCoachProfileFull(): Promise<CoachProfileFull> {
  const raw = await apiGet<RawCoachProfileFull>('/v{version}/Coach/profile');
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
    isProfileVisible: parseIsProfileVisible(raw as unknown as Record<string, unknown>),
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
  // Backend Service filter uses lowercase itemType (unlike Country/CoachType ItemType).
  const items = await fetchMasterItems({ itemType: 'Service', filterText: categoryCode });
  return items.map(i => ({ code: i.itemCode, label: i.itemName }));
}

/**
 * Coach/save body. Live OpenAPI CoachSaveRequest still omits `isProfileVisible` and sets
 * `additionalProperties: false` — we send it anyway (int 1/0) from public-field sufficiency.
 */
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
  /** int4: 1 = show on public Find a Coach; computed at save when omitted. */
  isProfileVisible?: number;
}

export async function saveCoachProfile(params: SaveCoachProfileParams): Promise<void> {
  const isProfileVisible =
    params.isProfileVisible ?? (isPublicProfileDataSufficient(params) ? 1 : 0);
  await apiPost('/v{version}/Coach/save', { ...params, isProfileVisible });
}

export interface ChangePasswordParams {
  currentPassword: string;
  newPassword: string;
}

/**
 * Send plaintext — unlike Auth/login, this endpoint hashes server-side.
 * Client-hashing caused error 644 ("Current password is incorrect") via double-hash.
 * OpenAPI enforces newPassword minLength 6 (plain policy); login password is minLength 1 (hash OK).
 */
export async function changePassword(params: ChangePasswordParams): Promise<void> {
  await apiPut('/v{version}/Coach/change-password', {
    currentPassword: params.currentPassword,
    newPassword: params.newPassword,
  });
}
