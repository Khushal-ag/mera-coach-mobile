import {
  createEmptyPackage,
  parseCoachPackages,
  serializeCoachPackages,
  validateCoachPackagesDraft,
  MAX_COACH_PACKAGES,
} from '../../utils/coachPackages';

describe('coachPackages', () => {
  it('parses array and JSON string payloads', () => {
    expect(parseCoachPackages([{ name: '12-week plan', price: '₹5k' }])).toEqual([
      expect.objectContaining({ name: '12-week plan', price: '₹5k' }),
    ]);
    expect(
      parseCoachPackages(JSON.stringify([{ title: 'Bootcamp', duration: '4 weeks' }])),
    ).toEqual([expect.objectContaining({ name: 'Bootcamp', duration: '4 weeks' })]);
  });

  it('serializes named packages and caps count', () => {
    const many = Array.from({ length: MAX_COACH_PACKAGES + 2 }, (_, i) => ({
      ...createEmptyPackage(),
      name: `P${i}`,
    }));
    expect(serializeCoachPackages(many)).toHaveLength(MAX_COACH_PACKAGES);
    expect(serializeCoachPackages([{ ...createEmptyPackage(), name: '  ' }])).toEqual([]);
  });

  it('flags incomplete package drafts', () => {
    expect(validateCoachPackagesDraft([{ ...createEmptyPackage(), price: '₹5000' }])).toMatch(
      /needs a name/,
    );
    expect(validateCoachPackagesDraft([{ ...createEmptyPackage(), name: 'Plan A' }])).toBeNull();
  });
});
