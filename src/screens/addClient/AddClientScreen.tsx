import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import AssessmentWizardFlow from './AssessmentWizardFlow';
import type { AssessmentCompleteResult } from './AssessmentWizardFlow';
import { createBlankProfile } from '../../data/clientProfiles';
import { queryKeys } from '../../api/queryKeys';
import { getCoachPremiumOffer } from '../../api/coachApi';
import { getCurrentCoachCode } from '../../auth/session';
import { isSubscriptionRequired } from '../../config/appConfig';
import { Colors, ScreenPad, Spacing } from '../../constants/theme';
import FormErrorBanner from '../../components/FormErrorBanner';
import WaveScreenHeader from '../../components/WaveScreenHeader';
import type { ClientsStackScreenProps } from '../../types/navigation';
import { navigateBack } from '../../utils/navigationBack';
import { resolveAddClientAccess, subscriptionCheckErrorMessage } from '../../utils/premiumOffer';

export default function AddClientScreen({
  navigation,
  route,
}: ClientsStackScreenProps<'AddClient'>) {
  const queryClient = useQueryClient();
  const returnTo = route.params?.returnTo;
  const [allowed, setAllowed] = useState(() => !isSubscriptionRequired());
  const [gateError, setGateError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSubscriptionRequired()) return;
    let live = true;
    queryClient
      .fetchQuery({
        queryKey: queryKeys.coachPremium,
        queryFn: ({ signal }) => getCoachPremiumOffer(signal),
        staleTime: 0,
      })
      .then(offer => {
        if (!live) return;
        if (resolveAddClientAccess(true, offer.isPaid) === 'wizard') setAllowed(true);
        else navigation.replace('Premium', { returnTo });
      })
      .catch(err => {
        if (!live) return;
        setGateError(subscriptionCheckErrorMessage(err));
      });
    return () => {
      live = false;
    };
  }, [navigation, queryClient, returnTo]);

  const onComplete = async (result?: AssessmentCompleteResult) => {
    const coachCode = getCurrentCoachCode();
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.clientList(coachCode) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.recheckupList(coachCode) }),
    ]);
    const clientCode = result?.ids?.clientCode;
    const assessmentCode = result?.ids?.assessmentCode;
    const buttons = [{ text: 'Done', onPress: () => navigateBack(navigation, returnTo) }];
    if (clientCode) {
      buttons.unshift({
        text: 'Open Diet Plan',
        onPress: () =>
          navigation.navigate('ClientDietPlan', {
            client: {
              name: 'Client',
              clientCode,
              assessmentCode,
            },
            returnTo,
          }),
      });
    }
    Alert.alert('Client saved', 'The client assessment was saved successfully.', buttons);
  };

  if (!allowed) {
    return (
      <View style={styles.gate}>
        <WaveScreenHeader title="Add Client" onBack={() => navigateBack(navigation, returnTo)} />
        {gateError ? (
          <View style={styles.gateError}>
            <FormErrorBanner message={gateError} />
          </View>
        ) : (
          <ActivityIndicator color={Colors.secondary} style={styles.gateSpinner} />
        )}
      </View>
    );
  }

  return (
    <AssessmentWizardFlow
      flow="add"
      headerTitle="Add Client"
      initialForm={createBlankProfile()}
      finishLabel="Save Client"
      onExit={() => navigateBack(navigation, returnTo)}
      onComplete={onComplete}
    />
  );
}

const styles = StyleSheet.create({
  gate: { flex: 1, backgroundColor: Colors.background },
  gateSpinner: { marginTop: 32 },
  gateError: { paddingHorizontal: ScreenPad.horizontal, paddingTop: Spacing.lg },
});
