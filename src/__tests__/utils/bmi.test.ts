import {
  getBmi,
  getBmiCategory,
  historyMetricRows,
  readBodyMeasurement,
  resolveDisplayBmi,
} from '../../utils/bmi';

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

describe('readBodyMeasurement', () => {
  it('maps history aliases, numeric strings, and nested metric objects', () => {
    expect(
      readBodyMeasurement({
        assessmentDate: '20/08/2026',
        bMI: 18.5,
        metrics: {
          bodyFat: '8.8%',
          visceralFat: 6,
          skeletalMuscle: 42.4,
          restingMetabolism: '1370 Kcal',
          bodyAge: 9,
        },
      }),
    ).toEqual({
      assessmentDate: '20/08/2026',
      bmi: 18.5,
      bodyFatPct: 8.8,
      visceralFat: 6,
      skeletalMusclePct: 42.4,
      restingMetabolism: 1370,
      bodyAge: 9,
    });
  });

  it('prefers canonical fields and drops zero or missing metrics', () => {
    expect(
      readBodyMeasurement({
        bodyFatPct: 21.2,
        bodyFat: 99,
        visceralFat: 0,
        skeletalMusclePct: 40,
        BodyComposition: {
          RestingMetabolism: 1400,
        },
      }),
    ).toEqual({
      bodyFatPct: 21.2,
      skeletalMusclePct: 40,
      restingMetabolism: 1400,
    });
  });

  it('does not invent composition from height and weight', () => {
    const reading = readBodyMeasurement({
      height: '162',
      weight: 58,
      measurements: [{ name: 'Body Fat', value: 19.4 }],
    });
    expect(reading.height).toBe(162);
    expect(reading.weight).toBe(58);
    expect(reading.bmi).toBeUndefined();
    expect(reading.bodyFatPct).toBe(19.4);
    expect(reading.visceralFat).toBeUndefined();
    expect(reading.skeletalMusclePct).toBeUndefined();
    expect(reading.restingMetabolism).toBeUndefined();
    expect(reading.bodyAge).toBeUndefined();
  });
});

describe('historyMetricRows', () => {
  it('renders all six labels from a bmi-report history item', () => {
    const rows = historyMetricRows({
      assessmentDate: '29/08/2026',
      height: 162,
      weight: 58,
      bmi: 22.1,
      bodyFatPct: 8.8,
      visceralFat: 6,
      skeletalMusclePct: 42.4,
      restingMetabolism: 1370,
      bodyAge: 9,
    });
    expect(rows.map(row => row.label)).toEqual([
      'BMI',
      'Body Fat',
      'Visceral Fat',
      'Skeletal Muscle',
      'Resting Metabolism',
      'Body Age',
    ]);
    expect(rows.map(row => row.value)).toEqual([
      '22.1',
      '8.8%',
      '6',
      '42.4%',
      '1370 Kcal',
      '9 yrs',
    ]);
  });

  it('renders the same six labels from PascalCase BmiReportRow names', () => {
    const rows = historyMetricRows({
      AssessmentDate: '29/08/2026',
      Height: 162,
      Weight: 58,
      BMI: 22.1,
      BodyFatPct: 8.8,
      VisceralFat: 6,
      SkeletalMusclePct: 42.4,
      RestingMetabolism: 1370,
      BodyAge: 9,
    });
    expect(rows.map(row => row.label)).toEqual([
      'BMI',
      'Body Fat',
      'Visceral Fat',
      'Skeletal Muscle',
      'Resting Metabolism',
      'Body Age',
    ]);
  });

  it('renders all six labels when only BMI is present and the other fields are zero', () => {
    const rows = historyMetricRows({
      assessmentDate: '29/08/2026',
      height: 162,
      weight: 58,
      bmi: 0,
      bodyFatPct: 0,
      visceralFat: 0,
      skeletalMusclePct: 0,
      restingMetabolism: 0,
      bodyAge: 0,
    });
    expect(rows.map(row => row.label)).toEqual([
      'BMI',
      'Body Fat',
      'Visceral Fat',
      'Skeletal Muscle',
      'Resting Metabolism',
      'Body Age',
    ]);
    expect(rows.map(row => row.value)).toEqual(['22.1', '-', '-', '-', '-', '-']);
  });
});
