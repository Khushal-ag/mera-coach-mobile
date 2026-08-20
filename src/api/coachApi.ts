import { apiFetch } from './client';
import { getCoachTypeStyle } from '../data/coachTypeStyles';
import type { Coach, CoachCategory } from '../types/models';

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

// VERIFY: response shape assumed to match /Coach/public — not independently confirmed.
export async function getCoachProfile(): Promise<Coach> {
  const raw = await apiFetch<RawPublicCoach>('/v{version}/Coach/profile');
  return mapPublicCoach(raw);
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
