import {
  createEmptyPackage,
  parseCoachPackages,
  serializeCoachPackages,
  coachPackageAmountError,
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

  it('parses and serializes optional imageUrl', () => {
    const parsed = parseCoachPackages([
      { name: 'Plan', imageUrl: '/document/CH1/pkg.jpg' },
      { name: 'Alt', image: '/document/CH1/alt.jpg' },
    ]);
    expect(parsed).toEqual([
      expect.objectContaining({ name: 'Plan', imageUrl: '/document/CH1/pkg.jpg' }),
      expect.objectContaining({ name: 'Alt', imageUrl: '/document/CH1/alt.jpg' }),
    ]);
    expect(
      serializeCoachPackages([
        { ...createEmptyPackage(), name: 'Plan', imageUrl: '/document/CH1/pkg.jpg' },
        { ...createEmptyPackage(), name: 'No image', imageUrl: '  ' },
      ]),
    ).toEqual([
      expect.objectContaining({ name: 'Plan', imageUrl: '/document/CH1/pkg.jpg' }),
      expect.objectContaining({ name: 'No image' }),
    ]);
    expect(
      serializeCoachPackages([{ ...createEmptyPackage(), name: 'No image', imageUrl: '  ' }])[0],
    ).not.toHaveProperty('imageUrl');
  });

  it('serializes named packages and caps count', () => {
    const many = Array.from({ length: MAX_COACH_PACKAGES + 2 }, (_, i) => ({
      ...createEmptyPackage(),
      name: `P${i}`,
    }));
    expect(serializeCoachPackages(many)).toHaveLength(MAX_COACH_PACKAGES);
    expect(serializeCoachPackages([{ ...createEmptyPackage(), name: '  ' }])).toEqual([]);
  });

  it('allows a blank amount and rejects text that is not a number', () => {
    expect(coachPackageAmountError('')).toBeNull();
    expect(coachPackageAmountError('Rs 1500')).toBeNull();
    expect(coachPackageAmountError('free')).toMatch(/valid amount/);
  });

  it('flags incomplete package drafts', () => {
    expect(validateCoachPackagesDraft([{ ...createEmptyPackage(), price: '₹5000' }])).toMatch(
      /needs a name/,
    );
    expect(
      validateCoachPackagesDraft([{ ...createEmptyPackage(), imageUrl: '/document/CH1/pkg.jpg' }]),
    ).toMatch(/needs a name/);
    expect(validateCoachPackagesDraft([{ ...createEmptyPackage(), name: 'Plan A' }])).toBeNull();
  });
});
