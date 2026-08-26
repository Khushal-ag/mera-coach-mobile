import { buildCoachSuccessHighlights } from '../../utils/coachPublicSocialProof';

describe('buildCoachSuccessHighlights', () => {
  it('returns empty when profile has no meaningful fields', () => {
    expect(
      buildCoachSuccessHighlights({
        name: 'Ada',
        clients: 0,
        experience: 0,
        bio: '',
        tags: [],
        category: '',
      }),
    ).toEqual([]);
  });

  it('builds cards from clients, experience, tagline, and services', () => {
    const items = buildCoachSuccessHighlights({
      name: 'Ada Coach',
      clients: 40,
      experience: 5,
      bio: 'Long bio unused when tagline exists',
      tagline: 'Strength for busy professionals',
      tags: ['Weight Loss', 'Nutrition', 'Yoga'],
      category: 'Fitness Coach',
    });

    expect(items.map(i => i.id)).toEqual([
      'clients',
      'experience',
      'tagline',
      'svc-Weight Loss',
      'svc-Nutrition',
    ]);
    expect(items[0].badge).toContain('40+');
    expect(items[2].body).toBe('Strength for busy professionals');
  });

  it('falls back to bio when tagline is missing', () => {
    const items = buildCoachSuccessHighlights({
      name: 'Ada',
      clients: 0,
      experience: 0,
      bio: 'Helps clients rebuild habits with practical weekly plans.',
      tags: [],
      category: '',
    });
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('bio');
  });
});
