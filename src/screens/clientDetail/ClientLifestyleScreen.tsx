import React from 'react';
import PhaseWizard from '../../components/PhaseWizard';
import { getClientProfile } from '../../data/clientProfiles';
import { SCREEN_REGISTRY } from '../addClient/screenRegistry';
import type { RootScreenProps } from '../../types/navigation';

const SCREENS = [SCREEN_REGISTRY.lifestylePreferences!, SCREEN_REGISTRY.healthGoals!];

export default function ClientLifestyleScreen({
  navigation,
  route,
}: RootScreenProps<'ClientLifestyle'>) {
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
