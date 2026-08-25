import { useEffect } from 'react';
import { resolveMasterCode, resolveMasterCodes, type MasterOption } from '../api/masterApi';
import { useParamMasterOptions } from './useParamOptions';
import {
  PARAM_CODES,
  FOOD_PREFERENCES,
  REGIONAL_CUISINES,
  PHYSICAL_ACTIVITY_LEVELS,
  WORK_TYPES,
  SLEEP_DURATIONS,
  PREGNANCY_BF_OPTIONS,
  PRIMARY_GOALS,
  TARGET_TIMELINES,
  MEDICAL_CONDITIONS,
  FOOD_ALLERGIES,
} from '../data/lifestyleOptions';
import type { ClientProfile } from '../types/models';

type ScalarParamKey =
  | 'physicalActivity'
  | 'workType'
  | 'sleepDuration'
  | 'pregnancyBf'
  | 'foodPreference'
  | 'regionalCuisine'
  | 'primaryGoal'
  | 'targetTimeline';

type ListParamKey = 'medicalConditions' | 'foodAllergies';

export interface ParamMasterBundle {
  activityOptions: MasterOption[];
  workTypeOptions: MasterOption[];
  sleepOptions: MasterOption[];
  pregnancyOptions: MasterOption[];
  foodPrefOptions: MasterOption[];
  cuisineOptions: MasterOption[];
  goalOptions: MasterOption[];
  timelineOptions: MasterOption[];
  medicalOptions: MasterOption[];
  allergyOptions: MasterOption[];
}

export function useParamMasterBundle(): ParamMasterBundle {
  return {
    activityOptions: useParamMasterOptions(PARAM_CODES.physicalActivity, PHYSICAL_ACTIVITY_LEVELS),
    workTypeOptions: useParamMasterOptions(PARAM_CODES.workType, WORK_TYPES),
    sleepOptions: useParamMasterOptions(PARAM_CODES.sleepDuration, SLEEP_DURATIONS),
    pregnancyOptions: useParamMasterOptions(PARAM_CODES.pregnancy, PREGNANCY_BF_OPTIONS),
    foodPrefOptions: useParamMasterOptions(PARAM_CODES.foodPreference, FOOD_PREFERENCES),
    cuisineOptions: useParamMasterOptions(PARAM_CODES.regionalCuisine, REGIONAL_CUISINES),
    goalOptions: useParamMasterOptions(PARAM_CODES.primaryGoal, PRIMARY_GOALS),
    timelineOptions: useParamMasterOptions(PARAM_CODES.targetTimeline, TARGET_TIMELINES),
    medicalOptions: useParamMasterOptions(PARAM_CODES.medicalConditions, MEDICAL_CONDITIONS),
    allergyOptions: useParamMasterOptions(PARAM_CODES.foodAllergies, FOOD_ALLERGIES),
  };
}

/**
 * Loads all PARAMLIST vocabularies and rewrites legacy label values in form state to
 * itemCodes so save-lifestyle writes LI00xx (matching web). Returns the option bundle
 * for dropdowns. Safe to call from any lifestyle-phase screen.
 */
export function useNormalizeAllParamFormValues(
  form: ClientProfile,
  update: <K extends keyof ClientProfile>(key: K, val: ClientProfile[K]) => void,
): ParamMasterBundle {
  const bundle = useParamMasterBundle();

  const scalarFields: Record<ScalarParamKey, MasterOption[]> = {
    physicalActivity: bundle.activityOptions,
    workType: bundle.workTypeOptions,
    sleepDuration: bundle.sleepOptions,
    pregnancyBf: bundle.pregnancyOptions,
    foodPreference: bundle.foodPrefOptions,
    regionalCuisine: bundle.cuisineOptions,
    primaryGoal: bundle.goalOptions,
    targetTimeline: bundle.timelineOptions,
  };

  const listFields: Record<ListParamKey, MasterOption[]> = {
    medicalConditions: bundle.medicalOptions,
    foodAllergies: bundle.allergyOptions,
  };

  useEffect(() => {
    (Object.entries(scalarFields) as [ScalarParamKey, MasterOption[]][]).forEach(
      ([key, options]) => {
        if (!options.length) return;
        const current = form[key];
        if (!current) return;
        const code = resolveMasterCode(current, options);
        if (code !== current) update(key, code);
      },
    );

    (Object.entries(listFields) as [ListParamKey, MasterOption[]][]).forEach(([key, options]) => {
      if (!options.length) return;
      const current = form[key];
      if (!current.length) return;
      const codes = resolveMasterCodes(current, options);
      const same = codes.length === current.length && codes.every((c, i) => c === current[i]);
      if (!same) update(key, codes);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- migrate when values or option lists change
  }, [
    form.physicalActivity,
    form.workType,
    form.sleepDuration,
    form.pregnancyBf,
    form.foodPreference,
    form.regionalCuisine,
    form.primaryGoal,
    form.targetTimeline,
    form.medicalConditions,
    form.foodAllergies,
    bundle.activityOptions,
    bundle.workTypeOptions,
    bundle.sleepOptions,
    bundle.pregnancyOptions,
    bundle.foodPrefOptions,
    bundle.cuisineOptions,
    bundle.goalOptions,
    bundle.timelineOptions,
    bundle.medicalOptions,
    bundle.allergyOptions,
    update,
  ]);

  return bundle;
}
