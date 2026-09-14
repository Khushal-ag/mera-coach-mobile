import { mergeCoachProfile } from '../../utils/mergeCoachProfile';
import type { Coach } from '../../types/models';

function base(overrides: Partial<Coach> = {}): Coach {
  return {
    id: 'C1',
    name: 'Ada',
    categoryCode: 'T1',
    category: 'Nutrition',
    rating: 0,
    reviews: 0,
    experience: 0,
    city: '',
    online: false,
    bio: '',
    tags: [],
    clients: 0,
    ...overrides,
  };
}

describe('mergeCoachProfile', () => {
  it('prefers API and fills empty strings/arrays from list', () => {
    const api = base({ bio: '', tags: [], reviews: 0, rating: 0 });
    const list = base({
      bio: 'From list',
      tags: ['Weight Loss'],
      reviews: 12,
      rating: 4.5,
      city: 'Pune',
    });
    const merged = mergeCoachProfile(api, list)!;
    expect(merged.bio).toBe('From list');
    expect(merged.tags).toEqual(['Weight Loss']);
    expect(merged.reviews).toBe(12);
    expect(merged.rating).toBe(4.5);
    expect(merged.city).toBe('Pune');
  });

  it('keeps API client count even when zero', () => {
    const merged = mergeCoachProfile(base({ clients: 0 }), base({ clients: 40 }))!;
    expect(merged.clients).toBe(0);
  });
});
