import React from 'react';
import PhaseWizard from '../../components/PhaseWizard';
import { getClientProfile } from '../../data/clientProfiles';
import { SCREEN_REGISTRY, DIET_SCREENS } from '../addClient/screenRegistry';
import { commitDiet } from '../addClient/wizardCommits';
import type { RootScreenProps } from '../../types/navigation';
import type { ClientProfile } from '../../types/models';

const SCREENS = DIET_SCREENS.map(s => SCREEN_REGISTRY[s.id]!);

export default function ClientDietScreen({ navigation, route }: RootScreenProps<'ClientDiet'>) {
  const client = route.params?.client;
  const ids = { clientCode: client?.clientCode, assessmentCode: client?.assessmentCode };

  const onFinish = async (form: ClientProfile) => {
    await commitDiet(form, ids);
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
