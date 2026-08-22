import React from 'react';
import { View, ActivityIndicator, StyleSheet, Alert, TouchableOpacity, Text } from 'react-native';
import PhaseWizard from '../../components/PhaseWizard';
import EmptyState from '../../components/EmptyState';
import { useClientDetailProfile } from '../../hooks/useClientDetailProfile';
import { getErrorMessage } from '../../api/client';
import { isDietEmpty } from '../../data/dietCatalog';
import { SCREEN_REGISTRY, DIET_SCREENS } from '../addClient/screenRegistry';
import { commitDiet } from '../addClient/wizardCommits';
import { Colors } from '../../constants/theme';
import type { RootScreenProps } from '../../types/navigation';
import type { ClientProfile } from '../../types/models';

const SCREENS = DIET_SCREENS.map(s => SCREEN_REGISTRY[s.id]!);

export default function ClientDietScreen({ navigation, route }: RootScreenProps<'ClientDiet'>) {
  const client = route.params?.client;
  const ids = { clientCode: client?.clientCode, assessmentCode: client?.assessmentCode };
  const { profile, isLoading, isError, error, dataUpdatedAt, refetch } =
    useClientDetailProfile(client);

  const onFinish = async (form: ClientProfile) => {
    // Saved meals can't be reconstructed from the API — empty form must not wipe them.
    if (isDietEmpty(form.diet)) {
      Alert.alert(
        'Add food items',
        'Current meals are not loaded from the server. Add at least one food item before saving, or go back to keep the existing diet.',
      );
      throw new Error('Diet is empty — refusing to overwrite saved meals.');
    }
    await commitDiet(form, ids);
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
      key={`diet-${client?.clientCode}-${client?.assessmentCode}-${dataUpdatedAt}`}
      screens={SCREENS}
      initialForm={profile}
      finishLabel="Save Changes"
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
