/**
 * Public BMI screen: gauge geometry, bands and the explanation per category.
 * Mirrors the web home BMI section (mera-coach-web `constants/bmi.ts`), which labels the
 * normal range "Healthy Weight". The clinical-report BMI in `utils/bmi` keeps "Normal".
 */

export const BMI_GAUGE = {
  cx: 160,
  cy: 150,
  r: 108,
  stroke: 22,
  min: 16,
  max: 40,
} as const;

export const BMI_BANDS = [
  { from: 16, to: 18.5, color: '#3b82f6' },
  { from: 18.5, to: 25, color: '#22c55e' },
  { from: 25, to: 30, color: '#f59e0b' },
  { from: 30, to: 40, color: '#ef4444' },
] as const;

export const BMI_TICKS = [16, 18.5, 25, 30, 40] as const;

export type PublicBmiLabel = 'Underweight' | 'Healthy Weight' | 'Overweight' | 'Obese';

export const BMI_LEGEND: { label: string; color: string }[] = [
  { label: 'Underweight', color: '#3b82f6' },
  { label: 'Healthy', color: '#22c55e' },
  { label: 'Overweight', color: '#f59e0b' },
  { label: 'Obese', color: '#ef4444' },
];

export const BMI_EXPLANATIONS: Record<PublicBmiLabel, (bmi: string) => string> = {
  Underweight: bmi =>
    `Your BMI of ${bmi} is below the healthy range. This may indicate insufficient nutrition or low muscle mass. A certified nutrition or fitness coach can help you build a healthier body weight safely.`,
  'Healthy Weight': bmi =>
    `Great news! Your BMI of ${bmi} is within the healthy range. A wellness or yoga coach can help you maintain this long-term and optimise your energy and fitness.`,
  Overweight: bmi =>
    `Your BMI of ${bmi} is above the healthy range. Even modest weight loss of 5–10% can significantly reduce health risks. A weight management or lifestyle coach can create a practical, sustainable plan for you.`,
  Obese: bmi =>
    `Your BMI of ${bmi} indicates obesity, which carries significant health risks. A certified weight management or nutrition coach with a structured plan can make a real, life-changing difference.`,
};

/** Input limits, same as the web form. */
export const BMI_LIMITS = {
  heightCm: { min: 100, max: 250 },
  heightFt: { min: 1, max: 8 },
  heightIn: { min: 0, max: 11 },
  weightKg: { min: 20, max: 300 },
} as const;
