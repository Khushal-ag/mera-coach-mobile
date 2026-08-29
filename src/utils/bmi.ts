import { Colors } from '../constants/theme';
import type { BmiCategory } from '../types/models';
import { ageFromDate, parseDob } from './validation';

export function getBmi(height: string | number, weight: string | number): number | null {
  const h = parseFloat(String(height));
  const w = parseFloat(String(weight));
  if (!h || !w) return null;
  return w / (h / 100) ** 2;
}

export function getBmiCategory(bmi: number | null): BmiCategory | null {
  if (bmi == null) return null;
  if (bmi < 18.5) return { label: 'Underweight', color: Colors.accent, bg: Colors.accentLight };
  if (bmi < 25) return { label: 'Normal', color: Colors.secondary, bg: Colors.secondaryLight };
  if (bmi < 30) return { label: 'Overweight', color: Colors.accent, bg: Colors.accentLight };
  return { label: 'Obese', color: Colors.primary, bg: Colors.primaryLight };
}

/**
 * Prefer a positive API BMI; otherwise compute from height/weight.
 * Treats 0 as absent — bmi-report often returns height/weight with bmi: 0 when
 * save-bmi was skipped (Client Detail still shows a local BMI).
 */
export function resolveDisplayBmi(
  input?: {
    bmi?: number | null;
    height?: number | string | null;
    weight?: number | string | null;
  } | null,
): number | null {
  if (!input) return null;
  const apiBmi = input.bmi;
  if (typeof apiBmi === 'number' && Number.isFinite(apiBmi) && apiBmi > 0) return apiBmi;
  return getBmi(input.height ?? '', input.weight ?? '');
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export interface BodyMetrics {
  bmi: number;
  bmiCategory: string;
  bodyFatPct: number;
  visceralFat: number;
  skeletalMusclePct: number;
  restingMetabolism: number;
  bodyAge: number;
}

interface BodyMetricsInput {
  weight: number;
  height: number;
  age: number;
  gender: string;
}

// Matches the backend save-bmi metric formulas (same coefficients the API expects).
function computeBodyMetrics({ weight, height, age, gender }: BodyMetricsInput): BodyMetrics {
  const isMale = gender === 'M';
  const heightM = height / 100;

  const bmi = round1(weight / (heightM * heightM));
  const bmiCategory = getBmiCategory(bmi)?.label ?? '';

  // Body Fat % — Deurenberg 1991
  const sexFactor = isMale ? 1.0 : 0.0;
  const bodyFatPct = clamp(round1(1.2 * bmi + 0.23 * age - 10.8 * sexFactor - 5.4), 3, 60);

  // Visceral Fat (1–59 scale)
  const visceralFat = Math.round(clamp(0.59 * bmi + 0.097 * age - (isMale ? 6.5 : 8.5), 1, 59));

  // Skeletal Muscle % — Hume LBM
  const lbm = isMale
    ? 0.3281 * weight + 0.3393 * height - 29.5336
    : 0.2994 * weight + 0.7058 * height - 14.6712;
  const skeletalMusclePct = clamp(round1(((lbm * 0.5) / weight) * 100), 20, 60);

  // Resting Metabolism (BMR) — Mifflin-St Jeor
  const restingMetabolism = Math.round(10 * weight + 6.25 * height - 5 * age + (isMale ? 5 : -161));

  // Body Age
  const idealFat = isMale
    ? age < 30
      ? 15
      : age < 40
        ? 17
        : age < 50
          ? 20
          : 22
    : age < 30
      ? 22
      : age < 40
        ? 24
        : age < 50
          ? 27
          : 30;
  const bodyAge = Math.round(clamp(age + (bodyFatPct - idealFat) * 0.5, 5, 80));

  return {
    bmi,
    bmiCategory,
    bodyFatPct,
    visceralFat,
    skeletalMusclePct,
    restingMetabolism,
    bodyAge,
  };
}

interface ProfileLike {
  weight: string;
  height: string;
  age: string;
  dob?: string;
  gender: string;
}

function resolveProfileAge(profile: ProfileLike): number {
  const fromField = parseInt(profile.age, 10);
  if (Number.isFinite(fromField) && fromField > 0) return fromField;
  if (!profile.dob?.trim()) return 0;
  const dob = parseDob(profile.dob);
  return dob ? ageFromDate(dob) : 0;
}

/** Null until weight, height, age (or DOB), and gender are present — matches web renderBmi(). */
export function computeBmiMetrics(profile: ProfileLike): BodyMetrics | null {
  const weight = parseFloat(profile.weight);
  const height = parseInt(profile.height, 10);
  const age = resolveProfileAge(profile);
  if (!weight || !height || !age || !profile.gender) return null;
  return computeBodyMetrics({ weight, height, age, gender: profile.gender });
}
