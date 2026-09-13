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

  it('hides past events from the public upcoming list', () => {
    const events = parseCoachEvents([
      { title: 'Past Event Should Hide', date: '2025-01-01', time: '9:00 AM' },
      { title: 'Weekend Fat-Loss Workshop', date: '2026-10-05', time: '10:00 AM' },
    ]);
    const upcoming = getUpcomingCoachEvents(events, 3, new Date('2026-09-12'));
    expect(upcoming.map(e => e.title)).toEqual(['Weekend Fat-Loss Workshop']);
  });

  it('parses and serializes optional imageUrl', () => {
    const parsed = parseCoachEvents([
      { title: 'Yoga', date: '2099-01-01', imageUrl: '/document/CH1/evt.jpg' },
      { title: 'Alt', image: '/document/CH1/alt.jpg' },
    ]);
    expect(parsed).toEqual([
      expect.objectContaining({ title: 'Yoga', imageUrl: '/document/CH1/evt.jpg' }),
      expect.objectContaining({ title: 'Alt', imageUrl: '/document/CH1/alt.jpg' }),
    ]);
    expect(
      serializeCoachEvents([
        { ...createEmptyEvent(), title: 'Yoga', imageUrl: '/document/CH1/evt.jpg' },
        { ...createEmptyEvent(), title: 'No image', imageUrl: '' },
      ]),
    ).toEqual([
      expect.objectContaining({ title: 'Yoga', imageUrl: '/document/CH1/evt.jpg' }),
      expect.objectContaining({ title: 'No image' }),
    ]);
    expect(
      serializeCoachEvents([{ ...createEmptyEvent(), title: 'No image', imageUrl: '' }])[0],
    ).not.toHaveProperty('imageUrl');
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
      validateCoachEventsDraft([{ ...createEmptyEvent(), imageUrl: '/document/CH1/evt.jpg' }]),
    ).toMatch(/needs a title/);
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
