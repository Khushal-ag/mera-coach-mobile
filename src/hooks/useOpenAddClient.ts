import { useCallback, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { getErrorMessage } from '../api/client';
import { getClientList } from '../api/clientApi';
import { getCoachPremiumOffer } from '../api/coachApi';
import { queryKeys } from '../api/queryKeys';
import { getCurrentCoachCode } from '../auth/session';
import { FREE_CLIENT_LIMIT, SUPPORT_EMAIL, isSubscriptionRequired } from '../config/appConfig';
import type { DashboardStackParamList, NavigationReturnTo } from '../types/navigation';
import { appAlert } from '../utils/appDialog';
import { resolveAddClientAccess, subscriptionCheckErrorMessage } from '../utils/premiumOffer';

/**
 * Add Client entries call this. When the subscription hard limit is on, unpaid
 * coaches open the paywall and paid coaches open the wizard. A failed check
 * stays on the current screen. When the limit is off, Add Client opens unless the
 * coach already has FREE_CLIENT_LIMIT clients.
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
      if (checkingRef.current) return;
      checkingRef.current = true;
      setCheckingSubscription(true);
      try {
        if (!isSubscriptionRequired()) {
          const clients = await queryClient.fetchQuery({
            queryKey: queryKeys.clientList(getCurrentCoachCode()),
            queryFn: () => getClientList(),
            staleTime: 0,
          });
          if (clients.length >= FREE_CLIENT_LIMIT) {
            appAlert(
              'Client limit reached',
              `You can add up to ${FREE_CLIENT_LIMIT} clients for now. To add more, write to us at ${SUPPORT_EMAIL}.`,
              undefined,
              { tone: 'info', icon: 'people-outline' },
            );
          } else {
            navigation.navigate('AddClient', params);
          }
          return;
        }
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
        setSubscriptionError(
          isSubscriptionRequired()
            ? subscriptionCheckErrorMessage(err)
            : getErrorMessage(err, 'Could not check your clients. Please try again.'),
        );
      } finally {
        checkingRef.current = false;
        setCheckingSubscription(false);
      }
    },
    [navigation, queryClient],
  );

  return { openAddClient, checkingSubscription, subscriptionError };
}
