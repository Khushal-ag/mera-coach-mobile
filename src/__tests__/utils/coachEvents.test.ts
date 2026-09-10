import {
  createEmptyEvent,
  getUpcomingCoachEvents,
  isValidCoachEventDate,
  parseCoachEvents,
  serializeCoachEvents,
  validateCoachEventsDraft,
} from '../../utils/coachEvents';

describe('coachEvents', () => {
  it('parses events and returns upcoming ones', () => {
    const events = parseCoachEvents([
      { title: 'Past', date: '2020-01-01' },
      { title: 'Soon', date: '2099-06-01', location: 'Pune' },
      { title: 'Undated' },
    ]);
    const upcoming = getUpcomingCoachEvents(events, 3, new Date('2026-09-01'));
    expect(upcoming.map(e => e.title)).toEqual(['Soon', 'Undated']);
  });

  it('serializes titled events only', () => {
    expect(
      serializeCoachEvents([
        { ...createEmptyEvent(), title: 'Yoga' },
        { ...createEmptyEvent(), title: '  ' },
      ]),
    ).toEqual([expect.objectContaining({ title: 'Yoga' })]);
  });

  it('validates event drafts and dates', () => {
    expect(validateCoachEventsDraft([{ ...createEmptyEvent(), location: 'Pune' }])).toMatch(
      /needs a title/,
    );
    expect(
      validateCoachEventsDraft([{ ...createEmptyEvent(), title: 'Workshop', date: 'not-a-date' }]),
    ).toMatch(/invalid date/);
    expect(isValidCoachEventDate('2026-09-02')).toBe(true);
    expect(isValidCoachEventDate('02/09/2026')).toBe(true);
    expect(isValidCoachEventDate('bad')).toBe(false);
    expect(isValidCoachEventDate('')).toBe(true);
  });

  it('hides events with invalid dates from upcoming list', () => {
    const events = parseCoachEvents([{ title: 'Bad date', date: '99-99-9999' }]);
    expect(getUpcomingCoachEvents(events, 3, new Date('2026-09-01'))).toEqual([]);
  });
});
