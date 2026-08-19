import { Colors } from '../constants/theme';
import type { BmiCategory } from '../types/models';

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
