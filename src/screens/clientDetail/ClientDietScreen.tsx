import React from 'react';
import PhaseWizard from '../../components/PhaseWizard';
import { getClientProfile } from '../../data/clientProfiles';
import { SCREEN_REGISTRY, DIET_SCREENS } from '../addClient/screenRegistry';
import type { RootScreenProps } from '../../types/navigation';

const SCREENS = DIET_SCREENS.map(s => SCREEN_REGISTRY[s.id]!);

export default function ClientDietScreen({ navigation, route }: RootScreenProps<'ClientDiet'>) {
  const client = route.params?.client;

  return (
    <PhaseWizard
      screens={SCREENS}
      initialForm={getClientProfile(client)}
      finishLabel="Save Changes"
      onFinish={() => navigation.goBack()}
      onExit={() => navigation.goBack()}
    />
  );
}
