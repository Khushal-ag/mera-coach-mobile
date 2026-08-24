import { parseDob, toApiDob, toDisplayDob, formatDob, formatLocalDate } from '../validation';

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
