import {
  NONE_OF_THE_ABOVE,
  coerceNoneOfTheAboveValues,
  ensureNoneOfTheAboveFirst,
  resolveNoneOfTheAboveCode,
} from '../../data/lifestyleOptions';

describe('ensureNoneOfTheAboveFirst', () => {
  it('adds a synthetic none option at the top when missing', () => {
    const result = ensureNoneOfTheAboveFirst([
      { code: 'LI1', label: 'Diabetes' },
      { code: 'LI2', label: 'Thyroid' },
    ]);
    expect(result).toEqual([
      { code: NONE_OF_THE_ABOVE.code, label: NONE_OF_THE_ABOVE.label },
      { code: 'LI1', label: 'Diabetes' },
      { code: 'LI2', label: 'Thyroid' },
    ]);
  });

  it('moves an existing none option from the bottom to the top', () => {
    const result = ensureNoneOfTheAboveFirst([
      { code: 'LI1', label: 'Dairy' },
      { code: 'LI2', label: 'Nuts' },
      { code: 'LI0', label: 'None of the below' },
    ]);
    expect(result.map(o => o.code)).toEqual(['LI0', 'LI1', 'LI2']);
    expect(result[0].label).toBe('None of the above');
    expect(resolveNoneOfTheAboveCode(result)).toBe('LI0');
  });

  it('pins and normalizes a server "None of the above" label', () => {
    const result = ensureNoneOfTheAboveFirst([
      { code: 'LI1', label: 'Eggs' },
      { code: 'LI0', label: 'None of the below' },
    ]);
    expect(result).toEqual([
      { code: 'LI0', label: 'None of the above' },
      { code: 'LI1', label: 'Eggs' },
    ]);
  });

  it('keeps an already-first none option in place', () => {
    const options = [
      { code: NONE_OF_THE_ABOVE.code, label: NONE_OF_THE_ABOVE.label },
      { code: 'LI1', label: 'Eggs' },
    ];
    expect(ensureNoneOfTheAboveFirst(options)).toEqual(options);
  });
});

describe('coerceNoneOfTheAboveValues', () => {
  const options = ensureNoneOfTheAboveFirst([
    { code: 'LI1', label: 'Dairy' },
    { code: 'LI0', label: 'None of the below' },
  ]);

  it('maps legacy "None of the below" labels onto the live none code', () => {
    expect(coerceNoneOfTheAboveValues(['None of the below'], options)).toEqual(['LI0']);
  });

  it('maps the synthetic none code onto the live none code', () => {
    expect(coerceNoneOfTheAboveValues([NONE_OF_THE_ABOVE.code], options)).toEqual(['LI0']);
  });

  it('leaves other selections unchanged', () => {
    expect(coerceNoneOfTheAboveValues(['LI1'], options)).toEqual(['LI1']);
  });
});
