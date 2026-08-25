import {
  parseDob,
  toApiDob,
  toDisplayDob,
  formatDob,
  formatLocalDate,
  cmToFeetInches,
  feetInchesToCm,
  validateHeight,
  validateClientPersonalProfile,
  validateLogin,
  validateCoachRegister,
  MANDATORY_FIELDS_BANNER,
} from '../validation';
import type { ClientProfile } from '../../types/models';

describe('parseDob', () => {
  it('parses DD/MM/YYYY', () => {
    const d = parseDob('15/03/1990');
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(1990);
    expect(d!.getMonth()).toBe(2);
    expect(d!.getDate()).toBe(15);
  });

  it('parses YYYY-MM-DD', () => {
    const d = parseDob('1990-03-15');
    expect(d).not.toBeNull();
    expect(formatDob(d!)).toBe('15/03/1990');
  });

  it('rejects impossible calendar dates', () => {
    expect(parseDob('31/02/2020')).toBeNull();
    expect(parseDob('2020-02-31')).toBeNull();
  });

  it('returns null for empty or garbage', () => {
    expect(parseDob('')).toBeNull();
    expect(parseDob('  ')).toBeNull();
    expect(parseDob('not-a-date')).toBeNull();
  });
});

describe('toApiDob / toDisplayDob', () => {
  it('converts UI DOB to API YYYY-MM-DD', () => {
    expect(toApiDob('15/03/1990')).toBe('1990-03-15');
  });

  it('normalizes API DOB to display DD/MM/YYYY', () => {
    expect(toDisplayDob('1990-03-15')).toBe('15/03/1990');
    expect(toDisplayDob('15/03/1990')).toBe('15/03/1990');
  });

  it('returns empty string for invalid input', () => {
    expect(toApiDob('')).toBe('');
    expect(toApiDob('bad')).toBe('');
    expect(toDisplayDob('')).toBe('');
    expect(toDisplayDob('bad')).toBe('');
  });

  it('formatLocalDate uses local calendar components', () => {
    expect(formatLocalDate(new Date(2026, 7, 25))).toBe('2026-08-25');
  });
});

describe('height ft/in ↔ cm', () => {
  it('converts feet+inches to cm', () => {
    expect(feetInchesToCm(5, 7)).toBeCloseTo(170.18, 2);
    expect(feetInchesToCm(5, 0)).toBeCloseTo(152.4, 2);
  });

  it('converts cm to feet+inches with 12-inch rollover', () => {
    expect(cmToFeetInches(170.18)).toEqual({ feet: 5, inches: 7 });
    expect(cmToFeetInches(182.88)).toEqual({ feet: 6, inches: 0 });
  });

  it('validateHeight still requires cm range', () => {
    expect(validateHeight('')).toBe('Height is required.');
    expect(validateHeight('165')).toBeNull();
    expect(validateHeight('90')).toMatch(/100-250/);
    expect(validateHeight('260')).toMatch(/100-250/);
  });
});

function emptyProfile(overrides: Partial<ClientProfile> = {}): ClientProfile {
  return {
    name: '',
    phone: '',
    email: '',
    location: '',
    dob: '',
    age: '',
    gender: '',
    height: '',
    weight: '',
    ...overrides,
  } as ClientProfile;
}

describe('validateClientPersonalProfile (aggregate)', () => {
  it('returns all missing required fields at once', () => {
    const result = validateClientPersonalProfile(emptyProfile());
    expect(result.ok).toBe(false);
    expect(result.banner).toBe(MANDATORY_FIELDS_BANNER);
    expect(Object.keys(result.errors).sort()).toEqual(
      ['age', 'dob', 'gender', 'height', 'location', 'name', 'phone', 'weight'].sort(),
    );
  });

  it('passes when all required fields are valid', () => {
    const result = validateClientPersonalProfile(
      emptyProfile({
        name: 'Ada',
        phone: '9876543210',
        location: 'Mumbai',
        age: '30',
        gender: 'F',
        height: '165',
        weight: '60',
      }),
    );
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual({});
    expect(result.banner).toBeNull();
  });

  it('flags invalid email without requiring it', () => {
    const result = validateClientPersonalProfile(
      emptyProfile({
        name: 'Ada',
        phone: '9876543210',
        email: 'not-an-email',
        location: 'Mumbai',
        age: '30',
        gender: 'F',
        height: '165',
        weight: '60',
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.errors.email).toBeTruthy();
  });
});

describe('validateLogin / validateCoachRegister', () => {
  it('collects both login errors', () => {
    const result = validateLogin({ email: '', password: '' });
    expect(result.ok).toBe(false);
    expect(result.errors.email).toBeTruthy();
    expect(result.errors.password).toBeTruthy();
  });

  it('collects all register errors', () => {
    const result = validateCoachRegister({ name: '', category: '', mobile: '', email: '' });
    expect(result.ok).toBe(false);
    expect(Object.keys(result.errors).sort()).toEqual(
      ['category', 'email', 'mobile', 'name'].sort(),
    );
  });
});
