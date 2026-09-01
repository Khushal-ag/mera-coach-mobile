import React from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import AssessmentWizardFlow from '../addClient/AssessmentWizardFlow';
import ClientPhaseLoadShell from '../../components/ClientPhaseLoadShell';
import { useCheckupProfile } from '../../hooks/useCheckupProfile';
import { getErrorMessage } from '../../api/client';
import { queryKeys } from '../../api/queryKeys';
import { getCurrentCoachCode } from '../../auth/session';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CheckupsStackParamList, ClientsStackParamList } from '../../types/navigation';
import { navigateBack } from '../../utils/navigationBack';

type ClientBmiScreenProps =
  | NativeStackScreenProps<ClientsStackParamList, 'ClientBmi'>
  | NativeStackScreenProps<CheckupsStackParamList, 'ClientBmi'>;

/** Full checkup: all wizard phases with previous assessment data pre-filled. */
export default function ClientBmiScreen({ navigation, route }: ClientBmiScreenProps) {
  const client = route.params?.client;
  const returnTo = route.params?.returnTo;
  const queryClient = useQueryClient();
  const { profile, ids, isLoading, isError, error, dataUpdatedAt, refetch } =
    useCheckupProfile(client);

  const onComplete = async () => {
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

    Alert.alert('Checkup complete', 'Assessment saved successfully.', [
      { text: 'OK', onPress: () => navigateBack(navigation, returnTo) },
    ]);
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
        flow="checkup"
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
