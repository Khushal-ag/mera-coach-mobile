import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import AssessmentWizardFlow from '../addClient/AssessmentWizardFlow';
import ClientPhaseLoadShell from '../../components/ClientPhaseLoadShell';
import { useCheckupProfile } from '../../hooks/useCheckupProfile';
import { getErrorMessage } from '../../api/client';
import { queryKeys } from '../../api/queryKeys';
import { getCurrentCoachCode } from '../../auth/session';
import type { RootScreenProps } from '../../types/navigation';

/** Full checkup: all wizard phases with previous assessment data pre-filled. */
export default function ClientBmiScreen({ navigation, route }: RootScreenProps<'ClientBmi'>) {
  const client = route.params?.client;
  const queryClient = useQueryClient();
  const { profile, ids, isLoading, isError, error, dataUpdatedAt, refetch } =
    useCheckupProfile(client);

  const onComplete = async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.clientList(getCurrentCoachCode()),
    });
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
    navigation.goBack();
  };

  return (
    <ClientPhaseLoadShell
      isLoading={isLoading}
      isError={isError || !profile}
      errorMessage={getErrorMessage(error, 'Please go back and try again.')}
      onRetry={() => refetch()}
    >
      <AssessmentWizardFlow
        key={`checkup-${client?.clientCode}-${dataUpdatedAt}`}
        initialForm={profile!}
        initialIds={ids}
        finishLabel="Save & Finish"
        skipEmptyDietCommit
        onExit={() => navigation.goBack()}
        onComplete={onComplete}
      />
    </ClientPhaseLoadShell>
  );
}
