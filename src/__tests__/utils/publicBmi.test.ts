import { BMI_GAUGE } from '../../constants/publicBmi';
import {
  calculatePublicBmi,
  gaugeAngle,
  gaugeArcPath,
  gaugePoint,
  publicBmiLabel,
  readHeightCm,
  type PublicBmiInput,
} from '../../utils/publicBmi';

const cmInput = (heightCm: string, weightKg: string): PublicBmiInput => ({
  unit: 'cm',
  heightCm,
  heightFt: '',
  heightIn: '',
  weightKg,
});

describe('publicBmiLabel', () => {
  it('uses the web thresholds and the "Healthy Weight" label', () => {
    expect(publicBmiLabel(18.4)).toBe('Underweight');
    expect(publicBmiLabel(18.5)).toBe('Healthy Weight');
    expect(publicBmiLabel(24.9)).toBe('Healthy Weight');
    expect(publicBmiLabel(25)).toBe('Overweight');
    expect(publicBmiLabel(29.9)).toBe('Overweight');
    expect(publicBmiLabel(30)).toBe('Obese');
  });
});

describe('readHeightCm', () => {
  it('reads centimetres within 100-250', () => {
    expect(readHeightCm(cmInput('165', ''))).toBe(165);
    expect(readHeightCm(cmInput('99', ''))).toBeNull();
    expect(readHeightCm(cmInput('251', ''))).toBeNull();
    expect(readHeightCm(cmInput('', ''))).toBeNull();
  });

  it('converts feet and inches', () => {
    const ftIn = (heightFt: string, heightIn: string): PublicBmiInput => ({
      unit: 'ft',
      heightCm: '',
      heightFt,
      heightIn,
      weightKg: '',
    });
    expect(readHeightCm(ftIn('5', '9'))).toBeCloseTo(175.26, 2);
    expect(readHeightCm(ftIn('6', ''))).toBeCloseTo(182.88, 2);
    expect(readHeightCm(ftIn('5', '12'))).toBeNull();
    expect(readHeightCm(ftIn('0', '5'))).toBeNull();
    expect(readHeightCm(ftIn('9', '0'))).toBeNull();
  });
});

describe('calculatePublicBmi', () => {
  it('returns the BMI to one decimal with its category and explanation', () => {
    const out = calculatePublicBmi(cmInput('170', '68'));
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.bmi).toBe('23.5');
    expect(out.result.label).toBe('Healthy Weight');
    expect(out.result.heightCm).toBe(170);
    expect(out.result.weightKg).toBe(68);
    expect(out.result.explanation).toContain('Your BMI of 23.5');
  });

  it('reports both problems with the web messages', () => {
    const out = calculatePublicBmi(cmInput('50', '10'));
    expect(out).toEqual({
      ok: false,
      errors: [
        'Please enter a valid height between 100 and 250 cm.',
        'Please enter a valid weight between 20 and 300 kg.',
      ],
    });
  });

  it('asks for feet and inches when that unit is chosen', () => {
    const out = calculatePublicBmi({
      unit: 'ft',
      heightCm: '',
      heightFt: '',
      heightIn: '',
      weightKg: '70',
    });
    expect(out).toEqual({
      ok: false,
      errors: ['Please enter a valid height (feet: 1–8, inches: 0–11).'],
    });
  });
});

describe('gauge geometry', () => {
  it('maps the BMI range onto the half circle and clamps outside it', () => {
    expect(gaugeAngle(BMI_GAUGE.min)).toBe(180);
    expect(gaugeAngle(BMI_GAUGE.max)).toBe(0);
    expect(gaugeAngle(28)).toBe(90);
    expect(gaugeAngle(10)).toBe(180);
    expect(gaugeAngle(60)).toBe(0);
  });

  it('places points on the dial', () => {
    const left = gaugePoint(180, BMI_GAUGE.r);
    expect(left.x).toBeCloseTo(BMI_GAUGE.cx - BMI_GAUGE.r, 6);
    expect(left.y).toBeCloseTo(BMI_GAUGE.cy, 6);
    const top = gaugePoint(90, BMI_GAUGE.r);
    expect(top.x).toBeCloseTo(BMI_GAUGE.cx, 6);
    expect(top.y).toBeCloseTo(BMI_GAUGE.cy - BMI_GAUGE.r, 6);
  });

  it('builds an arc path for a band', () => {
    expect(gaugeArcPath(18.5, 25)).toMatch(/^M [\d.]+ [\d.]+ A 108 108 0 0 1 [\d.]+ [\d.]+$/);
  });
});
