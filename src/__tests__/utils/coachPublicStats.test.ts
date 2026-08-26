import {
  buildPublicProfileStats,
  formatPublicStat,
  resolvePublicClientCount,
  shouldShowPublicClientCount,
  shouldShowPublicRating,
} from '../../utils/coachPublicStats';

describe('resolvePublicClientCount', () => {
  it('prefers live roster when viewer is the coach', () => {
    expect(
      resolvePublicClientCount({
        coachId: 'btlajm',
        marketingClients: 42,
        viewerCoachCode: 'btlajm',
        liveRosterLength: 3,
      }),
    ).toBe(3);
  });

  it('returns live 0 when roster is empty', () => {
    expect(
      resolvePublicClientCount({
        coachId: 'btlajm',
        marketingClients: 42,
        viewerCoachCode: 'btlajm',
        liveRosterLength: 0,
      }),
    ).toBe(0);
  });

  it('falls back to marketing count for other coaches', () => {
    expect(
      resolvePublicClientCount({
        coachId: 'btlajm',
        marketingClients: 42,
        viewerCoachCode: 'other',
        liveRosterLength: 3,
      }),
    ).toBe(42);
  });

  it('uses marketing count including 0 when no live overlay', () => {
    expect(
      resolvePublicClientCount({
        coachId: 'x',
        marketingClients: 0,
      }),
    ).toBe(0);
  });
});

describe('formatPublicStat', () => {
  it('formats numbers and returns null for missing', () => {
    expect(formatPublicStat(3)).toBe('3');
    expect(formatPublicStat(0)).toBe('0');
    expect(formatPublicStat(42)).toBe('42');
    expect(formatPublicStat(null)).toBeNull();
    expect(formatPublicStat(undefined)).toBeNull();
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
  it('hides seeded ratings with zero reviews', () => {
    expect(shouldShowPublicRating(3.5, 0)).toBe(false);
    expect(shouldShowPublicRating(3.7, 42)).toBe(true);
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

  it('includes all four when all are available', () => {
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
      { key: 'rating', value: '4.8', label: 'Rating' },
    ]);
  });
});
