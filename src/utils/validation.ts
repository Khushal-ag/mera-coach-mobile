import type { ClientProfile } from '../types/models';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Strip non-digit characters from a phone/pin input. */
export function stripNonDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/** Restrict phone input to up to 10 digits as the user types. */
export function sanitizePhoneInput(value: string): string {
  return stripNonDigits(value).slice(0, 10);
}

/** Force lowercase and strip spaces as the user types email. */
export function sanitizeEmailInput(value: string): string {
  return value.toLowerCase().replace(/\s/g, '');
}

/** Local calendar date as YYYY-MM-DD (avoids UTC off-by-one from toISOString). */
export function formatLocalDate(date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** True only when the whole string is an integer (rejects "12abc"). */
export function isStrictInt(value: string): boolean {
  return /^\d+$/.test(value.trim());
}

/** True only when the whole string is an integer or decimal. */
export function isStrictNumber(value: string): boolean {
  return /^\d+(\.\d+)?$/.test(value.trim());
}

/** Normalize gender codes from API (Male/Female/M/F) → M/F. */
export function normalizeGender(value: string | undefined | null): string {
  const v = (value ?? '').trim().toLowerCase();
  if (v === 'm' || v === 'male') return 'M';
  if (v === 'f' || v === 'female') return 'F';
  return '';
}

/** Age in whole years from a Date (same logic as web AddClient flatpickr). */
export function ageFromDate(dob: Date, today = new Date()): number {
  let age = today.getFullYear() - dob.getFullYear();
  if (
    today.getMonth() < dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())
  ) {
    age--;
  }
  return age;
}

/** Format Date → DD/MM/YYYY for UI display (matches web flatpickr). */
export function formatDob(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** Parse DD/MM/YYYY, YYYY-MM-DD, or ISO into a Date, or null if invalid. */
export function parseDob(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (dmy) {
    const day = parseInt(dmy[1]!, 10);
    const month = parseInt(dmy[2]!, 10) - 1;
    const year = parseInt(dmy[3]!, 10);
    const d = new Date(year, month, day);
    if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) return d;
    return null;
  }

  // API / SQL-safe date-only (and ISO datetime prefix).
  const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (ymd) {
    const year = parseInt(ymd[1]!, 10);
    const month = parseInt(ymd[2]!, 10) - 1;
    const day = parseInt(ymd[3]!, 10);
    const d = new Date(year, month, day);
    if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) return d;
    return null;
  }

  const iso = new Date(trimmed);
  return isNaN(iso.getTime()) ? null : iso;
}

/** UI DOB (DD/MM/YYYY) → API/SQL date string YYYY-MM-DD. Empty when absent or invalid. */
export function toApiDob(value: string): string {
  const d = parseDob(value);
  return d ? formatLocalDate(d) : '';
}

/** Normalize API/UI DOB strings to DD/MM/YYYY for display. Empty when absent or invalid. */
export function toDisplayDob(value: string): string {
  const d = parseDob(value);
  return d ? formatDob(d) : '';
}

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

/** Indian mobile: exactly 10 digits starting with 6-9. */
export function isValidIndianMobile(value: string): boolean {
  const digits = stripNonDigits(value);
  return digits.length === 10 && /^[6-9]/.test(digits);
}

export function validateRequired(value: string, fieldLabel: string): string | null {
  if (!value.trim()) return `${fieldLabel} is required.`;
  return null;
}

export function validateEmail(value: string, required = true): string | null {
  const trimmed = value.trim();
  if (!trimmed) return required ? 'Email address is required.' : null;
  if (!isValidEmail(trimmed)) return 'Please enter a valid email address.';
  return null;
}

export function validateOptionalEmail(value: string): string | null {
  return validateEmail(value, false);
}

export function validateMobile(value: string, required = true): string | null {
  const trimmed = value.trim();
  if (!trimmed) return required ? 'Mobile number is required.' : null;
  if (!isValidIndianMobile(trimmed))
    return 'Please enter a valid 10-digit mobile number (starting with 6-9).';
  return null;
}

export function validatePinCode(value: string, required = false): string | null {
  const trimmed = value.trim();
  if (!trimmed) return required ? 'Pin code is required.' : null;
  const digits = stripNonDigits(trimmed);
  if (digits.length !== 6) return 'Please enter a valid 6-digit pin code.';
  return null;
}

export function validateAge(value: string, required = true): string | null {
  if (!value.trim()) return required ? 'Age is required.' : null;
  if (!isStrictInt(value)) return 'Please enter a valid age (5-100).';
  const age = parseInt(value, 10);
  if (age < 5 || age > 100) return 'Please enter a valid age (5-100).';
  return null;
}

/** Web rule: at least one of DOB or Age must be provided. */
export function validateDobOrAge(dob: string, age: string): string | null {
  if (!dob.trim() && !age.trim()) return 'Please enter Date of Birth or Age.';
  if (dob.trim() && !parseDob(dob)) return 'Please enter a valid Date of Birth (DD/MM/YYYY).';
  if (age.trim()) return validateAge(age, false);
  return null;
}

export function validateHeight(value: string): string | null {
  if (!value.trim()) return 'Height is required.';
  if (!isStrictNumber(value)) return 'Please enter height between 100-250 cm.';
  const h = parseFloat(value);
  if (h < 100 || h > 250) return 'Please enter height between 100-250 cm.';
  return null;
}

export function validateWeight(value: string): string | null {
  if (!value.trim()) return 'Weight is required.';
  if (!isStrictNumber(value)) return 'Please enter weight between 20-200 kg.';
  const w = parseFloat(value);
  if (w < 20 || w > 200) return 'Please enter weight between 20-200 kg.';
  return null;
}

export function validateNonNegativeInt(
  value: string,
  fieldLabel: string,
  required = false,
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return required ? `${fieldLabel} is required.` : null;
  if (!isStrictInt(trimmed)) return `Please enter a valid ${fieldLabel.toLowerCase()}.`;
  const num = parseInt(trimmed, 10);
  if (num < 0) return `Please enter a valid ${fieldLabel.toLowerCase()}.`;
  return null;
}

/** Validates the personal-profile step of the Add Client wizard (mirrors web Step 1). */
export function validateClientPersonalProfile(form: ClientProfile): string | null {
  return (
    validateRequired(form.name, 'Full name') ||
    validateMobile(form.phone) ||
    validateOptionalEmail(form.email) ||
    validateMobile(form.alternateMobile, false) ||
    validateRequired(form.location, 'Location') ||
    validateDobOrAge(form.dob, form.age) ||
    (!form.gender ? 'Gender is required.' : null) ||
    validateHeight(form.height) ||
    validateWeight(form.weight)
  );
}

/** Validates coach profile contact fields on edit. */
export function validateCoachContactFields(mobile: string, email: string): string | null {
  return validateMobile(mobile) || validateEmail(email);
}
