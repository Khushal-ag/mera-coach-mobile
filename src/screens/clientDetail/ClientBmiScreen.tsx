import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert, TouchableOpacity, Text } from 'react-native';
import PhaseWizard from '../../components/PhaseWizard';
import EmptyState from '../../components/EmptyState';
import { useClientDetailProfile } from '../../hooks/useClientDetailProfile';
import { getErrorMessage } from '../../api/client';
import { SCREEN_REGISTRY } from '../addClient/screenRegistry';
import { commitBmi, commitPersonal } from '../addClient/wizardCommits';
import { computeBmiMetrics } from '../../utils/bmi';
import { Colors } from '../../constants/theme';
import type { AssessmentIds } from '../addClient/wizardCommits';
import type { RootScreenProps } from '../../types/navigation';
import type { ClientProfile } from '../../types/models';

/** Full checkup: edit body stats, then BMI detail with report / diet finish actions. */
const SCREENS = [SCREEN_REGISTRY.basicProfile!, SCREEN_REGISTRY.bmiResult!];

export default function ClientBmiScreen({ navigation, route }: RootScreenProps<'ClientBmi'>) {
  const client = route.params?.client;
  const [ids, setIds] = useState<AssessmentIds>({
    clientCode: client?.clientCode,
    assessmentCode: client?.assessmentCode,
  });
  const { profile, isLoading, isError, error, dataUpdatedAt, refetch } =
    useClientDetailProfile(client);
  const [bmiSaved, setBmiSaved] = useState(false);

  const ensureCheckupSaved = async (form: ClientProfile): Promise<AssessmentIds> => {
    if (bmiSaved) {
      return {
        clientCode: ids.clientCode ?? client?.clientCode,
        assessmentCode: ids.assessmentCode ?? client?.assessmentCode,
      };
    }
    const metrics = computeBmiMetrics(form);
    if (!metrics) {
      Alert.alert('Missing details', 'Add height, weight, age and gender before saving BMI.');
      throw new Error('Missing details for BMI calculation.');
    }
    const nextIds = await commitPersonal(form, ids);
    setIds(nextIds);
    await commitBmi(metrics, nextIds, 0);
    setBmiSaved(true);
    return nextIds;
  };

  const showBmiReport = async (form: ClientProfile) => {
    const nextIds = await ensureCheckupSaved(form);
    navigation.navigate('ClientBmiReport', {
      client: client ? { ...client, ...nextIds } : undefined,
    });
  };

  const openAiDietPlan = async (form: ClientProfile) => {
    const nextIds = await ensureCheckupSaved(form);
    navigation.navigate('ClientDietPlan', {
      client: client ? { ...client, ...nextIds } : undefined,
    });
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
