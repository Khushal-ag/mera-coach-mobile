import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { QueryObserverResult } from '@tanstack/react-query';

import { refreshPremiumAfterPayment } from '../utils/appDeepLink';
import { subscriptionFingerprint, type PremiumOffer } from '../utils/premiumOffer';

const POLL_EVERY_MS = 2500;
const MAX_POLLS = 12;

export type PaymentConfirmation = 'idle' | 'confirming' | 'confirmed' | 'timeout';

type OfferQuery = { refetch: () => Promise<QueryObserverResult<PremiumOffer, unknown>> };

/**
 * Website checkout happens outside the app, so the subscription changes while the app is in the background. This
 * watches for that: call `watch(current)` as the coach leaves for checkout, and the next time the app comes back (or
 * `check()` runs for a `paid=1` deep link) it re-reads the subscription every few seconds until the period differs
 * from the one recorded at `watch`, or about 30 seconds pass. The webhook can land a moment after the redirect.
 */
export function usePaymentConfirmation(offerQuery: OfferQuery) {
  const [state, setState] = useState<PaymentConfirmation>('idle');
  const queryRef = useRef(offerQuery);
  const baseline = useRef<string | null>(null);
  const awaiting = useRef(false);
  const run = useRef(0);

  useEffect(() => {
    queryRef.current = offerQuery;
  });

  const check = useCallback(async () => {
    const mine = ++run.current;
    setState('confirming');
    for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
      const result = await queryRef.current.refetch();
      if (mine !== run.current) return;
      const subscription = result.data?.subscription;
      const changed = subscription
        ? baseline.current === null
          ? subscription.status === 'active'
          : subscriptionFingerprint(subscription) !== baseline.current
        : false;
      if (changed) {
        baseline.current = null;
        refreshPremiumAfterPayment();
        setState('confirmed');
        return;
      }
      await new Promise<void>(resolve => setTimeout(resolve, POLL_EVERY_MS));
      if (mine !== run.current) return;
    }
    setState('timeout');
  }, []);

  /** Record the subscription as it is now and expect it to change once the app is reopened. */
  const watch = useCallback((current: Parameters<typeof subscriptionFingerprint>[0]) => {
    baseline.current = subscriptionFingerprint(current);
    awaiting.current = true;
    setState('idle');
  }, []);

  const dismiss = useCallback(() => {
    run.current += 1;
    setState('idle');
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', status => {
      if (status !== 'active' || !awaiting.current) return;
      awaiting.current = false;
      void check();
    });
    return () => {
      sub.remove();
      run.current += 1;
    };
  }, [check]);

  return { state, watch, check, dismiss };
}
