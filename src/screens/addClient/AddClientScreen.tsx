import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import AssessmentWizardFlow from './AssessmentWizardFlow';
import AssessmentComplete from '../../components/addClient/AssessmentComplete';
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
  const [saved, setSaved] = useState<AssessmentCompleteResult | null>(null);

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
    setSaved(result ?? {});
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

  if (saved) {
    const clientCode = saved.ids?.clientCode;
    const assessmentCode = saved.ids?.assessmentCode;
    const client = { name: 'Client', clientCode, assessmentCode };
    return (
      <AssessmentComplete
        headerTitle="Add Client"
        title="Client saved"
        message="The client assessment was saved. You can share the report now or come back to it later."
        clientCode={clientCode}
        assessmentCode={assessmentCode}
        onViewReport={() => navigation.navigate('ClientBmiReport', { client, returnTo })}
        onOpenDietPlan={() => navigation.navigate('ClientDietPlan', { client, returnTo })}
        onDone={() => navigateBack(navigation, returnTo)}
      />
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
