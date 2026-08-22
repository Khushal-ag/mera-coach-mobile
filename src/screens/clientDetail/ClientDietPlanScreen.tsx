import React from 'react';
import { View, ActivityIndicator, StyleSheet, Alert, TouchableOpacity, Text } from 'react-native';
import PhaseWizard from '../../components/PhaseWizard';
import EmptyState from '../../components/EmptyState';
import { useClientDetailProfile } from '../../hooks/useClientDetailProfile';
import { getErrorMessage } from '../../api/client';
import { SCREEN_REGISTRY } from '../addClient/screenRegistry';
import { commitDietPlan } from '../addClient/wizardCommits';
import { Colors } from '../../constants/theme';
import type { RootScreenProps } from '../../types/navigation';
import type { ClientProfile } from '../../types/models';

const SCREENS = [SCREEN_REGISTRY.dietPlanGenerate!];

export default function ClientDietPlanScreen({
  navigation,
  route,
}: RootScreenProps<'ClientDietPlan'>) {
  const client = route.params?.client;
  const ids = { clientCode: client?.clientCode, assessmentCode: client?.assessmentCode };
  const { profile, isLoading, isError, error, dataUpdatedAt, refetch } =
    useClientDetailProfile(client);

  const onFinish = async (form: ClientProfile) => {
    if (!form.dietPlan) {
      Alert.alert('No diet plan', 'Generate an AI diet plan before saving.');
      throw new Error('No diet plan generated.');
    }
    await commitDietPlan(form.dietPlan, ids);
    navigation.goBack();
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
      key={`diet-plan-${client?.clientCode}-${client?.assessmentCode}-${dataUpdatedAt}`}
      screens={SCREENS}
      initialForm={profile}
      finishLabel="Save & Close"
      onFinish={onFinish}
      onExit={() => navigation.goBack()}
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
