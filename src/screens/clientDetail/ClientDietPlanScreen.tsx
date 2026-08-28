import React, { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AssessmentWizardFlow from '../addClient/AssessmentWizardFlow';
import PdfDownloadShareButton from '../../components/PdfDownloadShareButton';
import type { AssessmentCompleteResult } from '../addClient/AssessmentWizardFlow';
import ClientPhaseLoadShell from '../../components/ClientPhaseLoadShell';
import { useCheckupProfile } from '../../hooks/useCheckupProfile';
import { getDietPlanReport } from '../../api/clientApi';
import { getErrorMessage } from '../../api/client';
import { queryKeys } from '../../api/queryKeys';
import { getCurrentCoachCode } from '../../auth/session';
import {
  dietPlanPdfQuery,
  downloadAndSharePdf,
  PDF_GENERATE_FAILED_MESSAGE,
} from '../../utils/pdfShare';
import type { ClientsStackScreenProps } from '../../types/navigation';

/** Opens checkup wizard on diet plan; saves via save-diet-plan only (no full finish). */
export default function ClientDietPlanScreen({
  navigation,
  route,
}: ClientsStackScreenProps<'ClientDietPlan'>) {
  const client = route.params?.client;
  const queryClient = useQueryClient();
  const [preparingPdf, setPreparingPdf] = useState(false);
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
    const coachCode = getCurrentCoachCode();
    const clientCode = client?.clientCode ?? ids.clientCode;
    if (!coachCode || !clientCode) {
      Alert.alert('Cannot download PDF', 'Client information is missing.');
      return;
    }
    setPreparingPdf(true);
    try {
      await downloadAndSharePdf(
        '/v{version}/Client/diet-plan-pdf',
        dietPlanPdfQuery({ coachCode, clientCode }),
        'diet-plan.pdf',
      );
    } catch (err) {
      Alert.alert('PDF unavailable', getErrorMessage(err, PDF_GENERATE_FAILED_MESSAGE));
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
        // Prefix: Client Detail + checkup variants for this client.
        queryClient.invalidateQueries({ queryKey: ['clientDetail', client.clientCode] }),
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

    const message = becameComplete
      ? 'Diet plan saved. Assessment status: Complete.'
      : 'Diet plan saved successfully.';

    Alert.alert('Diet plan saved', message, [{ text: 'OK', onPress: () => navigation.goBack() }]);
  };

  const planSettled = !ids.assessmentCode || planQuery.isFetched || planQuery.isError;
  const loading = isLoading || (detailReady && !!ids.assessmentCode && !planSettled);
  const loadError = isError || planQuery.isError;
  const loadErrorObj = isError ? error : planQuery.error;

  const retry = () => {
    refetch();
    if (planQuery.isError) void planQuery.refetch();
  };

  const shareButton = canSharePdf ? (
    <PdfDownloadShareButton variant="headerOnLight" onPress={shareDietPdf} loading={preparingPdf} />
  ) : null;

  return (
    <ClientPhaseLoadShell
      isLoading={loading}
      isError={loadError || !initialForm}
      errorMessage={getErrorMessage(loadErrorObj, 'Please go back and try again.')}
      onRetry={retry}
    >
      <AssessmentWizardFlow
        key={`diet-plan-${ids.clientCode}-${ids.assessmentCode}`}
        flow="checkup"
        initialForm={initialForm!}
        initialIds={ids}
        initialPhaseId="dietPlan"
        commitMode="dietPlan"
        finishLabel="Save Plan"
        skipEmptyDietCommit
        headerRight={shareButton}
        onExit={() => navigation.goBack()}
        onComplete={onComplete}
      />
    </ClientPhaseLoadShell>
  );
}
