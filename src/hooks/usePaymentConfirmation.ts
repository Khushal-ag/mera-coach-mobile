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
 * Checkout happens on the website. `watch(current)` records the subscription as the coach leaves; when the app comes back
 * (or `check()` runs for a `paid=1` link) it re-reads it every few seconds, up to about 30, until it differs.
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
