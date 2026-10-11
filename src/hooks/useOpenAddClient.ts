import { useCallback, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { getCoachPremiumOffer } from '../api/coachApi';
import { queryKeys } from '../api/queryKeys';
import { isSubscriptionRequired } from '../config/appConfig';
import type { DashboardStackParamList, NavigationReturnTo } from '../types/navigation';
import { resolveAddClientAccess, subscriptionCheckErrorMessage } from '../utils/premiumOffer';

/**
 * Add Client entries call this. When the subscription hard limit is on, unpaid
 * coaches open the paywall and paid coaches open the wizard. A failed check
 * stays on the current screen. When the limit is off, Add Client opens directly.
 */
export function useOpenAddClient() {
  const navigation = useNavigation<NativeStackNavigationProp<DashboardStackParamList>>();
  const queryClient = useQueryClient();
  const [checkingSubscription, setCheckingSubscription] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const checkingRef = useRef(false);

  const openAddClient = useCallback(
    async (params?: { returnTo?: NavigationReturnTo }) => {
      setSubscriptionError(null);
      if (!isSubscriptionRequired()) {
        navigation.navigate('AddClient', params);
        return;
      }
      if (checkingRef.current) return;
      checkingRef.current = true;
      setCheckingSubscription(true);
      try {
        const offer = await queryClient.fetchQuery({
          queryKey: queryKeys.coachPremium,
          queryFn: ({ signal }) => getCoachPremiumOffer(signal),
          staleTime: 0,
        });
        if (resolveAddClientAccess(true, offer.isPaid) === 'wizard') {
          navigation.navigate('AddClient', params);
        } else {
          navigation.navigate('Premium', params);
        }
      } catch (err) {
        setSubscriptionError(subscriptionCheckErrorMessage(err));
      } finally {
        checkingRef.current = false;
        setCheckingSubscription(false);
      }
    },
    [navigation, queryClient],
  );

  return { openAddClient, checkingSubscription, subscriptionError };
}
