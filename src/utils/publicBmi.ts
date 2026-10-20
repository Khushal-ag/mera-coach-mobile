import {
  BMI_EXPLANATIONS,
  BMI_GAUGE,
  BMI_LIMITS,
  type PublicBmiLabel,
} from '../constants/publicBmi';

export type HeightUnit = 'cm' | 'ft';

export interface PublicBmiInput {
  unit: HeightUnit;
  heightCm: string;
  heightFt: string;
  heightIn: string;
  weightKg: string;
}

export interface PublicBmiResult {
  /** BMI to one decimal, as shown to the visitor. */
  bmi: string;
  label: PublicBmiLabel;
  color: string;
  explanation: string;
  heightCm: number;
  weightKg: number;
}

type CalculateOutcome = { ok: true; result: PublicBmiResult } | { ok: false; errors: string[] };

const CATEGORY_COLOR: Record<PublicBmiLabel, string> = {
  Underweight: '#3b82f6',
  'Healthy Weight': '#22c55e',
  Overweight: '#f59e0b',
  Obese: '#ef4444',
};

export function publicBmiLabel(bmi: number): PublicBmiLabel {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Healthy Weight';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

/** Height in cm from the cm field, or from feet and inches. Null when out of range. */
export function readHeightCm(input: PublicBmiInput): number | null {
  const { heightCm, heightFt, heightIn } = BMI_LIMITS;
  if (input.unit === 'cm') {
    const cm = Number.parseFloat(input.heightCm);
    return cm && cm >= heightCm.min && cm <= heightCm.max ? cm : null;
  }
  const ft = Number.parseFloat(input.heightFt);
  const inches = Number.parseFloat(input.heightIn) || 0;
  if (!ft || ft < heightFt.min || ft > heightFt.max) return null;
  if (inches < heightIn.min || inches > heightIn.max) return null;
  return (ft * 12 + inches) * 2.54;
}

/** Validates the form and computes the BMI. Messages match the web calculator. */
export function calculatePublicBmi(input: PublicBmiInput): CalculateOutcome {
  const errors: string[] = [];
  const cm = readHeightCm(input);
  if (cm == null) {
    errors.push(
      input.unit === 'cm'
        ? 'Please enter a valid height between 100 and 250 cm.'
        : 'Please enter a valid height (feet: 1–8, inches: 0–11).',
    );
  }
  const kg = Number.parseFloat(input.weightKg);
  const { weightKg } = BMI_LIMITS;
  const kgOk = !!kg && kg >= weightKg.min && kg <= weightKg.max;
  if (!kgOk) errors.push('Please enter a valid weight between 20 and 300 kg.');
  if (cm == null || !kgOk) return { ok: false, errors };

  const bmi = (kg / (cm / 100) ** 2).toFixed(1);
  const label = publicBmiLabel(Number.parseFloat(bmi));
  return {
    ok: true,
    result: {
      bmi,
      label,
      color: CATEGORY_COLOR[label],
      explanation: BMI_EXPLANATIONS[label](bmi),
      heightCm: cm,
      weightKg: kg,
    },
  };
}

/** Standard angle in degrees on the dial: 180 at the left end, 0 at the right end. */
export function gaugeAngle(bmi: number): number {
  const { min, max } = BMI_GAUGE;
  const clamped = Math.max(min, Math.min(max, bmi));
  return 180 - ((clamped - min) / (max - min)) * 180;
}

export function gaugePoint(angle: number, radius: number): { x: number; y: number } {
  const rad = (angle * Math.PI) / 180;
  return { x: BMI_GAUGE.cx + radius * Math.cos(rad), y: BMI_GAUGE.cy - radius * Math.sin(rad) };
}

/** SVG path for one coloured band of the dial, with a small gap between bands. */
export function gaugeArcPath(from: number, to: number, gap = 0.9): string {
  const a = gaugePoint(gaugeAngle(from) - gap, BMI_GAUGE.r);
  const b = gaugePoint(gaugeAngle(to) + gap, BMI_GAUGE.r);
  return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} A ${BMI_GAUGE.r} ${BMI_GAUGE.r} 0 0 1 ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}
