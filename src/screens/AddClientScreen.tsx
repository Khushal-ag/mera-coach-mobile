import React from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import AssessmentWizardFlow from './addClient/AssessmentWizardFlow';
import { createBlankProfile } from '../data/clientProfiles';
import { queryKeys } from '../api/queryKeys';
import { getCurrentCoachCode } from '../auth/session';
import type { RootScreenProps } from '../types/navigation';

export default function AddClientScreen({ navigation }: RootScreenProps<'AddClient'>) {
  const queryClient = useQueryClient();

  const onComplete = async () => {
    const coachCode = getCurrentCoachCode();
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.clientList(coachCode) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.recheckupList(coachCode) }),
    ]);
    Alert.alert('Client saved', 'The client assessment was saved successfully.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <AssessmentWizardFlow
      flow="add"
      initialForm={createBlankProfile()}
      finishLabel="Save Client"
      onExit={() => navigation.goBack()}
      onComplete={onComplete}
    />
  );
}
