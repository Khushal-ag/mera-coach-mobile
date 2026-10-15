import { Linking } from 'react-native';

import { queryClient } from '../api/queryClient';
import { queryKeys } from '../api/queryKeys';

/** Must match `expo.scheme` in app.json. */
export const APP_SCHEME = 'meracoach';

/** True when a deep link asks the app to refresh subscription after web checkout. */
export function urlSignalsPaidReturn(url: string | null | undefined): boolean {
  if (!url) return false;
  const query = url.split('?')[1];
  if (!query) return false;
  try {
    return new URLSearchParams(query).get('paid') === '1';
  } catch {
    return /(?:^|[&?])paid=1(?:&|$)/.test(`?${query}`);
  }
}

/** Invalidate live subscription caches so Profile / Premium pick up a new period. */
export function refreshPremiumAfterPayment(): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.coachPremium });
  void queryClient.invalidateQueries({ queryKey: queryKeys.coachPremiumPlans });
  // The dashboard validity pill reads ValidUpto from the profile.
  void queryClient.invalidateQueries({ queryKey: queryKeys.coachProfile });
}

/**
 * Listen for `meracoach://…?paid=1` (initial URL + later opens) and refresh premium.
 * Returns an unsubscribe that removes the URL listener.
 */
export function subscribePaidReturnDeepLinks(): () => void {
  const apply = (url: string | null) => {
    if (urlSignalsPaidReturn(url)) refreshPremiumAfterPayment();
  };

  void Linking.getInitialURL().then(apply);
  const sub = Linking.addEventListener('url', ({ url }) => apply(url));
  return () => sub.remove();
}
