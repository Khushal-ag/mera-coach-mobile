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
 * Accepts `bMI` as well as `bmi`.
 */
export function resolveDisplayBmi(
  input?: {
    bmi?: number | null;
    bMI?: number | null;
    height?: number | string | null;
    weight?: number | string | null;
  } | null,
): number | null {
  if (!input) return null;
  const apiBmi = input.bmi ?? input.bMI;
  if (typeof apiBmi === 'number' && Number.isFinite(apiBmi) && apiBmi > 0) return apiBmi;
  return getBmi(input.height ?? '', input.weight ?? '');
}

export interface BmiMeasurementReading {
  assessmentDate?: string;
  height?: number;
  weight?: number;
  bmi?: number;
  bodyFatPct?: number;
  visceralFat?: number;
  skeletalMusclePct?: number;
  restingMetabolism?: number;
  bodyAge?: number;
}

const BODY_FAT_KEYS = ['bodyfatpct', 'bodyfatpercentage', 'bodyfatpercent', 'bodyfat'];
const VISCERAL_KEYS = ['visceralfat', 'visceralfatlevel', 'visceralfatindex'];
const MUSCLE_KEYS = [
  'skeletalmusclepct',
  'skeletalmusclepercentage',
  'skeletalmusclepercent',
  'skeletalmuscle',
];
const METABOLISM_KEYS = ['restingmetabolism', 'restingmetabolismkcal', 'bmr', 'rmr'];
const BODY_AGE_KEYS = ['bodyage', 'bodyageyears', 'bodyageyrs'];
const DATE_KEYS = ['assessmentdate', 'checkupdate', 'measuredon', 'date'];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function normalizeKey(key: string): string {
  return key.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function parseJsonContainer(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return undefined;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return undefined;
  }
}

function positiveMetric(value: unknown, depth = 0): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : undefined;
  }
  if (typeof value === 'string') {
    const match = value
      .trim()
      .replace(/,/g, '')
      .match(/-?\d+(?:\.\d+)?/);
    if (!match) return undefined;
    const n = Number(match[0]);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }
  if (depth >= 2 || !isPlainObject(value)) return undefined;
  for (const key of ['value', 'val', 'amount', 'pct', 'percentage', 'percent', 'reading']) {
    if (!(key in value)) continue;
    const n = positiveMetric(value[key], depth + 1);
    if (n != null) return n;
  }
  return undefined;
}

function labelToSlot(label: string): string | null {
  const key = normalizeKey(label);
  if (!key || key === 'age') return null;
  if (key === 'bmi') return 'bmi';
  if (key.includes('bodyfat') || key === 'fatpct' || key === 'fatpercentage') return 'bodyfat';
  if (key.includes('visceral')) return 'visceralfat';
  if (key.includes('skeletal') || key.includes('muscle')) return 'skeletalmuscle';
  if (key.includes('metabol') || key === 'bmr' || key === 'rmr') return 'restingmetabolism';
  if (key.includes('bodyage')) return 'bodyage';
  return null;
}

function labeledMetrics(items: unknown[]): Record<string, unknown> | undefined {
  const bag: Record<string, unknown> = {};
  let found = false;
  for (const item of items) {
    if (!isPlainObject(item)) continue;
    const label = item.name ?? item.label ?? item.key ?? item.metric ?? item.title;
    if (typeof label !== 'string') continue;
    const slot = labelToSlot(label);
    if (!slot || bag[slot] != null) continue;
    const metricValue =
      item.value ?? item.val ?? item.amount ?? item.pct ?? item.percentage ?? item.reading;
    if (metricValue == null) continue;
    bag[slot] = metricValue;
    found = true;
  }
  return found ? bag : undefined;
}

function measurementSources(root: Record<string, unknown>): Record<string, unknown>[] {
  const sources: Record<string, unknown>[] = [];
  const seen = new Set<unknown>();

  const visit = (value: unknown, depth: number) => {
    const parsed = typeof value === 'string' ? parseJsonContainer(value) : value;
    if (Array.isArray(parsed)) {
      const labeled = labeledMetrics(parsed);
      if (labeled) sources.push(labeled);
      if (depth >= 3) return;
      for (const item of parsed) visit(item, depth + 1);
      return;
    }
    if (!isPlainObject(parsed) || seen.has(parsed)) return;
    seen.add(parsed);
    sources.push(parsed);
    if (depth >= 3) return;
    for (const child of Object.values(parsed)) {
      if (child && (typeof child === 'object' || typeof child === 'string')) {
        visit(child, depth + 1);
      }
    }
  };

  visit(root, 0);
  return sources;
}

function indexSource(source: Record<string, unknown>): Map<string, unknown> {
  const map = new Map<string, unknown>();
  for (const [key, value] of Object.entries(source)) {
    const norm = normalizeKey(key);
    if (!map.has(norm)) map.set(norm, value);
  }
  return map;
}

function pickMetric(indexed: Map<string, unknown>[], keys: string[]): number | undefined {
  for (const index of indexed) {
    for (const key of keys) {
      const n = positiveMetric(index.get(key));
      if (n != null) return n;
    }
  }
  return undefined;
}

function pickDate(indexed: Map<string, unknown>[]): string | undefined {
  for (const index of indexed) {
    for (const key of DATE_KEYS) {
      const value = index.get(key);
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
  }
  return undefined;
}

export function readBodyMeasurement(raw: unknown): BmiMeasurementReading {
  if (!isPlainObject(raw)) return {};
  const indexed = measurementSources(raw).map(indexSource);
  const reading: BmiMeasurementReading = {};
  const assessmentDate = pickDate(indexed);
  const height = pickMetric(indexed, ['height']);
  const weight = pickMetric(indexed, ['weight']);
  const bmi = pickMetric(indexed, ['bmi']);
  const bodyFatPct = pickMetric(indexed, BODY_FAT_KEYS);
  const visceralFat = pickMetric(indexed, VISCERAL_KEYS);
  const skeletalMusclePct = pickMetric(indexed, MUSCLE_KEYS);
  const restingMetabolism = pickMetric(indexed, METABOLISM_KEYS);
  const bodyAge = pickMetric(indexed, BODY_AGE_KEYS);
  if (assessmentDate) reading.assessmentDate = assessmentDate;
  if (height != null) reading.height = height;
  if (weight != null) reading.weight = weight;
  if (bmi != null) reading.bmi = bmi;
  if (bodyFatPct != null) reading.bodyFatPct = bodyFatPct;
  if (visceralFat != null) reading.visceralFat = visceralFat;
  if (skeletalMusclePct != null) reading.skeletalMusclePct = skeletalMusclePct;
  if (restingMetabolism != null) reading.restingMetabolism = restingMetabolism;
  if (bodyAge != null) reading.bodyAge = bodyAge;
  return reading;
}

export interface HistoryMetricRow {
  label: string;
  value: string;
}

function formatHistoryDecimal(value: number): string {
  return value.toFixed(1);
}

function formatHistoryWhole(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

const HISTORY_EMPTY = '-';

function historyDecimal(value: number | undefined): string | null {
  if (value == null || !(value > 0)) return null;
  return formatHistoryDecimal(value);
}

function historyWhole(value: number | undefined): string | null {
  if (value == null || !(value > 0)) return null;
  return formatHistoryWhole(value);
}

export function historyMetricRows(raw: unknown): HistoryMetricRow[] {
  const reading = readBodyMeasurement(raw);
  const bmi = resolveDisplayBmi(reading);
  const bodyFat = historyDecimal(reading.bodyFatPct);
  const visceral = historyWhole(reading.visceralFat);
  const muscle = historyDecimal(reading.skeletalMusclePct);
  const metabolism = historyWhole(reading.restingMetabolism);
  const bodyAge = historyWhole(reading.bodyAge);
  return [
    {
      label: 'BMI',
      value: bmi != null && bmi > 0 ? formatHistoryDecimal(bmi) : HISTORY_EMPTY,
    },
    { label: 'Body Fat', value: bodyFat != null ? `${bodyFat}%` : HISTORY_EMPTY },
    { label: 'Visceral Fat', value: visceral ?? HISTORY_EMPTY },
    { label: 'Skeletal Muscle', value: muscle != null ? `${muscle}%` : HISTORY_EMPTY },
    {
      label: 'Resting Metabolism',
      value: metabolism != null ? `${metabolism} Kcal` : HISTORY_EMPTY,
    },
    { label: 'Body Age', value: bodyAge != null ? `${bodyAge} yrs` : HISTORY_EMPTY },
  ];
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

// Matches save-bmi metric formulas (same coefficients the API expects).
function computeBodyMetrics({ weight, height, age, gender }: BodyMetricsInput): BodyMetrics {
  const isMale = gender === 'M';
  const heightM = height / 100;

  const bmi = round1(weight / (heightM * heightM));
  const bmiCategory = getBmiCategory(bmi)?.label ?? '';

  const sexFactor = isMale ? 1.0 : 0.0;
  const bodyFatPct = clamp(round1(1.2 * bmi + 0.23 * age - 10.8 * sexFactor - 5.4), 3, 60);

  const visceralFat = Math.round(clamp(0.59 * bmi + 0.097 * age - (isMale ? 6.5 : 8.5), 1, 59));

  const lbm = isMale
    ? 0.3281 * weight + 0.3393 * height - 29.5336
    : 0.2994 * weight + 0.7058 * height - 14.6712;
  const skeletalMusclePct = clamp(round1(((lbm * 0.5) / weight) * 100), 20, 60);

  const restingMetabolism = Math.round(10 * weight + 6.25 * height - 5 * age + (isMale ? 5 : -161));

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
