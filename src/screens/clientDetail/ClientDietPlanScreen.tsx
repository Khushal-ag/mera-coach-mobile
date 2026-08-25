import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import AssessmentWizardFlow from '../addClient/AssessmentWizardFlow';
import ClientPhaseLoadShell from '../../components/ClientPhaseLoadShell';
import { useCheckupProfile } from '../../hooks/useCheckupProfile';
import { getErrorMessage } from '../../api/client';
import { queryKeys } from '../../api/queryKeys';
import { getCurrentCoachCode } from '../../auth/session';
import type { RootScreenProps } from '../../types/navigation';

/** Opens checkup wizard on diet plan; saves via save-diet-plan only (no full finish). */
export default function ClientDietPlanScreen({
  navigation,
  route,
}: RootScreenProps<'ClientDietPlan'>) {
  const client = route.params?.client;
  const queryClient = useQueryClient();
  const { profile, ids, isLoading, isError, error, dataUpdatedAt, refetch } = useCheckupProfile(
    client,
    { assessmentIdMode: 'latest' },
  );

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
        key={`diet-plan-${client?.clientCode}-${dataUpdatedAt}`}
        flow="checkup"
        initialForm={profile!}
        initialIds={ids}
        initialPhaseId="dietPlan"
        commitMode="dietPlan"
        finishLabel="Save Plan"
        skipEmptyDietCommit
        onExit={() => navigation.goBack()}
        onComplete={onComplete}
      />
    </ClientPhaseLoadShell>
  );
}
