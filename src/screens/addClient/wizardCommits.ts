import {
  saveClientDetail,
  saveLifestyle,
  saveMeals,
  saveBmi,
  saveDietPlan,
  markComplete,
} from '../../api/clientApi';
import { uploadDocument } from '../../api/documentApi';
import { getCurrentCoachCode, getCurrentCoachId } from '../../auth/session';
import type { BodyMetrics } from '../../utils/bmi';
import type { AssessmentIds } from '../../api/clientApi';
import type { ClientProfile } from '../../types/models';

/** Save personal details, then upload any pending client photos once clientCode exists. */
export async function commitPersonal(
  profile: ClientProfile,
  ids: AssessmentIds,
): Promise<AssessmentIds> {
  const nextIds = await saveClientDetail(profile, ids);
  const pending = (profile.photos ?? []).filter(p => p.dataUrl?.trim());
  if (pending.length && nextIds.clientCode) {
    const coachCode = getCurrentCoachCode() ?? '';
    const savedBy = Number(getCurrentCoachId()) || 0;
    for (const photo of pending) {
      const dataUrl = photo.dataUrl!.trim();
      await uploadDocument({
        base64DataUrl: dataUrl,
        coachCode,
        refCode: nextIds.clientCode,
        refType: 'CLIENT',
        docType: 'PROGRESS_PHOTO',
        savedBy,
      });
    }
  }
  return nextIds;
}

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
