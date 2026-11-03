import React, { useMemo, useState } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import AssessmentWizardFlow from '../../addClient/AssessmentWizardFlow';
import PdfDownloadShareButton from '../../../components/clients/PdfDownloadShareButton';
import type { AssessmentCompleteResult } from '../../addClient/AssessmentWizardFlow';
import ClientPhaseLoadShell from './ClientPhaseLoadShell';
import { useCheckupProfile } from '../../../hooks/useCheckupProfile';
import { getDietPlanReport } from '../../../api/clientApi';
import { getErrorMessage } from '../../../api/client';
import { queryKeys } from '../../../api/queryKeys';
import { getCurrentCoachCode } from '../../../auth/session';
import {
  dietPlanPdfQuery,
  downloadAndSharePdf,
  PDF_GENERATE_FAILED_MESSAGE,
  PDF_PATH,
} from '../../../utils/pdfShare';
import type { ClientsStackScreenProps } from '../../../types/navigation';
import { navigateBack, navigateToDashboard } from '../../../utils/navigationBack';
import { appAlert } from '../../../utils/appDialog';

/** Opens checkup wizard on diet plan; saves via save-diet-plan only (no full finish). */
export default function ClientDietPlanScreen({
  navigation,
  route,
}: ClientsStackScreenProps<'ClientDietPlan'>) {
  const client = route.params?.client;
  const returnTo = route.params?.returnTo;
  const queryClient = useQueryClient();
  const [preparingPdf, setPreparingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const { profile, ids, isLoading, isError, error, detailReady, refetch } = useCheckupProfile(
    client,
    { assessmentIdMode: 'latest' },
  );

  // Start diet-plan-report as soon as assessment ids exist — do not wait for food-master mapping.
  const planQuery = useQuery({
    queryKey: queryKeys.dietPlanReport(ids.clientCode, ids.assessmentCode),
    queryFn: () => getDietPlanReport(ids),
    enabled: detailReady && !!ids.clientCode && !!ids.assessmentCode,
  });

  const initialForm = useMemo(() => {
    if (!profile) return null;
    if (planQuery.data) return { ...profile, dietPlan: planQuery.data };
    return profile;
  }, [profile, planQuery.data]);

  const canSharePdf = !!planQuery.data && !!ids.clientCode;

  const shareDietPdf = async () => {
    if (preparingPdf) return;
    const coachCode = getCurrentCoachCode();
    const clientCode = client?.clientCode ?? ids.clientCode;
    if (!coachCode || !clientCode) {
      setPdfError('Client information is missing, so this PDF could not be downloaded.');
      return;
    }
    setPdfError(null);
    setPreparingPdf(true);
    try {
      await downloadAndSharePdf(
        PDF_PATH.dietPlan,
        dietPlanPdfQuery({ coachCode, clientCode }),
        'diet-plan.pdf',
      );
    } catch (err) {
      setPdfError(getErrorMessage(err, PDF_GENERATE_FAILED_MESSAGE));
    } finally {
      setPreparingPdf(false);
    }
  };

  const onComplete = async (result?: AssessmentCompleteResult) => {
    const assessmentCode = ids.assessmentCode ?? client?.assessmentCode;
    const status = result?.dietPlan?.status?.trim();
    const becameComplete = !!status && status.toLowerCase() === 'complete';

    const tasks: Promise<unknown>[] = [];
    if (client?.clientCode) {
      tasks.push(
        queryClient.invalidateQueries({
          queryKey: queryKeys.dietPlanReport(client.clientCode, assessmentCode),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.clientDetailRoot(client.clientCode) }),
      );
    }
    if (becameComplete) {
      const coachCode = getCurrentCoachCode();
      tasks.push(
        queryClient.invalidateQueries({ queryKey: queryKeys.clientList(coachCode) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.recheckupList(coachCode) }),
      );
    }
    await Promise.all(tasks);

    // Stay on the plan so the coach can save or share the PDF right away.
    const message = becameComplete
      ? 'Diet plan saved. Assessment status: Complete. Use Share PDF to save or send it.'
      : 'Diet plan saved. Use Share PDF to save or send it.';

    appAlert('Diet plan saved', message, undefined, { tone: 'success' });
  };

  const planSettled = !ids.assessmentCode || planQuery.isFetched || planQuery.isError;
  const loading = isLoading || (detailReady && !!ids.assessmentCode && !planSettled);
  const missingClient = !client?.clientCode;
  const loadError = isError || planQuery.isError;
  const loadErrorObj = isError ? error : planQuery.error;

  const retry = () => {
    refetch();
    if (planQuery.isError) void planQuery.refetch();
  };

  const shareButton = canSharePdf ? (
    <PdfDownloadShareButton variant="primary" onPress={shareDietPdf} loading={preparingPdf} />
  ) : null;

  return (
    <ClientPhaseLoadShell
      isLoading={loading}
      isError={missingClient || loadError || !initialForm}
      errorMessage={
        missingClient
          ? 'Client information is missing. Go back and open the diet plan from the client profile.'
          : getErrorMessage(loadErrorObj, 'Please go back and try again.')
      }
      onRetry={missingClient ? () => navigateBack(navigation, returnTo) : retry}
      retryLabel={missingClient ? 'Go back' : undefined}
      retrying={loading || planQuery.isFetching}
    >
      <AssessmentWizardFlow
        key={`diet-plan-${ids.clientCode}-${ids.assessmentCode}`}
        flow="checkup"
        headerTitle="Diet Plan"
        initialForm={initialForm!}
        initialIds={ids}
        initialPhaseId="dietPlan"
        commitMode="dietPlan"
        finishLabel="Save Plan"
        skipEmptyDietCommit
        pageAction={shareButton}
        notice={pdfError}
        onHome={() => navigateToDashboard(navigation)}
        onExit={() => navigateBack(navigation, returnTo)}
        onComplete={onComplete}
      />
    </ClientPhaseLoadShell>
  );
}
