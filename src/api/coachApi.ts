import { apiFetch } from './client';
import { getCoachTypeStyle } from '../data/coachTypeStyles';
import { hashPassword } from '../utils/hash';
import type { Coach, CoachCategory } from '../types/models';
import type { MasterOption } from './masterApi';

interface MasterItem {
  itemCode: string;
  itemName: string;
  description?: string;
}

export async function getCoachCategories(): Promise<CoachCategory[]> {
  const items = await apiFetch<MasterItem[]>('/v{version}/Master/GetMasterItem?ItemType=CoachType');
  return (items || []).map(item => {
    const style = getCoachTypeStyle(item.itemCode);
    return {
      code: item.itemCode,
      label: item.itemName,
      short: style.short,
      icon: style.icon,
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
  return apiFetch<RegisterCoachResult>('/v{version}/Coach/save', {
    method: 'POST',
    body: JSON.stringify(params),
  });
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
}

interface CoachPublicListResponse {
  items: RawPublicCoach[];
  totalCount: number;
}

function mapPublicCoach(raw: RawPublicCoach): Coach {
  return {
    id: raw.coachCode,
    name: raw.coachName,
    categoryCode: raw.coachTypeCode,
    category: raw.coachTypeName,
    rating: raw.rating ?? 0,
    reviews: raw.reviewCount ?? 0,
    experience: raw.experienceYears ?? 0,
    city: raw.city_Cd ?? '',
    country: raw.country_Cd,
    online: false, // no live presence field on the backend

    bio: raw.coachDesc ?? '',
    tags: raw.serviceNames ? raw.serviceNames.split(', ') : [],
    clients: raw.happyClientCount ?? 0,
  };
}

export async function getCoachPublicList(
  params: CoachPublicListParams = {},
): Promise<{ coaches: Coach[]; totalCount: number }> {
  const query = new URLSearchParams();
  if (params.coachTypeCode) query.set('coachTypeCode', params.coachTypeCode);
  if (params.country) query.set('country', params.country);
  if (params.state) query.set('state', params.state);
  if (params.city) query.set('city', params.city);
  if (params.search) query.set('search', params.search);
  query.set('page', String(params.page ?? 1));
  query.set('pageSize', String(params.pageSize ?? 50)); // no pagination UI yet

  const data = await apiFetch<CoachPublicListResponse>(
    `/v{version}/Coach/public?${query.toString()}`,
  );
  return {
    coaches: (data?.items || []).map(mapPublicCoach),
    totalCount: data?.totalCount ?? 0,
  };
}

export async function getCoachProfile(): Promise<Coach> {
  const raw = await apiFetch<RawPublicCoach>('/v{version}/Coach/profile');
  return mapPublicCoach(raw);
}

/** Public coach profile by code — same endpoint the web CoachProfile page uses. */
export async function getCoachProfileByCode(coachCode: string): Promise<Coach> {
  const query = new URLSearchParams({ coachCode });
  const raw = await apiFetch<RawCoachProfileFull & RawPublicCoach>(
    `/v{version}/Coach/profile-by-id?${query.toString()}`,
  );
  return {
    ...mapPublicCoach({
      coachCode: raw.coachCode ?? coachCode,
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
    }),
    mobile: raw.mobile ?? '',
  };
}

/** Build wa.me URL from Indian mobile (matches web WhatsAppUrl intent). */
export function whatsAppUrlFromMobile(mobile?: string): string | null {
  if (!mobile?.trim()) return null;
  const digits = mobile.replace(/\D/g, '').replace(/^0+/, '');
  if (!digits) return null;
  // 10-digit local mobile → always prefix 91 (even if number starts with 91, e.g. 9123456789).
  if (digits.length === 10) return `https://wa.me/91${digits}`;
  // Already includes country code.
  if (digits.length === 12 && digits.startsWith('91')) return `https://wa.me/${digits}`;
  return null;
}

// Confirmed against a live GET /Coach/profile response — carries the edit-relevant fields
// (mobile, address, service codes, image URLs) that mapPublicCoach's public-facing Coach
// model deliberately leaves out.
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
  tagline?: string;
  locality?: string;
  add_Line?: string;
  city_Cd?: string;
  state_Cd?: string;
  pinCode?: string;
  country_Cd?: string;
  logo_Url?: string;
  profile_Pic_Url?: string;
  coachDesc?: string;
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
  tagline: string;
  locality: string;
  addLine: string;
  cityCd: string;
  stateCd: string;
  pinCode: string;
  countryCd: string;
  logoUrl: string;
  profilePicUrl: string;
  coachDesc: string;
}

export async function getCoachProfileFull(): Promise<CoachProfileFull> {
  const raw = await apiFetch<RawCoachProfileFull>('/v{version}/Coach/profile');
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
    tagline: raw.tagline ?? '',
    locality: raw.locality ?? '',
    addLine: raw.add_Line ?? '',
    cityCd: raw.city_Cd ?? '',
    stateCd: raw.state_Cd ?? '',
    pinCode: raw.pinCode ?? '',
    countryCd: raw.country_Cd ?? '',
    logoUrl: raw.logo_Url ?? '',
    profilePicUrl: raw.profile_Pic_Url ?? '',
    coachDesc: raw.coachDesc ?? '',
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
  await apiFetch('/v{version}/Coach/enquiry', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function getServicesForCategory(categoryCode: string): Promise<MasterOption[]> {
  if (!categoryCode) return [];
  const query = new URLSearchParams({ itemType: 'Service', filterText: categoryCode });
  const items = await apiFetch<MasterItem[]>(
    `/v{version}/Master/GetMasterItem?${query.toString()}`,
  );
  return (items || []).map(i => ({ code: i.itemCode, label: i.itemName }));
}

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
  tagline?: string;
  locality?: string;
  add_Line?: string;
  city_Cd?: string;
  state_Cd?: string;
  pinCode?: string;
  country_Cd?: string;
  logo_Url?: string;
  profile_Pic_Url?: string;
  coachDesc?: string;
}

export async function saveCoachProfile(params: SaveCoachProfileParams): Promise<void> {
  await apiFetch('/v{version}/Coach/save', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export interface ChangePasswordParams {
  currentPassword: string;
  newPassword: string;
}

// VERIFY: currentPassword/newPassword are hashed the same way login() hashes its password
// (matching CoachBLL.HashPassword) — not independently confirmed against a real call, since
// that needs a bearer token and a real current password to test.
export async function changePassword(params: ChangePasswordParams): Promise<void> {
  await apiFetch('/v{version}/Coach/change-password', {
    method: 'PUT',
    body: JSON.stringify({
      currentPassword: await hashPassword(params.currentPassword),
      newPassword: await hashPassword(params.newPassword),
    }),
  });
}
