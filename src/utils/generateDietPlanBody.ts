import type { GenerateDietPlanParams } from '../api/masterApi';
import { describeDietItems } from '../data/mealSlotLabels';
import type { ClientProfile } from '../types/models';

/** Web AddClient default when coach country session is missing. */
const DEFAULT_COUNTRY_CD = 'IN';

function asInt(value: string | number | undefined | null): number {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.round(value) : 0;
  const n = parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) ? n : 0;
}

function asFloat(value: string | number | undefined | null): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const n = parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? n : 0;
}

function asText(value: string | undefined | null): string {
  return (value ?? '').trim();
}

function joinCodes(values: string[] | undefined | null): string {
  return (values ?? [])
    .map(v => v.trim())
    .filter(Boolean)
    .join(', ');
}

/** Matches meracoachapp AddClient.generateDietPlan() field encoding. */
export function buildGenerateDietPlanBody(
  form: ClientProfile,
  options: { countryCd?: string; cuisineLabel: string },
): GenerateDietPlanParams {
  const em = describeDietItems(form.diet, 'earlyMorning');
  const bf = describeDietItems(form.diet, 'breakfast');
  const mm = describeDietItems(form.diet, 'midMorningSnack');
  const ln = describeDietItems(form.diet, 'lunch');
  const ev = describeDietItems(form.diet, 'eveningSnack');
  const dn = describeDietItems(form.diet, 'dinner');

  return {
    clientName: asText(form.name),
    gender: asText(form.gender),
    age: asInt(form.age),
    weight: asFloat(form.weight),
    height: asInt(form.height),
    country: asText(options.countryCd) || DEFAULT_COUNTRY_CD,
    foodType: asText(form.foodPreference),
    cuisine: asText(options.cuisineLabel),
    activity: asText(form.physicalActivity),
    workType: asText(form.workType),
    sleep: asText(form.sleepDuration),
    pregnancy: asText(form.pregnancyBf),
    medical: joinCodes(form.medicalConditions),
    allergies: joinCodes(form.foodAllergies),
    goal: asText(form.primaryGoal),
    timeline: asText(form.targetTimeline),
    notes: asText(form.notes),
    curEM: em.text,
    curEMCal: asInt(em.cal),
    curBreakfast: bf.text,
    curBreakfastCal: asInt(bf.cal),
    curMidMorning: mm.text,
    curMidMorningCal: asInt(mm.cal),
    curLunch: ln.text,
    curLunchCal: asInt(ln.cal),
    curEvening: ev.text,
    curEveningCal: asInt(ev.cal),
    curDinner: dn.text,
    curDinnerCal: asInt(dn.cal),
  };
}
