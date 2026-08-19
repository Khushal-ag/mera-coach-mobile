import React from 'react';
import { Alert } from 'react-native';
import PhaseWizard from '../../components/PhaseWizard';
import { getClientProfile } from '../../data/clientProfiles';
import { SCREEN_REGISTRY } from '../addClient/screenRegistry';
import { getBmi, getBmiCategory } from '../../utils/bmi';
import type { RootScreenProps } from '../../types/navigation';
import type { ClientProfile } from '../../types/models';

const SCREENS = [SCREEN_REGISTRY.bmiResult!];

export default function ClientBmiScreen({ navigation, route }: RootScreenProps<'ClientBmi'>) {
  const client = route.params?.client;

  const showBmiReport = (form: ClientProfile) => {
    const bmi = getBmi(form.height, form.weight);
    const category = getBmiCategory(bmi);
    Alert.alert(
      'BMI Report',
      `${form.name || client?.name || 'Client'}\n\nBMI: ${bmi ? bmi.toFixed(1) : '--'} (${category ? category.label : '--'})\nHeight: ${form.height || '--'} cm\nWeight: ${form.weight || '--'} kg`,
    );
  };

  const openAiDietPlan = () => {
    navigation.navigate('ClientDiet', { client });
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
