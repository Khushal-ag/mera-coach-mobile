import {
  NONE_OPTION,
  coerceNoneValues,
  ensureNoneFirst,
  resolveNoneCode,
} from '../../data/lifestyleOptions';

describe('ensureNoneFirst', () => {
  it('adds a synthetic none option at the top when missing', () => {
    const result = ensureNoneFirst([
      { code: 'LI1', label: 'Diabetes' },
      { code: 'LI2', label: 'Thyroid' },
    ]);
    expect(result).toEqual([
      { code: NONE_OPTION.code, label: NONE_OPTION.label },
      { code: 'LI1', label: 'Diabetes' },
      { code: 'LI2', label: 'Thyroid' },
    ]);
  });

  it('moves an existing none option from the bottom to the top', () => {
    const result = ensureNoneFirst([
      { code: 'LI1', label: 'Dairy' },
      { code: 'LI2', label: 'Nuts' },
      { code: 'LI0', label: 'None of the above' },
    ]);
    expect(result.map(o => o.code)).toEqual(['LI0', 'LI1', 'LI2']);
    expect(result[0].label).toBe('None of the below');
    expect(resolveNoneCode(result)).toBe('LI0');
  });

  it('pins a server "None of the above" option and renames it to "None of the below"', () => {
    const result = ensureNoneFirst([
      { code: 'LI1', label: 'Eggs' },
      { code: 'LI0', label: 'None of the above' },
    ]);
    expect(result).toEqual([
      { code: 'LI0', label: 'None of the below' },
      { code: 'LI1', label: 'Eggs' },
    ]);
  });

  it('keeps an already-first none option in place', () => {
    const options = [
      { code: NONE_OPTION.code, label: NONE_OPTION.label },
      { code: 'LI1', label: 'Eggs' },
    ];
    expect(ensureNoneFirst(options)).toEqual(options);
  });
});

describe('coerceNoneValues', () => {
  const options = ensureNoneFirst([
    { code: 'LI1', label: 'Dairy' },
    { code: 'LI0', label: 'None of the above' },
  ]);

  it('maps legacy "None of the above" labels onto the live none code', () => {
    expect(coerceNoneValues(['None of the above'], options)).toEqual(['LI0']);
  });

  it('maps the synthetic none code onto the live none code', () => {
    expect(coerceNoneValues([NONE_OPTION.code], options)).toEqual(['LI0']);
  });

  it('leaves other selections unchanged', () => {
    expect(coerceNoneValues(['LI1'], options)).toEqual(['LI1']);
  });
});
