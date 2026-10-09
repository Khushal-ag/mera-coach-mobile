import {
  buildPublicProfileStats,
  resolvePublicClientCount,
  shouldShowPublicClientCount,
  shouldShowPublicRating,
} from '../../utils/coachPublicStats';

describe('resolvePublicClientCount', () => {
  it('keeps the manual count when the viewer is the coach', () => {
    expect(
      resolvePublicClientCount({
        coachId: 'btlajm',
        marketingClients: 42,
        viewerCoachCode: 'btlajm',
        liveRosterLength: 3,
      }),
    ).toBe(42);
  });

  it('does not replace a manual count with an empty roster', () => {
    expect(
      resolvePublicClientCount({
        coachId: 'btlajm',
        marketingClients: 42,
        viewerCoachCode: 'btlajm',
        liveRosterLength: 0,
      }),
    ).toBe(42);
  });

  it('returns the manual count for other coaches', () => {
    expect(
      resolvePublicClientCount({
        coachId: 'btlajm',
        marketingClients: 42,
        viewerCoachCode: 'other',
        liveRosterLength: 3,
      }),
    ).toBe(42);
  });

  it('keeps a manual zero', () => {
    expect(
      resolvePublicClientCount({
        coachId: 'x',
        marketingClients: 0,
        liveRosterLength: 4,
      }),
    ).toBe(0);
  });
});

describe('shouldShowPublicClientCount', () => {
  it('hides missing and zero counts', () => {
    expect(shouldShowPublicClientCount(null)).toBe(false);
    expect(shouldShowPublicClientCount(undefined)).toBe(false);
    expect(shouldShowPublicClientCount(0)).toBe(false);
    expect(shouldShowPublicClientCount(1)).toBe(true);
  });
});

describe('shouldShowPublicRating', () => {
  it('does not present a formula rating or client total as reviews', () => {
    expect(shouldShowPublicRating(3.5, 0)).toBe(false);
    expect(shouldShowPublicRating(4.8, 42)).toBe(false);
  });
});

describe('buildPublicProfileStats', () => {
  it('returns only stats with real values', () => {
    expect(
      buildPublicProfileStats({
        clientCount: 0,
        experience: 0,
        servicesCount: 0,
        rating: 3.5,
        reviews: 0,
      }),
    ).toEqual([]);
  });

  it('includes happy clients and services when present', () => {
    expect(
      buildPublicProfileStats({
        clientCount: 12,
        experience: 0,
        servicesCount: 3,
        rating: 0,
        reviews: 0,
      }),
    ).toEqual([
      { key: 'clients', value: '12', label: 'Happy Clients' },
      { key: 'services', value: '3', label: 'Services' },
    ]);
  });

  it('includes clients, experience, and services without a review rating', () => {
    expect(
      buildPublicProfileStats({
        clientCount: 5,
        experience: 4,
        servicesCount: 2,
        rating: 4.8,
        reviews: 10,
      }),
    ).toEqual([
      { key: 'clients', value: '5', label: 'Happy Clients' },
      { key: 'experience', value: '4', label: 'Years Exp.' },
      { key: 'services', value: '2', label: 'Services' },
    ]);
  });
});
