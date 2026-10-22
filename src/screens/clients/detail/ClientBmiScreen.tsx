import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import AssessmentWizardFlow from '../../addClient/AssessmentWizardFlow';
import type { AssessmentCompleteResult } from '../../addClient/AssessmentWizardFlow';
import ClientPhaseLoadShell from './ClientPhaseLoadShell';
import AssessmentComplete from '../../../components/addClient/AssessmentComplete';
import { useCheckupProfile } from '../../../hooks/useCheckupProfile';
import { getErrorMessage } from '../../../api/client';
import { queryKeys } from '../../../api/queryKeys';
import { getCurrentCoachCode } from '../../../auth/session';
import type { DashboardStackScreenProps } from '../../../types/navigation';
import { navigateBack } from '../../../utils/navigationBack';

type ClientBmiScreenProps = DashboardStackScreenProps<'ClientBmi'>;

/** Full checkup: all wizard phases with previous assessment data pre-filled. */
export default function ClientBmiScreen({ navigation, route }: ClientBmiScreenProps) {
  const client = route.params?.client;
  const returnTo = route.params?.returnTo;
  const initialPhaseId = route.params?.initialPhaseId;
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState<AssessmentCompleteResult | null>(null);
  const { profile, ids, isLoading, isError, error, dataUpdatedAt, refetch, isFetching } =
    // Editing one section (initialPhaseId) updates the client's latest assessment. A full checkup starts a
    // new one, or resumes today's.
    useCheckupProfile(client, { assessmentIdMode: initialPhaseId ? 'latest' : 'checkup' });

  const onComplete = async (result?: AssessmentCompleteResult) => {
    const coachCode = getCurrentCoachCode();
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.clientList(coachCode) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.recheckupList(coachCode) }),
    ]);
    if (client?.clientCode) {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.clientDetail(client.clientCode, client.assessmentCode),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.clientDetailCheckup(client.clientCode),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.bmiReport(client.clientCode, client.assessmentCode),
      });
    }

    setSaved(result ?? {});
  };

  if (saved && client?.clientCode) {
    const target = {
      ...client,
      assessmentCode: saved.ids?.assessmentCode ?? client.assessmentCode,
    };
    return (
      <AssessmentComplete
        headerTitle={initialPhaseId ? 'Client Details' : 'Checkup'}
        title={initialPhaseId ? 'Details saved' : 'Checkup complete'}
        message="The assessment was saved. You can share the report now or come back to it later."
        clientCode={client.clientCode}
        assessmentCode={target.assessmentCode}
        onViewReport={() => navigation.navigate('ClientBmiReport', { client: target, returnTo })}
        onOpenDietPlan={() => navigation.navigate('ClientDietPlan', { client: target, returnTo })}
        onDone={() => navigateBack(navigation, returnTo)}
      />
    );
  }

  return (
    <ClientPhaseLoadShell
      isLoading={isLoading}
      isError={isError || !profile}
      errorMessage={getErrorMessage(error, 'Please go back and try again.')}
      onRetry={() => refetch()}
      retrying={isFetching}
    >
      <AssessmentWizardFlow
        key={`checkup-${client?.clientCode}-${dataUpdatedAt}`}
        flow="checkup"
        initialPhaseId={initialPhaseId}
        headerTitle="Checkup"
        initialForm={profile!}
        initialIds={ids}
        finishLabel="Save & Finish"
        skipEmptyDietCommit
        onExit={() => navigateBack(navigation, returnTo)}
        onComplete={onComplete}
      />
    </ClientPhaseLoadShell>
  );
}
