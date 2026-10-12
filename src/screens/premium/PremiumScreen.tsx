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

import { getCoachPremiumPlans } from '../../api/coachApi';
import { queryKeys } from '../../api/queryKeys';
import { getCurrentCoachCode, getCurrentCoachId } from '../../auth/session';
import WaveScreenHeader from '../../components/WaveScreenHeader';
import ReloadState from '../../components/ReloadState';
import FormErrorBanner from '../../components/FormErrorBanner';
import { openPaymentUrl } from '../../utils/support';
import { navigateBack } from '../../utils/navigationBack';
import { refreshControlTheme, useRefreshControl } from '../../hooks/useRefreshControl';
import { BrandImages, PREMIUM_HERO_ASPECT } from '../../constants/images';
import {
  buildCoachPaymentUrl,
  defaultPremiumPlan,
  formatInr,
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
  subscriptionMonthLabel,
  type PremiumPlan,
  type SuggestedPromo,
} from '../../utils/premiumOffer';
import { refreshPremiumAfterPayment } from '../../utils/appDeepLink';
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
  onPress,
}: {
  plan: PremiumPlan;
  plans: PremiumPlan[];
  active: boolean;
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
      accessibilityLabel={`${label}, ${monthly} per month`}
    >
      <Text style={[styles.chipText, active && styles.chipTextOn]}>{label}</Text>
      <Text style={[styles.chipPrice, active && styles.chipPriceOn]}>{monthly}</Text>
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
  const refreshControl = useRefreshControl(plansQuery);
  const catalog = plansQuery.data;
  const plans = catalog?.plans ?? [];
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    if (!paidReturn) return;
    refreshPremiumAfterPayment();
    navigation.setParams({ paid: undefined });
  }, [paidReturn, navigation]);
  const selected =
    plans.find(plan => planSelectionKey(plan) === selectedKey) ?? defaultPremiumPlan(plans);
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

  async function payNow() {
    setPayError(null);
    const url = buildCoachPaymentUrl({
      coachId: getCurrentCoachId(),
      coachCode: getCurrentCoachCode(),
    });
    const opened = await openPaymentUrl(url);
    if (!opened) {
      setPayError('The payment page could not be opened. Please try again.');
    }
  }

  return (
    <View style={styles.screen}>
      <WaveScreenHeader title="Subscription" onBack={() => navigateBack(navigation, returnTo)} />

      {plansQuery.isPending && !catalog ? (
        <ActivityIndicator color={Colors.secondary} style={styles.loader} />
      ) : plansQuery.isError && !catalog ? (
        <ReloadState
          title="Could not load your subscription"
          message={premiumPlansErrorMessage(plansQuery.error)}
          onRetry={() => void plansQuery.refetch()}
          loading={plansQuery.isFetching}
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

          <View style={styles.hero}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>
                Grow Your Coaching Business with <Text style={styles.heroAccent}>MeraCoach</Text>
              </Text>
              <Text style={styles.heroSubtitle}>
                All the tools you need. One simple plan. No limits. Just focus on your clients.
              </Text>
            </View>
            <HeroPhoto />
          </View>

          <View style={styles.card}>
            <View style={styles.cardHead}>
              <FontAwesome5 name="crown" size={IconSize.sm} color={Colors.accent} solid />
              <Text style={styles.cardTitle}>MeraCoach Premium</Text>
            </View>

            {plans.length > 1 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chips}
              >
                {plans.map(plan => {
                  const key = planSelectionKey(plan);
                  const active = selected != null && planSelectionKey(selected) === key;
                  return (
                    <PlanOption
                      key={key}
                      plan={plan}
                      plans={plans}
                      active={active}
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
              <Text style={styles.emptyPricing}>Pricing will show here once a plan is active.</Text>
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

            {catalog?.promo ? <PromoBox promo={catalog.promo} /> : null}

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
                ? `Pay Now, ${selected.planName}, ${formatInr(selected.finalPrice)}. Opens the secure payment page.`
                : 'Pay Now. Opens the secure payment page.'
            }
          >
            <Ionicons name="open-outline" size={IconSize.md} color={Colors.white} />
            <Text style={styles.payLabel}>Pay Now</Text>
          </TouchableOpacity>
          <Text style={styles.payHint}>You will be redirected to a secure payment page</Text>
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
});
