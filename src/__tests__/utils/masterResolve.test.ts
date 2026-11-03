import {
  resolveMasterCode,
  resolveMasterCodes,
  resolveMasterLabel,
  resolveMasterLabels,
  type MasterOption,
} from '../../utils/masterResolve';

const OPTIONS: MasterOption[] = [
  { code: 'LI0001', label: 'Vegetarian' },
  { code: 'LI0031', label: 'Weight Loss' },
  { code: 'LI0011', label: 'Sedentary (little or no exercise)' },
];

describe('resolveMasterLabel', () => {
  it('resolves itemCode to itemName', () => {
    expect(resolveMasterLabel('LI0001', OPTIONS)).toBe('Vegetarian');
  });

  it('passes through an already-human label', () => {
    expect(resolveMasterLabel('Vegetarian', OPTIONS)).toBe('Vegetarian');
  });

  it('returns unknown values unchanged', () => {
    expect(resolveMasterLabel('Custom', OPTIONS)).toBe('Custom');
  });

  it('hides unresolved item codes until options load', () => {
    expect(resolveMasterLabel('PC0007', OPTIONS)).toBe('');
  });

  it('maps NONE_OF_THE_BELOW wire code to label', () => {
    expect(resolveMasterLabel('NONE_OF_THE_BELOW', OPTIONS)).toBe('None of the below');
    expect(resolveMasterLabel('none_of_the_below', OPTIONS)).toBe('None of the below');
  });
});

describe('resolveMasterLabels', () => {
  it('joins comma-separated codes and wire tokens', () => {
    expect(resolveMasterLabels('NONE_OF_THE_BELOW, LI0001', OPTIONS)).toBe(
      'None of the below, Vegetarian',
    );
  });
});

describe('resolveMasterCode', () => {
  it('keeps an itemCode as-is', () => {
    expect(resolveMasterCode('LI0031', OPTIONS)).toBe('LI0031');
  });

  it('maps a legacy label to itemCode', () => {
    expect(resolveMasterCode('Weight Loss', OPTIONS)).toBe('LI0031');
  });

  it('returns unknown values unchanged', () => {
    expect(resolveMasterCode('Custom', OPTIONS)).toBe('Custom');
  });
});

describe('resolveMasterCodes', () => {
  it('maps a mixed list of codes and labels', () => {
    expect(resolveMasterCodes(['LI0001', 'Weight Loss'], OPTIONS)).toEqual(['LI0001', 'LI0031']);
  });
});
