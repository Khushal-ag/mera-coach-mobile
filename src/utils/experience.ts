/** Self-reported years, or tenure from account creation when years are unset. */
export function formatExperienceDisplay(
  experienceYears?: number | null,
  createdAt?: string | null,
): string {
  if (experienceYears != null && experienceYears > 0) {
    return `${experienceYears} yrs`;
  }

  if (createdAt) {
    const start = new Date(createdAt);
    if (!Number.isNaN(start.getTime()) && start.getTime() <= Date.now()) {
      const ms = Date.now() - start.getTime();
      const years = Math.floor(ms / (365.25 * 24 * 60 * 60 * 1000));
      if (years >= 1) return `${years} yrs`;
      return '<1 yr';
    }
  }

  // No self-reported years and no usable creation date — don't invent "0 yrs".
  return '—';
}

/** First parseable date among common coach-profile creation field names. */
export function pickCoachCreatedAt(
  raw: Record<string, unknown> | null | undefined,
): string | undefined {
  if (!raw) return undefined;
  const keys = [
    'createdOn',
    'createdDate',
    'created_On',
    'registrationDate',
    'joiningDate',
    'joinedOn',
    'dtCreated',
    'createdAt',
  ];
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'string' && value.trim() && !Number.isNaN(Date.parse(value))) {
      return value;
    }
  }
  return undefined;
}
