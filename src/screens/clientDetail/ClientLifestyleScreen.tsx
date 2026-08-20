import React from 'react';
import PhaseWizard from '../../components/PhaseWizard';
import { getClientProfile } from '../../data/clientProfiles';
import { SCREEN_REGISTRY } from '../addClient/screenRegistry';
import { commitLifestyle } from '../addClient/wizardCommits';
import type { RootScreenProps } from '../../types/navigation';
import type { ClientProfile } from '../../types/models';

const SCREENS = [SCREEN_REGISTRY.lifestylePreferences!, SCREEN_REGISTRY.healthGoals!];

export default function ClientLifestyleScreen({
  navigation,
  route,
}: RootScreenProps<'ClientLifestyle'>) {
  const client = route.params?.client;
  const ids = { clientCode: client?.clientCode, assessmentCode: client?.assessmentCode };

  const onFinish = async (form: ClientProfile) => {
    await commitLifestyle(form, ids);
    navigation.goBack();
  };

  return (
    <PhaseWizard
      screens={SCREENS}
      initialForm={getClientProfile(client)}
      finishLabel="Save Changes"
      onFinish={onFinish}
      onExit={() => navigation.goBack()}
    />
  );
}
