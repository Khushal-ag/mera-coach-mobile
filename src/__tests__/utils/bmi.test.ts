import { getBmi, getBmiCategory, resolveDisplayBmi } from '../../utils/bmi';

describe('resolveDisplayBmi', () => {
  it('prefers a positive API BMI', () => {
    expect(resolveDisplayBmi({ bmi: 24.5, height: 162, weight: 58 })).toBe(24.5);
  });

  it('reads bMI alias when bmi is absent', () => {
    expect(resolveDisplayBmi({ bMI: 24.5, height: 162, weight: 58 })).toBe(24.5);
  });

  it('computes from height/weight when API BMI is 0 (bmi-report empty save)', () => {
    const bmi = resolveDisplayBmi({ bmi: 0, height: 162, weight: 58 });
    expect(bmi).not.toBeNull();
    expect(bmi!.toFixed(1)).toBe('22.1');
    expect(getBmiCategory(bmi)?.label).toBe('Normal');
  });

  it('computes when API BMI is missing', () => {
    expect(resolveDisplayBmi({ height: 170, weight: 70 })).toBeCloseTo(getBmi(170, 70)!, 5);
  });

  it('returns null when neither API BMI nor height/weight are usable', () => {
    expect(resolveDisplayBmi({ bmi: 0 })).toBeNull();
    expect(resolveDisplayBmi({ bmi: null, height: 0, weight: 58 })).toBeNull();
    expect(resolveDisplayBmi(null)).toBeNull();
    expect(resolveDisplayBmi(undefined)).toBeNull();
  });

  it('ignores non-finite API BMI and falls back', () => {
    const bmi = resolveDisplayBmi({ bmi: NaN, height: 162, weight: 58 });
    expect(bmi!.toFixed(1)).toBe('22.1');
  });
});
