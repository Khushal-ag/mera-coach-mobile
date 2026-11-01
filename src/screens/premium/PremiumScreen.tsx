import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';

import {
  cancelUpcomingPlan,
  getCoachPaymentHistory,
  getCoachPremiumOffer,
  getCoachPremiumPlans,
} from '../../api/coachApi';
import { getErrorMessage } from '../../api/client';
import { queryKeys } from '../../api/queryKeys';
import { externalPaymentsAllowed } from '../../config/appConfig';
import { refreshPremiumAfterPayment } from '../../utils/appDeepLink';
import { getCurrentCoachCode, getCurrentCoachId, getCurrentCoachName } from '../../auth/session';
import WaveScreenHeader from '../../components/WaveScreenHeader';
import ReloadState from '../../components/ReloadState';
import FormErrorBanner from '../../components/FormErrorBanner';
import AppButton from '../../components/AppButton';
import CurrentPlanCard from '../../components/premium/CurrentPlanCard';
import PaymentHistory from '../../components/premium/PaymentHistory';
import { openPaymentUrl, openSupportEmail } from '../../utils/support';
import { navigateBack } from '../../utils/navigationBack';
import { refreshControlTheme, useQueriesRefreshControl } from '../../hooks/useRefreshControl';
import {
  usePaymentConfirmation,
  type PaymentConfirmation,
} from '../../hooks/usePaymentConfirmation';
import { BrandImages, PREMIUM_HERO_ASPECT } from '../../constants/images';
import {
  buildCoachPaymentUrl,
  defaultPremiumPlan,
  formatInr,
  formatSubscriptionDate,
  isCurrentPlan,
  isRenewalWindow,
  planDiscountOffPercent,
  planMinimumMonths,
  planMonthlyRate,
  planOriginalTermTotal,
  planPayableMonthly,
  planSelectionKey,
  planShowsDiscount,
  planTermTotal,
  premiumPlansErrorMessage,
  premiumPlansRefreshMessage,
  purchasablePlans,
  subscriptionCheckErrorMessage,
  subscriptionMonthLabel,
  type PremiumPlan,
  type SuggestedPromo,
} from '../../utils/premiumOffer';
import type { DashboardStackScreenProps } from '../../types/navigation';
import {
  Colors,
  IconSize,
  PressOpacity,
  Radius,
  ScreenPad,
  Shadow,
  Spacing,
  Typography,
  bodyFont,
  headingFont,
} from '../../constants/theme';
import { appAlert } from '../../utils/appDialog';

/** Keeps the coach portrait from collapsing before the copy is measured. */
const HERO_MIN_HEIGHT = 176;
/** Right-hand crop of the premium hero: the coach, not the open forest. */
const HERO_PHOTO_WIDTH = 148;

const FALLBACK_FEATURES = [
  'Unlimited client management',
  'Unlimited follow-ups and progress tracking',
  'Unlimited coaching packages',
  'Coach profile, gallery, photos and videos',
  'All MeraCoach features included',
] as const;

function chipLabel(plan: PremiumPlan, plans: PremiumPlan[]): string {
  const name = plan.planName.trim();
  const sharedName = plans.filter(item => item.planName.trim() === name).length > 1;
  if (!name || name.toLowerCase() === 'premium' || sharedName) {
    return subscriptionMonthLabel(planMinimumMonths(plan));
  }
  return name;
}

function planRateLabel(plan: PremiumPlan): string {
  const payable = formatInr(planPayableMonthly(plan));
  if (!planShowsDiscount(plan)) return `${payable} per month`;
  const original = formatInr(planMonthlyRate(plan));
  const off = planDiscountOffPercent(plan);
  const struck = `${original} struck through, ${payable} per month`;
  return off != null ? `${struck}, ${off}% off` : struck;
}

function PlanOption({
  plan,
  plans,
  active,
  current = false,
  onPress,
}: {
  plan: PremiumPlan;
  plans: PremiumPlan[];
  active: boolean;
  /** The plan the coach is on now, offered again because it is close to ending. */
  current?: boolean;
  onPress: () => void;
}) {
  const label = chipLabel(plan, plans);
  const monthly = formatInr(planPayableMonthly(plan));
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipOn]}
      onPress={onPress}
      activeOpacity={PressOpacity.default}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label}, ${monthly} per month${current ? ', your current plan' : ''}`}
    >
      <Text style={[styles.chipText, active && styles.chipTextOn]}>{label}</Text>
      <Text style={[styles.chipPrice, active && styles.chipPriceOn]}>{monthly}</Text>
      {current ? <Text style={[styles.chipTag, active && styles.chipTextOn]}>Current</Text> : null}
    </TouchableOpacity>
  );
}

function HeroPhoto() {
  const [frameHeight, setFrameHeight] = useState(0);
  const width = frameHeight > 0 ? frameHeight * PREMIUM_HERO_ASPECT : 0;
  return (
    <View
      style={styles.heroPhotoFrame}
      onLayout={event => {
        const next = Math.round(event.nativeEvent.layout.height);
        setFrameHeight(current => (current === next ? current : next));
      }}
    >
      {width > 0 ? (
        <Image
          source={BrandImages.premiumHero}
          style={[styles.heroPhoto, { width, height: frameHeight }]}
          resizeMode="cover"
          accessible={false}
          accessibilityIgnoresInvertColors
        />
      ) : null}
    </View>
  );
}

function Notice({
  state,
  endsOn,
  onDismiss,
}: {
  state: PaymentConfirmation;
  endsOn: string | null;
  onDismiss: () => void;
}) {
  if (state === 'idle') return null;
  const busy = state === 'confirming';
  const text = busy
    ? 'Confirming your payment...'
    : state === 'confirmed'
      ? endsOn
        ? `Payment received. Your plan is active until ${endsOn}.`
        : 'Payment received. Your plan is active.'
      : 'No new payment found yet. If you just paid, pull down to refresh in a moment.';
  return (
    <View
      style={[styles.notice, state === 'timeout' && styles.noticeWarn]}
      accessibilityLiveRegion="polite"
    >
      {busy ? (
        <ActivityIndicator color={Colors.secondary} />
      ) : (
        <Ionicons
          name={state === 'confirmed' ? 'checkmark-circle' : 'time-outline'}
          size={IconSize.lg}
          color={state === 'confirmed' ? Colors.secondary : Colors.primary}
        />
      )}
      <Text style={styles.noticeText}>{text}</Text>
      {busy ? null : (
        <TouchableOpacity
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={IconSize.md} color={Colors.textLight} />
        </TouchableOpacity>
      )}
    </View>
  );
}

/** Where this app may not take payments (see externalPaymentsAllowed): the status, and nothing to buy. */
function StatusOnlyCard({
  expired,
  endsOn,
  onContactSupport,
}: {
  expired: boolean;
  endsOn: string | null;
  onContactSupport: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <FontAwesome5 name="crown" size={IconSize.sm} color={Colors.accent} solid />
        <Text style={styles.cardTitle}>MeraCoach Premium</Text>
      </View>
      <Text style={styles.statusLine}>
        {expired
          ? endsOn
            ? `Your plan ended on ${endsOn}.`
            : 'Your plan has ended.'
          : 'You do not have an active subscription.'}
      </Text>
      <Text style={styles.payHint}>
        Subscriptions cannot be started or renewed in this app. For questions about your account,
        contact support.
      </Text>
      <AppButton
        label="Contact support"
        variant="secondary"
        size="compact"
        onPress={onContactSupport}
        style={styles.backToPlan}
      />
    </View>
  );
}

function PromoBox({ promo }: { promo: SuggestedPromo }) {
  return (
    <View style={styles.promo}>
      <View style={styles.promoIcon}>
        <Ionicons name="gift-outline" size={IconSize.lg} color={Colors.secondary} />
      </View>
      <View style={styles.promoCopy}>
        <Text style={styles.promoText}>
          Use promo code <Text style={styles.promoCode}>{promo.code}</Text> to get early access
          discount!
        </Text>
        <Text style={styles.promoCaption}>Limited period offer.</Text>
      </View>
    </View>
  );
}

export default function PremiumScreen({ navigation, route }: DashboardStackScreenProps<'Premium'>) {
  const returnTo = route.params?.returnTo;
  const paidReturn = route.params?.paid === '1';
  const plansQuery = useQuery({
    queryKey: queryKeys.coachPremiumPlans,
    queryFn: ({ signal }) => getCoachPremiumPlans(signal),
    staleTime: 0,
    // After browser checkout, returning to this screen should pick up the new period.
    refetchOnWindowFocus: true,
  });
  // Same cache entry as Profile. Returning from checkout refreshes it, which is what flips this screen to "active".
  const offerQuery = useQuery({
    queryKey: queryKeys.coachPremium,
    queryFn: ({ signal }) => getCoachPremiumOffer(signal),
    staleTime: 0,
  });
  // Past payments are a convenience: when they fail to load the rest of the screen still works.
  const historyQuery = useQuery({
    queryKey: queryKeys.coachPremiumHistory,
    queryFn: ({ signal }) => getCoachPaymentHistory(signal),
    staleTime: 0,
  });
  const refreshControl = useQueriesRefreshControl([plansQuery, offerQuery, historyQuery]);
  const payment = usePaymentConfirmation(offerQuery);
  const catalog = plansQuery.data;
  const plans = catalog?.plans ?? [];
  const subscription = offerQuery.data?.subscription ?? null;
  const isActive = subscription?.status === 'active';
  const [choosing, setChoosing] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelDone, setCancelDone] = useState<string | null>(null);
  const paymentsAllowed = externalPaymentsAllowed();

  const checkPayment = payment.check;
  useEffect(() => {
    if (!paidReturn) return;
    void checkPayment();
    navigation.setParams({ paid: undefined });
  }, [paidReturn, navigation, checkPayment]);

  // An active coach does not buy the plan they already have: they see it, and may pick a different one that follows it.
  const renewSoon = isRenewalWindow(subscription);
  const selectable = isActive ? purchasablePlans(plans, subscription) : plans;
  // Without the subscription we cannot tell an active coach from a new one, and must not offer a second purchase.
  const subscriptionUnknown = offerQuery.isError && !offerQuery.data;
  const showPlans = paymentsAllowed && (!isActive || (choosing && payment.state !== 'confirmed'));
  const endsOn = formatSubscriptionDate(subscription?.expiresOn);
  const selected =
    selectable.find(plan => planSelectionKey(plan) === selectedKey) ??
    defaultPremiumPlan(selectable);
  const minimumMonths = selected ? planMinimumMonths(selected) : 0;
  const monthLabel = selected ? subscriptionMonthLabel(minimumMonths) : '';
  const monthly = selected ? planPayableMonthly(selected) : 0;
  const termTotal = selected ? planTermTotal(selected) : 0;
  const discounted = selected ? planShowsDiscount(selected) : false;
  const offPercent = selected ? planDiscountOffPercent(selected) : null;
  const originalMonthly = selected ? planMonthlyRate(selected) : 0;
  const originalTerm = selected ? planOriginalTermTotal(selected) : 0;
  const features =
    selected?.features && selected.features.length > 0
      ? selected.features
      : catalog?.features && catalog.features.length > 0
        ? catalog.features
        : FALLBACK_FEATURES;

  function confirmCancelNext() {
    const next = subscription?.next;
    if (!next) return;
    const name = next.planName || 'your next plan';
    const amount = next.amount > 0 ? formatInr(next.amount) : 'What you paid';
    appAlert(
      `Cancel ${name}?`,
      `${amount} will be refunded to your original payment method. Your current plan stays active${
        endsOn ? ` until ${endsOn}` : ''
      }. This cannot be undone.`,
      [
        { text: 'Keep plan', style: 'cancel' },
        { text: 'Cancel plan', style: 'destructive', onPress: () => void runCancelNext() },
      ],
    );
  }

  async function runCancelNext() {
    setCancelling(true);
    setCancelError(null);
    setCancelDone(null);
    try {
      const result = await cancelUpcomingPlan();
      refreshPremiumAfterPayment();
      await offerQuery.refetch();
      setCancelDone(
        result.refundAmount > 0
          ? `Plan cancelled. ${formatInr(result.refundAmount)} is on its way back to your original payment method.`
          : 'Plan cancelled. Your refund is on its way back to your original payment method.',
      );
    } catch (error) {
      setCancelError(getErrorMessage(error, 'The plan could not be cancelled. Please try again.'));
    } finally {
      setCancelling(false);
    }
  }

  async function payNow() {
    setPayError(null);
    const url = buildCoachPaymentUrl({
      coachId: getCurrentCoachId(),
      coachCode: getCurrentCoachCode(),
      coachName: getCurrentCoachName(),
      planId: selected?.planId,
    });
    payment.watch(subscription);
    const opened = await openPaymentUrl(url);
    if (!opened) {
      setPayError('The payment page could not be opened. Please try again.');
    }
  }

  return (
    <View style={styles.screen}>
      <WaveScreenHeader title="Subscription" onBack={() => navigateBack(navigation, returnTo)} />

      {(plansQuery.isPending && !catalog) || (offerQuery.isPending && !offerQuery.data) ? (
        <ActivityIndicator color={Colors.secondary} style={styles.loader} />
      ) : (plansQuery.isError && !catalog) || subscriptionUnknown ? (
        <ReloadState
          title="Could not load your subscription"
          message={
            subscriptionUnknown
              ? subscriptionCheckErrorMessage(offerQuery.error)
              : premiumPlansErrorMessage(plansQuery.error)
          }
          onRetry={() => void Promise.all([plansQuery.refetch(), offerQuery.refetch()])}
          loading={plansQuery.isFetching || offerQuery.isFetching}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshControl.refreshing}
              onRefresh={refreshControl.onRefresh}
              {...refreshControlTheme}
            />
          }
        >
          <FormErrorBanner message={premiumPlansRefreshMessage(refreshControl.refreshError)} />

          <Notice state={payment.state} endsOn={endsOn} onDismiss={payment.dismiss} />
          <FormErrorBanner message={cancelError} />
          {cancelDone ? (
            <View style={styles.notice} accessibilityLiveRegion="polite">
              <Ionicons name="checkmark-circle" size={IconSize.lg} color={Colors.secondary} />
              <Text style={styles.noticeText}>{cancelDone}</Text>
            </View>
          ) : null}
          {subscription?.status === 'expired' && showPlans ? (
            <View style={styles.notice}>
              <Ionicons name="time-outline" size={IconSize.lg} color={Colors.primary} />
              <Text style={styles.noticeText}>
                {endsOn ? `Your plan ended on ${endsOn}.` : 'Your plan has ended.'}
                {paymentsAllowed ? ' Choose a plan to continue.' : ''}
              </Text>
            </View>
          ) : null}

          {!paymentsAllowed && !isActive ? (
            <StatusOnlyCard
              expired={subscription?.status === 'expired'}
              endsOn={endsOn}
              onContactSupport={() => void openSupportEmail('Mera Coach subscription')}
            />
          ) : !showPlans && subscription ? (
            <CurrentPlanCard
              subscription={subscription}
              features={
                catalog?.features && catalog.features.length > 0
                  ? catalog.features
                  : FALLBACK_FEATURES
              }
              renewSoon={renewSoon}
              changeOpensOn={
                subscription.hasUpcomingPlan
                  ? formatSubscriptionDate(subscription.renewalOpensOn)
                  : null
              }
              onCancelNext={subscription.canCancelUpcomingPlan ? confirmCancelNext : undefined}
              cancellingNext={cancelling}
              onChangePlan={
                paymentsAllowed && selectable.length > 0
                  ? () => {
                      payment.dismiss();
                      setChoosing(true);
                    }
                  : undefined
              }
              onContactSupport={() => void openSupportEmail('Mera Coach subscription')}
            />
          ) : (
            <>
              {!isActive ? (
                <View style={styles.hero}>
                  <View style={styles.heroCopy}>
                    <Text style={styles.heroTitle}>
                      Grow Your Coaching Business with{' '}
                      <Text style={styles.heroAccent}>MeraCoach</Text>
                    </Text>
                    <Text style={styles.heroSubtitle}>
                      All the tools you need. One simple plan. No limits. Just focus on your
                      clients.
                    </Text>
                  </View>
                  <HeroPhoto />
                </View>
              ) : null}

              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <FontAwesome5 name="crown" size={IconSize.sm} color={Colors.accent} solid />
                  <Text style={styles.cardTitle}>
                    {isActive
                      ? renewSoon
                        ? 'Renew or change plan'
                        : 'Choose your next plan'
                      : 'MeraCoach Premium'}
                  </Text>
                </View>

                {selectable.length > 1 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chips}
                  >
                    {selectable.map(plan => {
                      const key = planSelectionKey(plan);
                      const active = selected != null && planSelectionKey(selected) === key;
                      return (
                        <PlanOption
                          key={key}
                          plan={plan}
                          plans={selectable}
                          active={active}
                          current={isActive && isCurrentPlan(plan, subscription)}
                          onPress={() => setSelectedKey(key)}
                        />
                      );
                    })}
                  </ScrollView>
                ) : null}

                {selected ? (
                  <>
                    <View
                      style={styles.priceRow}
                      accessible
                      accessibilityLabel={planRateLabel(selected)}
                    >
                      {discounted ? (
                        <Text style={styles.priceStrike}>{formatInr(originalMonthly)}</Text>
                      ) : null}
                      <Text style={styles.price}>{formatInr(monthly)}</Text>
                      <Text style={styles.perMonth}>/ month</Text>
                      {offPercent != null ? (
                        <View style={styles.offPill}>
                          <Text style={styles.offPillText}>{offPercent}% off</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.minimum}>Minimum subscription: {monthLabel}</Text>
                  </>
                ) : (
                  <Text style={styles.emptyPricing}>
                    Pricing will show here once a plan is active.
                  </Text>
                )}

                <View style={styles.features}>
                  {features.map(feature => (
                    <View key={feature} style={styles.featureRow}>
                      <View style={styles.check}>
                        <Ionicons name="checkmark" size={IconSize.xs} color={Colors.white} />
                      </View>
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                {catalog?.promo && !isActive ? <PromoBox promo={catalog.promo} /> : null}

                {selected ? (
                  <View
                    style={styles.payment}
                    accessible
                    accessibilityLabel={
                      discounted
                        ? `Minimum payment, ${monthLabel}. Original ${formatInr(originalTerm)}, ${formatInr(monthly)} times ${monthLabel}, total ${formatInr(termTotal)}`
                        : `Minimum payment, ${monthLabel}. ${formatInr(monthly)} times ${monthLabel}, total ${formatInr(termTotal)}`
                    }
                  >
                    <Text style={styles.paymentTitle}>Minimum payment ({monthLabel})</Text>
                    {discounted ? (
                      <Text style={styles.paymentStrike}>{formatInr(originalTerm)}</Text>
                    ) : null}
                    <Text style={styles.paymentFormula}>
                      {formatInr(monthly)} × {monthLabel}
                    </Text>
                    <Text style={styles.paymentTotal}>{formatInr(termTotal)}</Text>
                    <Text style={styles.tax}>Applicable taxes are added at checkout.</Text>
                  </View>
                ) : null}
              </View>

              <FormErrorBanner message={payError} />
              <TouchableOpacity
                style={styles.payBtn}
                onPress={() => void payNow()}
                activeOpacity={PressOpacity.default}
                accessibilityRole="button"
                accessibilityLabel={
                  selected
                    ? `${isActive ? 'Continue to payment' : 'Pay Now'}, ${selected.planName}, ${formatInr(selected.finalPrice)}. Opens the secure payment page.`
                    : 'Pay Now. Opens the secure payment page.'
                }
              >
                <Ionicons name="open-outline" size={IconSize.md} color={Colors.white} />
                <Text style={styles.payLabel}>
                  {isActive
                    ? 'Continue to payment'
                    : subscription?.status === 'expired'
                      ? 'Renew now'
                      : 'Pay Now'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.payHint}>
                {isActive
                  ? 'The new plan starts after your current plan ends. You will be redirected to a secure payment page'
                  : 'You will be redirected to a secure payment page'}
              </Text>
              {isActive ? (
                <AppButton
                  label="Back to my plan"
                  variant="ghost"
                  size="compact"
                  onPress={() => setChoosing(false)}
                  style={styles.backToPlan}
                />
              ) : null}
            </>
          )}

          <PaymentHistory items={historyQuery.data ?? []} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.secondaryLight,
  },
  loader: { marginTop: Spacing.xl },
  content: {
    paddingHorizontal: ScreenPad.horizontal,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.lg + ScreenPad.tabBarClearance,
    gap: Spacing.sm,
  },
  hero: {
    minHeight: HERO_MIN_HEIGHT,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.headerGradientBottom,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  heroPhotoFrame: {
    width: HERO_PHOTO_WIDTH,
    overflow: 'hidden',
    backgroundColor: Colors.headerGradientBottom,
  },
  heroPhoto: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  heroCopy: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.sm,
  },
  heroTitle: {
    fontFamily: headingFont.bold,
    fontSize: 16,
    lineHeight: 21,
    color: Colors.white,
  },
  heroAccent: {
    fontFamily: headingFont.extraBold,
    color: Colors.accent,
  },
  heroSubtitle: {
    fontFamily: bodyFont.regular,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.onDarkBright,
    marginTop: Spacing.xxs,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    ...Shadow.md,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  cardTitle: {
    ...Typography.headline,
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  chips: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingTop: Spacing.sm,
  },
  chip: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: 2,
  },
  chipOn: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  chipText: {
    ...Typography.label,
    color: Colors.textDark,
  },
  chipTextOn: {
    color: Colors.white,
  },
  chipTag: {
    ...Typography.caption,
    fontSize: 11,
    lineHeight: 14,
  },
  chipPrice: {
    fontFamily: headingFont.bold,
    fontSize: 15,
    lineHeight: 20,
    color: Colors.textDark,
  },
  chipPriceOn: {
    color: Colors.white,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  priceStrike: {
    fontFamily: bodyFont.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: Colors.textLight,
    textDecorationLine: 'line-through',
  },
  price: {
    fontFamily: headingFont.extraBold,
    fontSize: 34,
    lineHeight: 40,
    color: Colors.textDark,
  },
  perMonth: {
    fontFamily: bodyFont.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: Colors.primary,
  },
  offPill: {
    alignSelf: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  offPillText: {
    color: Colors.primary,
    fontFamily: bodyFont.bold,
    fontSize: 11,
    lineHeight: 14,
  },
  minimum: {
    ...Typography.body,
    color: Colors.textLight,
    marginTop: 2,
  },
  emptyPricing: {
    ...Typography.body,
    color: Colors.textLight,
    marginTop: Spacing.sm,
  },
  features: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  check: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  featureText: {
    ...Typography.body,
    flex: 1,
  },
  promo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.metricClientsBg,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginTop: Spacing.md,
  },
  promoIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoCopy: { flex: 1 },
  promoText: {
    ...Typography.body,
    color: Colors.textDark,
  },
  promoCaption: {
    ...Typography.caption,
    marginTop: 2,
  },
  promoCode: {
    fontFamily: bodyFont.bold,
    color: Colors.secondary,
  },
  payment: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  paymentTitle: {
    ...Typography.bodyStrong,
  },
  paymentStrike: {
    ...Typography.body,
    color: Colors.textLight,
    textDecorationLine: 'line-through',
    marginTop: Spacing.xxs,
  },
  paymentFormula: {
    ...Typography.body,
    marginTop: Spacing.xxs,
  },
  paymentTotal: {
    fontFamily: headingFont.bold,
    fontSize: 18,
    lineHeight: 24,
    color: Colors.textDark,
    marginTop: 2,
  },
  tax: {
    ...Typography.caption,
    marginTop: Spacing.xxs,
  },
  payBtn: {
    minHeight: 52,
    borderRadius: Radius.pill,
    backgroundColor: Colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
    ...Shadow.md,
  },
  payLabel: {
    color: Colors.white,
    fontFamily: headingFont.semibold,
    fontSize: 18,
    lineHeight: 24,
  },
  payHint: {
    ...Typography.caption,
    textAlign: 'center',
  },
  backToPlan: { alignSelf: 'center' },
  statusLine: { ...Typography.bodyStrong, marginTop: Spacing.md },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.metricClientsBg,
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },
  noticeWarn: { backgroundColor: Colors.primaryLight },
  noticeText: { ...Typography.body, flex: 1 },
});
