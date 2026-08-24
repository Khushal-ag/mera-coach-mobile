import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import AssessmentWizardFlow from './addClient/AssessmentWizardFlow';
import { createBlankProfile } from '../data/clientProfiles';
import { queryKeys } from '../api/queryKeys';
import { getCurrentCoachCode } from '../auth/session';
import type { RootScreenProps } from '../types/navigation';

export default function AddClientScreen({ navigation }: RootScreenProps<'AddClient'>) {
  const queryClient = useQueryClient();

  const onComplete = async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.clientList(getCurrentCoachCode()),
    });
    navigation.goBack();
  };

  return (
    <AssessmentWizardFlow
      initialForm={createBlankProfile()}
      finishLabel="Save Client"
      onExit={() => navigation.goBack()}
      onComplete={onComplete}
    />
  );
}
