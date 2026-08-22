import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert, TouchableOpacity, Text } from 'react-native';
import PhaseWizard from '../../components/PhaseWizard';
import EmptyState from '../../components/EmptyState';
import { useClientDetailProfile } from '../../hooks/useClientDetailProfile';
import { getErrorMessage } from '../../api/client';
import { SCREEN_REGISTRY } from '../addClient/screenRegistry';
import { commitBmi } from '../addClient/wizardCommits';
import { computeBmiMetrics } from '../../utils/bmi';
import { Colors } from '../../constants/theme';
import type { RootScreenProps } from '../../types/navigation';
import type { ClientProfile } from '../../types/models';

const SCREENS = [SCREEN_REGISTRY.bmiResult!];

export default function ClientBmiScreen({ navigation, route }: RootScreenProps<'ClientBmi'>) {
  const client = route.params?.client;
  const ids = { clientCode: client?.clientCode, assessmentCode: client?.assessmentCode };
  const { profile, isLoading, isError, error, dataUpdatedAt, refetch } =
    useClientDetailProfile(client);
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

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (isError || !profile) {
    return (
      <View style={styles.center}>
        <EmptyState
          title="Could not load client"
          message={getErrorMessage(error, 'Please go back and try again.')}
        />
        <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <PhaseWizard
      key={`bmi-${client?.clientCode}-${client?.assessmentCode}-${dataUpdatedAt}`}
      screens={SCREENS}
      initialForm={profile}
      onExit={() => navigation.goBack()}
      finishButtons={[
        { label: 'BMI Report', icon: 'document-text-outline', onPress: showBmiReport },
        { label: 'AI Diet Plan', icon: 'sparkles-outline', onPress: openAiDietPlan },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: 24,
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 20,
  },
  retryText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
});
