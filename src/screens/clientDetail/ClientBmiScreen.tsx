import React, { useState } from 'react';
import { Alert } from 'react-native';
import PhaseWizard from '../../components/PhaseWizard';
import { getClientProfile } from '../../data/clientProfiles';
import { SCREEN_REGISTRY } from '../addClient/screenRegistry';
import { commitBmi } from '../addClient/wizardCommits';
import { computeBmiMetrics } from '../../utils/bmi';
import type { RootScreenProps } from '../../types/navigation';
import type { ClientProfile } from '../../types/models';

const SCREENS = [SCREEN_REGISTRY.bmiResult!];

export default function ClientBmiScreen({ navigation, route }: RootScreenProps<'ClientBmi'>) {
  const client = route.params?.client;
  const ids = { clientCode: client?.clientCode, assessmentCode: client?.assessmentCode };
  const [bmiSaved, setBmiSaved] = useState(false);

  const ensureBmiSaved = async (form: ClientProfile) => {
    if (bmiSaved) return;
    const metrics = computeBmiMetrics(form);
    if (!metrics) {
      Alert.alert('Missing details', 'Add height, weight, age and gender before saving BMI.');
      throw new Error('Missing details for BMI calculation.');
    }
    await commitBmi(metrics, ids, 0);
    setBmiSaved(true);
  };

  const showBmiReport = async (form: ClientProfile) => {
    await ensureBmiSaved(form);
    navigation.navigate('ClientBmiReport', { client });
  };

  const openAiDietPlan = async (form: ClientProfile) => {
    await ensureBmiSaved(form);
    navigation.navigate('ClientDietPlan', { client });
  };

  return (
    <PhaseWizard
      screens={SCREENS}
      initialForm={getClientProfile(client)}
      onExit={() => navigation.goBack()}
      finishButtons={[
        { label: 'BMI Report', icon: 'document-text-outline', onPress: showBmiReport },
        { label: 'AI Diet Plan', icon: 'sparkles-outline', onPress: openAiDietPlan },
      ]}
    />
  );
}
