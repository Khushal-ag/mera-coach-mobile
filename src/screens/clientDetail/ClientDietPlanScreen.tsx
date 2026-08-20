import React from 'react';
import PhaseWizard from '../../components/PhaseWizard';
import { getClientProfile } from '../../data/clientProfiles';
import { SCREEN_REGISTRY } from '../addClient/screenRegistry';
import { commitDietPlan } from '../addClient/wizardCommits';
import type { RootScreenProps } from '../../types/navigation';
import type { ClientProfile } from '../../types/models';

const SCREENS = [SCREEN_REGISTRY.dietPlanGenerate!];

export default function ClientDietPlanScreen({
  navigation,
  route,
}: RootScreenProps<'ClientDietPlan'>) {
  const client = route.params?.client;
  const ids = { clientCode: client?.clientCode, assessmentCode: client?.assessmentCode };

  const onFinish = async (form: ClientProfile) => {
    if (form.dietPlan) await commitDietPlan(form.dietPlan, ids);
    navigation.goBack();
  };

  return (
    <PhaseWizard
      screens={SCREENS}
      initialForm={getClientProfile(client)}
      finishLabel="Save & Close"
      onFinish={onFinish}
      onExit={() => navigation.goBack()}
    />
  );
}
