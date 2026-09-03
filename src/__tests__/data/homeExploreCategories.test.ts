import { pickExploreCategories, exploreCategoryLabel } from '../../data/homeExploreCategories';
import { COACH_CATEGORIES } from '../../data/homeContent';

describe('pickExploreCategories', () => {
  it('returns six client categories even when API only has one match', () => {
    const picked = pickExploreCategories([
      { code: 'CT001', label: 'Gym Trainer', icon: 'barbell' },
    ]);
    expect(picked).toHaveLength(6);
    expect(picked.map(c => c.code)).toEqual(['CT002', 'CT001', 'CT007', 'CT004', 'CT008', 'CT003']);
  });

  it('uses explore display labels', () => {
    const cat = COACH_CATEGORIES.find(c => c.code === 'CT007');
    expect(cat).toBeDefined();
    expect(exploreCategoryLabel(cat!)).toBe('Yoga Coach');
  });
});
