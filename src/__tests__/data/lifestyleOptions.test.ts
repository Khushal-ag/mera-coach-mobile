import {
  NONE_OF_THE_ABOVE,
  coerceNoneOfTheAboveValues,
  ensureNoneOfTheAboveAtBottom,
  resolveNoneOfTheAboveCode,
} from '../../data/lifestyleOptions';

describe('ensureNoneOfTheAboveAtBottom', () => {
  it('appends a synthetic none option when missing', () => {
    const result = ensureNoneOfTheAboveAtBottom([
      { code: 'LI1', label: 'Diabetes' },
      { code: 'LI2', label: 'Thyroid' },
    ]);
    expect(result).toEqual([
      { code: 'LI1', label: 'Diabetes' },
      { code: 'LI2', label: 'Thyroid' },
      { code: NONE_OF_THE_ABOVE.code, label: NONE_OF_THE_ABOVE.label },
    ]);
  });

  it('moves an existing none option from the top to the bottom', () => {
    const result = ensureNoneOfTheAboveAtBottom([
      { code: 'LI0', label: 'None of the below' },
      { code: 'LI1', label: 'Dairy' },
      { code: 'LI2', label: 'Nuts' },
    ]);
    expect(result.map(o => o.code)).toEqual(['LI1', 'LI2', 'LI0']);
    expect(result[result.length - 1].label).toBe('None of the above');
    expect(resolveNoneOfTheAboveCode(result)).toBe('LI0');
  });

  it('pins and normalizes a server "None of the above" label', () => {
    const result = ensureNoneOfTheAboveAtBottom([
      { code: 'LI0', label: 'None of the above' },
      { code: 'LI1', label: 'Eggs' },
    ]);
    expect(result).toEqual([
      { code: 'LI1', label: 'Eggs' },
      { code: 'LI0', label: 'None of the above' },
    ]);
  });

  it('keeps an already-last none option in place', () => {
    const options = [
      { code: 'LI1', label: 'Eggs' },
      { code: NONE_OF_THE_ABOVE.code, label: NONE_OF_THE_ABOVE.label },
    ];
    expect(ensureNoneOfTheAboveAtBottom(options)).toEqual(options);
  });
});

describe('coerceNoneOfTheAboveValues', () => {
  const options = ensureNoneOfTheAboveAtBottom([
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
