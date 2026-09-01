import React from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import AssessmentWizardFlow from './addClient/AssessmentWizardFlow';
import { createBlankProfile } from '../data/clientProfiles';
import { queryKeys } from '../api/queryKeys';
import { getCurrentCoachCode } from '../auth/session';
import type { ClientsStackScreenProps } from '../types/navigation';
import { navigateBack } from '../utils/navigationBack';

export default function AddClientScreen({
  navigation,
  route,
}: ClientsStackScreenProps<'AddClient'>) {
  const queryClient = useQueryClient();
  const returnTo = route.params?.returnTo;

  const onComplete = async () => {
    const coachCode = getCurrentCoachCode();
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.clientList(coachCode) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.recheckupList(coachCode) }),
    ]);
    Alert.alert('Client saved', 'The client assessment was saved successfully.', [
      { text: 'OK', onPress: () => navigateBack(navigation, returnTo) },
    ]);
  };

  return (
    <AssessmentWizardFlow
      flow="add"
      headerTitle="Add Client"
      initialForm={createBlankProfile()}
      finishLabel="Save Client"
      onExit={() => navigateBack(navigation, returnTo)}
      onComplete={onComplete}
    />
  );
}
