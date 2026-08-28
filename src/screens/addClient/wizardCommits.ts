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
import { ApiError } from '../../api/client';
import type { BodyMetrics } from '../../utils/bmi';
import type { AssessmentIds } from '../../api/clientApi';
import type { ClientProfile } from '../../types/models';

/** Save personal details, then upload any pending client photos once clientCode exists. */
export async function commitPersonal(
  profile: ClientProfile,
  ids: AssessmentIds,
): Promise<AssessmentIds> {
  const nextIds = await saveClientDetail(profile, ids);
  if (!nextIds.clientCode || !nextIds.assessmentCode) {
    throw new ApiError(
      'Client was saved but assessment details were not returned. Please try again.',
      0,
    );
  }

  const pending = (profile.photos ?? []).filter(p => p.dataUrl?.trim());
  if (pending.length && nextIds.clientCode) {
    const coachCode = getCurrentCoachCode() ?? '';
    const savedBy = Number(getCurrentCoachId()) || 0;
    // Photos are optional — upload failures must not block the wizard.
    for (const photo of pending) {
      try {
        const dataUrl = photo.dataUrl!.trim();
        await uploadDocument({
          base64DataUrl: dataUrl,
          coachCode,
          refCode: nextIds.clientCode,
          refType: 'CLIENT',
          docType: 'PROGRESS_PHOTO',
          savedBy,
        });
      } catch {
        /* optional upload — continue wizard */
      }
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
