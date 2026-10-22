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
  ensureNoneOfTheAboveFirst,
  coerceNoneOfTheAboveValues,
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

interface HealthGoalParamBundle {
  medicalOptions: MasterOption[];
  allergyOptions: MasterOption[];
  goalOptions: MasterOption[];
  timelineOptions: MasterOption[];
}

interface LifestyleParamBundle {
  activityOptions: MasterOption[];
  workTypeOptions: MasterOption[];
  sleepOptions: MasterOption[];
  pregnancyOptions: MasterOption[];
  foodPrefOptions: MasterOption[];
  cuisineOptions: MasterOption[];
}

function useHealthGoalParamBundle(): HealthGoalParamBundle {
  return {
    medicalOptions: ensureNoneOfTheAboveFirst(
      useParamMasterOptions(PARAM_CODES.medicalConditions, MEDICAL_CONDITIONS),
    ),
    allergyOptions: ensureNoneOfTheAboveFirst(
      useParamMasterOptions(PARAM_CODES.foodAllergies, FOOD_ALLERGIES),
    ),
    goalOptions: useParamMasterOptions(PARAM_CODES.primaryGoal, PRIMARY_GOALS),
    timelineOptions: useParamMasterOptions(PARAM_CODES.targetTimeline, TARGET_TIMELINES),
  };
}

function useLifestyleParamBundle(): LifestyleParamBundle {
  return {
    activityOptions: useParamMasterOptions(PARAM_CODES.physicalActivity, PHYSICAL_ACTIVITY_LEVELS),
    workTypeOptions: useParamMasterOptions(PARAM_CODES.workType, WORK_TYPES),
    sleepOptions: useParamMasterOptions(PARAM_CODES.sleepDuration, SLEEP_DURATIONS),
    pregnancyOptions: useParamMasterOptions(PARAM_CODES.pregnancy, PREGNANCY_BF_OPTIONS),
    foodPrefOptions: useParamMasterOptions(PARAM_CODES.foodPreference, FOOD_PREFERENCES),
    cuisineOptions: useParamMasterOptions(PARAM_CODES.regionalCuisine, REGIONAL_CUISINES),
  };
}

function useNormalizeScalarAndListFields(
  form: ClientProfile,
  update: <K extends keyof ClientProfile>(key: K, val: ClientProfile[K]) => void,
  scalarFields: Partial<Record<ScalarParamKey, MasterOption[]>>,
  listFields: Partial<Record<ListParamKey, MasterOption[]>>,
  deps: unknown[],
) {
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
      const codes = coerceNoneOfTheAboveValues(resolveMasterCodes(current, options), options);
      const same = codes.length === current.length && codes.every((c, i) => c === current[i]);
      if (!same) update(key, codes);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- migrate when values or option lists change
  }, deps);
}

/**
 * Health-goals step only — avoids fetching lifestyle PARAMLISTs until that step mounts.
 */
export function useNormalizeHealthGoalParamFormValues(
  form: ClientProfile,
  update: <K extends keyof ClientProfile>(key: K, val: ClientProfile[K]) => void,
): HealthGoalParamBundle {
  const bundle = useHealthGoalParamBundle();

  useNormalizeScalarAndListFields(
    form,
    update,
    {
      primaryGoal: bundle.goalOptions,
      targetTimeline: bundle.timelineOptions,
    },
    {
      medicalConditions: bundle.medicalOptions,
      foodAllergies: bundle.allergyOptions,
    },
    [
      form.primaryGoal,
      form.targetTimeline,
      form.medicalConditions,
      form.foodAllergies,
      bundle.goalOptions,
      bundle.timelineOptions,
      bundle.medicalOptions,
      bundle.allergyOptions,
      update,
    ],
  );

  return bundle;
}

/**
 * Lifestyle step only — shares React Query cache with DietPair / Client Detail when those mount later.
 */
export function useNormalizeLifestyleParamFormValues(
  form: ClientProfile,
  update: <K extends keyof ClientProfile>(key: K, val: ClientProfile[K]) => void,
): LifestyleParamBundle {
  const bundle = useLifestyleParamBundle();

  useNormalizeScalarAndListFields(
    form,
    update,
    {
      physicalActivity: bundle.activityOptions,
      workType: bundle.workTypeOptions,
      sleepDuration: bundle.sleepOptions,
      pregnancyBf: bundle.pregnancyOptions,
      foodPreference: bundle.foodPrefOptions,
      regionalCuisine: bundle.cuisineOptions,
    },
    {},
    [
      form.physicalActivity,
      form.workType,
      form.sleepDuration,
      form.pregnancyBf,
      form.foodPreference,
      form.regionalCuisine,
      bundle.activityOptions,
      bundle.workTypeOptions,
      bundle.sleepOptions,
      bundle.pregnancyOptions,
      bundle.foodPrefOptions,
      bundle.cuisineOptions,
      update,
    ],
  );

  return bundle;
}
