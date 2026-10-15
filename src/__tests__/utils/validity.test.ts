import { describeValidity } from '../../utils/validity';

const today = new Date(2026, 9, 15); // 15 Oct 2026

describe('describeValidity', () => {
  it('reads yyyy-MM-dd and dd/MM/yyyy', () => {
    expect(describeValidity('2027-10-15', today)?.dateLabel).toBe('15 Oct 2027');
    expect(describeValidity('15/03/2027', today)?.dateLabel).toBe('15 Mar 2027');
  });
  it('is ok well before the end', () => {
    expect(describeValidity('2027-10-15', today)?.tone).toBe('ok');
  });
  it('warns in the last 15 days, including the last day', () => {
    expect(describeValidity('2026-10-30', today)).toMatchObject({ tone: 'soon', daysLeft: 15 });
    expect(describeValidity('2026-10-15', today)).toMatchObject({ tone: 'soon', daysLeft: 0 });
  });
  it('is expired the day after the end date', () => {
    expect(describeValidity('2026-10-14', today)).toMatchObject({ tone: 'expired', daysLeft: -1 });
  });
  it('returns null for empty or invalid input', () => {
    expect(describeValidity('', today)).toBeNull();
    expect(describeValidity(undefined, today)).toBeNull();
    expect(describeValidity('31/02/2027', today)).toBeNull();
    expect(describeValidity('soon', today)).toBeNull();
  });
});
