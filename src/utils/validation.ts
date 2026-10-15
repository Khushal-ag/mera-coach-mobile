import type { ClientProfile } from '../types/models';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function stripNonDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function sanitizePhoneInput(value: string): string {
  return stripNonDigits(value).slice(0, 10);
}

export function sanitizePinInput(value: string): string {
  return stripNonDigits(value).slice(0, 6);
}

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
function isStrictInt(value: string): boolean {
  return /^\d+$/.test(value.trim());
}

function isStrictNumber(value: string): boolean {
  return /^\d+(\.\d+)?$/.test(value.trim());
}

/** Normalize gender codes from API (Male/Female/M/F) to M/F. */
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

/** Format Date to DD/MM/YYYY for UI display (matches web flatpickr). */
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

/** UI DOB (DD/MM/YYYY) to API/SQL date string YYYY-MM-DD. Empty when absent or invalid. */
export function toApiDob(value: string): string {
  const d = parseDob(value);
  return d ? formatLocalDate(d) : '';
}

/** Normalize API/UI DOB strings to DD/MM/YYYY for display. Empty when absent or invalid. */
export function toDisplayDob(value: string): string {
  const d = parseDob(value);
  return d ? formatDob(d) : '';
}

function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

/** Indian mobile: exactly 10 digits starting with 6-9. */
function isValidIndianMobile(value: string): boolean {
  const digits = stripNonDigits(value);
  return digits.length === 10 && /^[6-9]/.test(digits);
}

export function validateRequired(value: string, fieldLabel: string): string | null {
  if (!value.trim()) return `${fieldLabel} is required.`;
  return null;
}

function validateEmail(value: string, required = true): string | null {
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

function validatePinCode(value: string, required = false): string | null {
  const trimmed = value.trim();
  if (!trimmed) return required ? 'Pin code is required.' : null;
  const digits = stripNonDigits(trimmed);
  if (digits.length !== 6) return 'Please enter a valid 6-digit pin code.';
  return null;
}

function validateAge(value: string, required = true): string | null {
  if (!value.trim()) return required ? 'Age is required.' : null;
  if (!isStrictInt(value)) return 'Please enter a valid age (5-100).';
  const age = parseInt(value, 10);
  if (age < 5 || age > 100) return 'Please enter a valid age (5-100).';
  return null;
}

export type FieldErrorMap = Record<string, string>;

export interface FormValidationResult {
  ok: boolean;
  errors: FieldErrorMap;
  banner: string | null;
}

export const MANDATORY_FIELDS_BANNER = 'Please fill all mandatory fields';

/** Either Date of Birth or Age is enough. Age is derived when only DOB is entered. */
function collectDobOrAgeErrors(dob: string, age: string): FieldErrorMap {
  const errors: FieldErrorMap = {};
  if (!dob.trim() && !age.trim()) {
    const msg = 'Please enter Date of Birth or Age.';
    errors.dob = msg;
    errors.age = msg;
    return errors;
  }
  if (dob.trim() && !parseDob(dob)) {
    errors.dob = 'Please enter a valid Date of Birth (DD/MM/YYYY).';
  }
  if (age.trim()) {
    const ageErr = validateAge(age, false);
    if (ageErr) errors.age = ageErr;
  }
  return errors;
}

function resultFromErrors(errors: FieldErrorMap): FormValidationResult {
  const keys = Object.keys(errors);
  if (keys.length === 0) return { ok: true, errors: {}, banner: null };
  return { ok: false, errors, banner: MANDATORY_FIELDS_BANNER };
}

function putError(errors: FieldErrorMap, field: string, message: string | null) {
  if (message) errors[field] = message;
}

/** Height is always stored/validated in cm (API field). UI may collect ft+in. */
export const HEIGHT_CM_MIN = 100;
export const HEIGHT_CM_MAX = 250;

export function feetInchesToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * 2.54;
}

/** Convert cm to whole feet + rounded inches (normalizes 12 in to +1 ft). */
export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  let feet = Math.floor(totalInches / 12);
  let inches = Math.round(totalInches % 12);
  if (inches === 12) {
    feet += 1;
    inches = 0;
  }
  return { feet, inches };
}

export function validateHeight(value: string): string | null {
  if (!value.trim()) return 'Height is required.';
  if (!isStrictNumber(value)) {
    return `Please enter height between ${HEIGHT_CM_MIN}-${HEIGHT_CM_MAX} cm.`;
  }
  const h = parseFloat(value);
  if (h < HEIGHT_CM_MIN || h > HEIGHT_CM_MAX) {
    return `Please enter height between ${HEIGHT_CM_MIN}-${HEIGHT_CM_MAX} cm.`;
  }
  return null;
}

export function validateWeight(value: string): string | null {
  if (!value.trim()) return 'Weight is required.';
  if (!isStrictNumber(value)) return 'Please enter weight between 20-200 kg.';
  const w = parseFloat(value);
  if (w < 20 || w > 200) return 'Please enter weight between 20-200 kg.';
  return null;
}

function validateNonNegativeInt(
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

/** Add Client step 1 validation (mirrors web). */
export function validateClientPersonalProfile(form: ClientProfile): FormValidationResult {
  const errors: FieldErrorMap = {};
  putError(errors, 'name', validateRequired(form.name, 'Full name'));
  putError(errors, 'phone', validateMobile(form.phone));
  putError(errors, 'email', validateOptionalEmail(form.email));
  putError(errors, 'location', validateRequired(form.location, 'Location'));
  Object.assign(errors, collectDobOrAgeErrors(form.dob, form.age));
  if (!form.gender) errors.gender = 'Gender is required.';
  putError(errors, 'height', validateHeight(form.height.trim()));
  putError(errors, 'weight', validateWeight(form.weight.trim()));
  return resultFromErrors(errors);
}

/** Lifestyle + health-goals step (mirrors web Step 2 validation). */
export function validateClientLifestyleProfile(form: ClientProfile): FormValidationResult {
  const errors: FieldErrorMap = {};
  putError(
    errors,
    'physicalActivity',
    validateRequired(form.physicalActivity ?? '', 'Physical activity'),
  );
  putError(errors, 'workType', validateRequired(form.workType ?? '', 'Work type'));
  putError(errors, 'sleepDuration', validateRequired(form.sleepDuration ?? '', 'Sleep duration'));
  putError(
    errors,
    'foodPreference',
    validateRequired(form.foodPreference ?? '', 'Food preference'),
  );
  putError(
    errors,
    'regionalCuisine',
    validateRequired(form.regionalCuisine ?? '', 'Regional cuisine'),
  );
  if (!form.medicalConditions?.length) {
    errors.medicalConditions = 'Please select at least one medical condition.';
  }
  if (!form.foodAllergies?.length) {
    errors.foodAllergies = 'Please select at least one food allergy.';
  }
  putError(errors, 'primaryGoal', validateRequired(form.primaryGoal ?? '', 'Primary goal'));
  return resultFromErrors(errors);
}

function validateCoachContactFields(mobile: string, email: string): FormValidationResult {
  const errors: FieldErrorMap = {};
  putError(errors, 'mobile', validateMobile(mobile));
  putError(errors, 'email', validateEmail(email));
  return resultFromErrors(errors);
}

export function validateCoachRegister(fields: {
  name: string;
  category: string;
  mobile: string;
  email: string;
  referralMobile?: string;
}): FormValidationResult {
  const errors: FieldErrorMap = {};
  putError(errors, 'name', validateRequired(fields.name, 'Coach name'));
  if (!fields.category.trim()) errors.category = 'Coach category is required.';
  putError(errors, 'mobile', validateMobile(fields.mobile));
  putError(errors, 'email', validateEmail(fields.email));

  const referral = (fields.referralMobile ?? '').trim();
  if (referral) {
    putError(errors, 'referralMobile', validateMobile(referral, false));
    if (
      !errors.referralMobile &&
      stripNonDigits(referral) === stripNonDigits(fields.mobile) &&
      stripNonDigits(referral).length === 10
    ) {
      errors.referralMobile = 'Referral mobile cannot be the same as your mobile number.';
    }
  }
  return resultFromErrors(errors);
}

export function validateLogin(fields: { email: string; password: string }): FormValidationResult {
  const errors: FieldErrorMap = {};
  if (!fields.email.trim()) errors.email = 'Email or mobile is required.';
  if (!fields.password) errors.password = 'Password is required.';
  return resultFromErrors(errors);
}

export function validateCoachProfileEdit(fields: {
  coachName: string;
  categoryCode: string;
  mobile: string;
  email: string;
  pinCode: string;
  experienceYears: string;
  happyClientCount: string;
  coachDesc: string;
  addLine: string;
  certificationCount?: string;
}): FormValidationResult {
  const errors: FieldErrorMap = {};
  putError(errors, 'coachName', validateRequired(fields.coachName, 'Coach name'));
  if (!fields.categoryCode.trim()) errors.category = 'Coach category is required.';
  Object.assign(errors, validateCoachContactFields(fields.mobile, fields.email).errors);
  putError(errors, 'pinCode', validatePinCode(fields.pinCode, true));
  putError(
    errors,
    'experienceYears',
    validateNonNegativeInt(fields.experienceYears, 'Experience years', true),
  );
  putError(
    errors,
    'happyClientCount',
    validateNonNegativeInt(fields.happyClientCount, 'Happy client count', true),
  );
  putError(errors, 'coachDesc', validateRequired(fields.coachDesc, 'Description'));
  putError(errors, 'addLine', validateRequired(fields.addLine, 'Address'));
  putError(
    errors,
    'certificationCount',
    validateNonNegativeInt(fields.certificationCount ?? '', 'Certifications'),
  );
  return resultFromErrors(errors);
}
