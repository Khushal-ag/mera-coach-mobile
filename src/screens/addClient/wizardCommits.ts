import {
  saveClientDetail,
  saveLifestyle,
  saveMeals,
  saveBmi,
  saveDietPlan,
  markComplete,
} from '../../api/clientApi';
import type { BodyMetrics } from '../../utils/bmi';
import type { AssessmentIds } from '../../api/clientApi';
import type { ClientProfile } from '../../types/models';

export const commitPersonal = saveClientDetail;
export const commitLifestyle = saveLifestyle;

export async function commitDiet(profile: ClientProfile, ids: AssessmentIds): Promise<void> {
  await saveMeals(profile.diet, ids);
}

export async function commitBmi(
  metrics: BodyMetrics,
  ids: AssessmentIds,
  totalDailyIntakeCal = 0,
): Promise<void> {
  await saveBmi(metrics, ids, totalDailyIntakeCal);
}

export const commitDietPlan = saveDietPlan;

// Mirrors web finishAssessment: save BMI if computed but not yet saved, then mark complete.
export async function finishAssessment(
  ids: AssessmentIds,
  bmiMetrics: BodyMetrics | null,
  bmiAlreadySaved: boolean,
  totalDailyIntakeCal: number,
): Promise<void> {
  if (bmiMetrics && !bmiAlreadySaved) {
    await saveBmi(bmiMetrics, ids, totalDailyIntakeCal);
  }
  await markComplete(ids);
}

export type { AssessmentIds };
