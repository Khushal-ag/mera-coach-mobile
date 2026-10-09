export type ProfileCompletionItem = {
  key: string;
  label: string;
  done: boolean;
};

export type ProfileCompletionInput = {
  coachName?: string | null;
  coachTypeCode?: string | null;
  cityCd?: string | null;
  city_Cd?: string | null;
  tagline?: string | null;
  coachDesc?: string | null;
  serviceCodes?: string[] | null;
  experienceYears?: number | null;
  happyClientCount?: number | null;
  pinCode?: string | null;
  locality?: string | null;
  addLine?: string | null;
  add_Line?: string | null;
  profilePicUrl?: string | null;
  /** Stored directory flag from the API. When present, it decides public status. */
  isProfileVisible?: boolean;
  /**
   * Server list of still-missing required fields. Labels match the checklist below.
   * Omit when the API did not send the list.
   */
  missingPublicFields?: string[] | null;
};

export type ProfileCompletion = {
  percent: number;
  items: ProfileCompletionItem[];
  isPublicReady: boolean;
  missingLabels: string[];
};

function hasText(value: unknown): boolean {
  return !!String(value ?? '').trim();
}

function enteredNumber(value: number | null | undefined): boolean {
  return value != null && Number.isFinite(value);
}

/**
 * Checklist matches CoachDAL public-visibility rules.
 * The server flag is the authority: a local field check must not say public
 * when IsProfileVisible is false.
 */
export function getProfileCompletion(profile: ProfileCompletionInput): ProfileCompletion {
  const addLine = String(profile.addLine ?? profile.add_Line ?? '').trim();
  const locality = String(profile.locality ?? '').trim();
  const services = profile.serviceCodes ?? [];

  const items: ProfileCompletionItem[] = [
    { key: 'photo', label: 'Profile photo', done: hasText(profile.profilePicUrl) },
    { key: 'name', label: 'Coach name', done: hasText(profile.coachName) },
    { key: 'category', label: 'Coach category', done: hasText(profile.coachTypeCode) },
    {
      key: 'city',
      label: 'City',
      done: hasText(profile.cityCd ?? profile.city_Cd),
    },
    { key: 'tagline', label: 'Tagline', done: hasText(profile.tagline) },
    { key: 'description', label: 'About / description', done: hasText(profile.coachDesc) },
    { key: 'services', label: 'Services', done: services.some(code => hasText(code)) },
    {
      key: 'experience',
      label: 'Years of experience',
      done: enteredNumber(profile.experienceYears),
    },
    {
      key: 'clients',
      label: 'Happy clients count',
      done: enteredNumber(profile.happyClientCount),
    },
    { key: 'pincode', label: 'Pincode', done: hasText(profile.pinCode) },
    { key: 'location', label: 'Locality or address', done: !!locality || !!addLine },
  ];

  if (Array.isArray(profile.missingPublicFields)) {
    const missing = new Set(profile.missingPublicFields);
    for (const item of items) item.done = !missing.has(item.label);
  }

  const doneCount = items.filter(item => item.done).length;
  const percent = Math.round((doneCount / items.length) * 100);
  const localReady = items.every(item => item.done);
  const isPublicReady =
    profile.isProfileVisible === true
      ? true
      : profile.isProfileVisible === false
        ? false
        : localReady;

  return {
    percent,
    items,
    isPublicReady,
    missingLabels: items.filter(item => !item.done).map(item => item.label),
  };
}
