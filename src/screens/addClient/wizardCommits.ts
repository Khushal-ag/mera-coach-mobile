import {
  saveClientDetail,
  saveLifestyle,
  saveMeals,
  saveBmi,
  saveDietPlan,
  markComplete,
} from '../../api/clientApi';
import { uploadDocument } from '../../api/documentApi';
import { getCurrentCoachCode, getDocumentSavedById } from '../../auth/session';
import { ApiError, getErrorMessage } from '../../api/client';
import type { BodyMetrics } from '../../utils/bmi';
import type { AssessmentIds } from '../../api/clientApi';
import type { ClientProfile } from '../../types/models';

export type PersonalCommitResult = {
  ids: AssessmentIds;
  /** Set when optional progress photos failed. The client save itself succeeded. */
  photoUploadError: string | null;
};

/** Save personal details, then upload any pending client photos once clientCode exists. */
export async function commitPersonal(
  profile: ClientProfile,
  ids: AssessmentIds,
): Promise<PersonalCommitResult> {
  const nextIds = await saveClientDetail(profile, ids);
  if (!nextIds.clientCode || !nextIds.assessmentCode) {
    throw new ApiError(
      'Client was saved but assessment details were not returned. Please try again.',
      0,
    );
  }

  let photoUploadError: string | null = null;
  const pending = (profile.photos ?? []).filter(p => p.dataUrl?.trim());
  if (pending.length && nextIds.clientCode) {
    const coachCode = getCurrentCoachCode() ?? '';
    const savedBy = getDocumentSavedById();
    // Photos are optional — a failed upload must not roll back the client, but it must be told.
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
      } catch (err) {
        photoUploadError = getErrorMessage(
          err,
          'A progress photo could not be uploaded. You can add it from the client profile.',
        );
      }
    }
  }
  return { ids: nextIds, photoUploadError };
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
