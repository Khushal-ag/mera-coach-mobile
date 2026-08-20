import { apiFetch } from './client';
import { getCurrentCoachCode } from '../auth/session';
import { createBlankDiet } from '../data/clientProfiles';
import type { ClientProfile, ClientSummary } from '../types/models';

function initialsOf(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// VERIFY: field names inferred from SaveClientDetailRequest — Swagger doesn't document GET
// response bodies for authenticated endpoints. Confirm against a real call.
interface RawClientListItem {
  clientCode?: string;
  assessmentCode?: string;
  clientName?: string;
  age?: number;
  status_Cd?: string;
}

function mapClientListItem(raw: RawClientListItem): ClientSummary {
  return {
    id: raw.clientCode,
    clientCode: raw.clientCode,
    assessmentCode: raw.assessmentCode,
    name: raw.clientName ?? '',
    age: raw.age,
    status: raw.status_Cd,
    initials: raw.clientName ? initialsOf(raw.clientName) : undefined,
  };
}

export interface GetClientListParams {
  coachCode?: string;
  searchOption?: string;
  searchText?: string;
}

export async function getClientList(params: GetClientListParams = {}): Promise<ClientSummary[]> {
  const coachCode = params.coachCode ?? getCurrentCoachCode();
  const items = await apiFetch<RawClientListItem[]>('/v{version}/Client/ClientList', {
    method: 'POST',
    body: JSON.stringify({
      coachCode,
      searchOption: params.searchOption,
      searchText: params.searchText,
    }),
  });
  return (items || []).map(mapClientListItem);
}

// VERIFY: nested `lifestyle` section is a guess at the response shape — confirm and adjust.
// mapClientDetailToProfile degrades to blank values rather than crashing if it's wrong.
interface RawClientDetail {
  clientCode?: string;
  assessmentCode?: string;
  clientName?: string;
  mobileNo?: string;
  emailId?: string;
  gender?: string;
  age?: number;
  weight?: number;
  height?: number;
  lifestyle?: {
    foodPreference?: string;
    regionalCuisine?: string;
    physicalActivity?: string;
    workType?: string;
    sleepDuration?: string;
    pregnancy?: string;
    medicalConditions?: string;
    foodAllergies?: string;
    primaryGoal?: string;
    targetTimeline?: string;
    additionalNotes?: string;
  };
}

function splitCsvField(value: string | undefined): string[] {
  return value
    ? value
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    : [];
}

export async function getClientDetail(params: {
  clientCode?: string;
  assessmentCode?: string;
}): Promise<RawClientDetail> {
  return apiFetch<RawClientDetail>('/v{version}/Client/ClientDetail', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// Diet isn't reconstructed here — the backend stores meals as a flattened per-slot string
// that can't be split back into qty/kcal entries, so edit screens start from a blank diet.
export function mapClientDetailToProfile(raw: RawClientDetail): ClientProfile {
  const lifestyle = raw.lifestyle;
  return {
    name: raw.clientName ?? '',
    phone: raw.mobileNo ?? '',
    email: raw.emailId ?? '',
    age: raw.age != null ? String(raw.age) : '',
    gender: raw.gender ?? '',
    height: raw.height != null ? String(raw.height) : '',
    weight: raw.weight != null ? String(raw.weight) : '',
    physicalActivity: lifestyle?.physicalActivity ?? '',
    workType: lifestyle?.workType ?? '',
    sleepDuration: lifestyle?.sleepDuration ?? '',
    pregnancyBf: lifestyle?.pregnancy ?? 'Not Applicable / NA',
    foodPreference: lifestyle?.foodPreference ?? '',
    regionalCuisine: lifestyle?.regionalCuisine ?? '',
    medicalConditions: splitCsvField(lifestyle?.medicalConditions),
    foodAllergies: splitCsvField(lifestyle?.foodAllergies),
    primaryGoal: lifestyle?.primaryGoal ?? '',
    targetTimeline: lifestyle?.targetTimeline ?? '',
    notes: lifestyle?.additionalNotes ?? '',
    diet: createBlankDiet(),
    saveBmiCheckup: true,
  };
}
