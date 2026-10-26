import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';

import AppButton from '../AppButton';
import {
  Colors,
  IconSize,
  Radius,
  Shadow,
  Spacing,
  Typography,
  bodyFont,
  headingFont,
} from '../../constants/theme';
import {
  formatInr,
  formatSubscriptionDate,
  subscriptionDaysLeft,
  subscriptionDaysLeftLabel,
  subscriptionElapsedFraction,
  subscriptionPeriodLabel,
  type CoachSubscription,
} from '../../utils/premiumOffer';

interface CurrentPlanCardProps {
  subscription: CoachSubscription;
  features: readonly string[];
  /** The plan ends soon, so renewing it is offered along with the other plans. */
  renewSoon?: boolean;
  /** Date from which plans can be changed again, shown while a plan is already lined up. */
  changeOpensOn?: string | null;
  /** Cancel the plan lined up next and get a refund. Omit when the API does not offer it. */
  onCancelNext?: () => void;
  cancellingNext?: boolean;
  /** Offer the other plans. Omit when there is nothing else to switch to. */
  onChangePlan?: () => void;
  onContactSupport: () => void;
}

/** What an active coach sees on the Subscription screen instead of the plan picker. */
export default function CurrentPlanCard({
  subscription,
  features,
  renewSoon = false,
  changeOpensOn = null,
  onCancelNext,
  cancellingNext = false,
  onChangePlan,
  onContactSupport,
}: CurrentPlanCardProps) {
  const period = subscriptionPeriodLabel(subscription.durationMonths);
  const title = subscription.planName || period || 'Premium';
  const started = formatSubscriptionDate(subscription.startedOn);
  // With a plan lined up, "ends" for this card is where the current plan stops; access itself runs on to expiresOn.
  const next = subscription.next ?? null;
  const planEnd = next
    ? (subscription.periodEndsOn ?? subscription.expiresOn)
    : subscription.expiresOn;
  const ends = formatSubscriptionDate(planEnd);
  const accessEnds = formatSubscriptionDate(subscription.expiresOn);
  const daysLabel = subscriptionDaysLeftLabel(subscriptionDaysLeft(planEnd));
  const fraction = subscriptionElapsedFraction(subscription.startedOn, planEnd);
  const nextStarts = formatSubscriptionDate(next?.startsOn);
  const nextEnds = formatSubscriptionDate(next?.endsOn);
  const nextPeriod = next ? subscriptionPeriodLabel(next.durationMonths) : '';
  const nextTitle = next ? next.planName || nextPeriod || 'Next plan' : '';
  const summary = [
    period && period !== title ? period : '',
    subscription.amount > 0 ? formatInr(subscription.amount) : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <FontAwesome5 name="crown" size={IconSize.sm} color={Colors.accent} solid />
        <Text style={styles.headTitle}>MeraCoach Premium</Text>
        <View style={styles.chip}>
          <Text style={styles.chipText}>Active</Text>
        </View>
      </View>

      <Text style={styles.plan}>{title}</Text>
      {summary ? <Text style={styles.summary}>{summary}</Text> : null}

      {fraction != null ? (
        <View
          style={styles.track}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={daysLabel ?? 'Subscription period'}
        >
          <View style={[styles.fill, { width: `${Math.max(4, Math.round(fraction * 100))}%` }]} />
        </View>
      ) : null}
      <View style={styles.dates}>
        <View>
          <Text style={styles.dateLabel}>Started</Text>
          <Text style={styles.dateValue}>{started ?? '-'}</Text>
        </View>
        <View style={styles.datesEnd}>
          <Text style={styles.dateLabel}>{next ? 'This plan ends' : 'Valid until'}</Text>
          <Text style={styles.dateValue}>{ends ?? '-'}</Text>
        </View>
      </View>
      {daysLabel ? <Text style={styles.days}>{daysLabel}</Text> : null}

      {next ? (
        <View style={styles.next}>
          <View style={styles.noticeIcon}>
            <Ionicons
              name="arrow-forward-circle-outline"
              size={IconSize.lg}
              color={Colors.secondary}
            />
          </View>
          <View style={styles.noticeCopy}>
            <Text style={styles.noticeTitle}>Up next: {nextTitle}</Text>
            <Text style={styles.noticeText}>
              {[
                nextStarts ? `Starts ${nextStarts}` : '',
                nextEnds ? `ends ${nextEnds}` : '',
                next.amount > 0 ? formatInr(next.amount) : '',
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
        </View>
      ) : null}

      {renewSoon && !next ? (
        <View style={styles.soon} accessibilityLiveRegion="polite">
          <Ionicons name="time-outline" size={IconSize.lg} color={Colors.primary} />
          <Text style={styles.soonText}>
            {daysLabel ? `${daysLabel}. ` : ''}Renew now to keep your access without a break.
          </Text>
        </View>
      ) : null}

      <View style={styles.notice}>
        <View style={styles.noticeIcon}>
          <Ionicons name="shield-checkmark-outline" size={IconSize.lg} color={Colors.secondary} />
        </View>
        <View style={styles.noticeCopy}>
          <Text style={styles.noticeTitle}>No automatic renewal</Text>
          <Text style={styles.noticeText}>
            {accessEnds
              ? `You will not be charged again on your own. Your access ends on ${accessEnds}.`
              : 'You will not be charged again on your own.'}
          </Text>
        </View>
      </View>

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

      {onChangePlan ? (
        <>
          <AppButton
            label={renewSoon ? 'Renew or change plan' : 'Change plan'}
            icon="swap-horizontal-outline"
            onPress={onChangePlan}
            style={styles.change}
            accessibilityLabel="Change plan. The new plan starts after your current plan ends."
          />
          <Text style={styles.changeHint}>
            {renewSoon
              ? 'Renewing adds the new period after your current one ends, so no days are lost.'
              : 'A new plan starts after your current one ends, so you never pay twice for the same days.'}
          </Text>
        </>
      ) : changeOpensOn ? (
        <Text style={[styles.changeHint, styles.change]}>
          Your next plan is already lined up. You can renew or change it from {changeOpensOn}.
        </Text>
      ) : null}

      {next && onCancelNext ? (
        <AppButton
          label="Cancel next plan and get a refund"
          variant="secondary"
          size="compact"
          onPress={onCancelNext}
          loading={cancellingNext}
          style={styles.cancelNext}
          accessibilityLabel={`Cancel ${nextTitle} and get a refund. Your current plan stays active.`}
        />
      ) : null}

      <AppButton
        label="Billing question or refund? Contact support"
        variant="ghost"
        size="compact"
        onPress={onContactSupport}
        style={styles.support}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadow.md,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  headTitle: { ...Typography.headline, flex: 1, fontSize: 16, lineHeight: 22 },
  chip: {
    borderRadius: Radius.pill,
    backgroundColor: Colors.secondaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
  },
  chipText: { fontFamily: headingFont.bold, fontSize: 12, color: Colors.headerGradientBottom },
  plan: {
    fontFamily: headingFont.extraBold,
    fontSize: 28,
    lineHeight: 34,
    color: Colors.textDark,
    marginTop: Spacing.md,
  },
  summary: { ...Typography.body, color: Colors.textLight, marginTop: 2 },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.secondaryLight,
    overflow: 'hidden',
    marginTop: Spacing.md,
  },
  fill: { height: 8, borderRadius: 4, backgroundColor: Colors.secondary },
  dates: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm },
  datesEnd: { alignItems: 'flex-end' },
  dateLabel: { ...Typography.caption },
  dateValue: { ...Typography.bodyStrong },
  days: {
    fontFamily: bodyFont.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.secondary,
    marginTop: Spacing.xs,
  },
  soon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginTop: Spacing.md,
  },
  soonText: { ...Typography.body, flex: 1 },
  next: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginTop: Spacing.md,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.metricClientsBg,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginTop: Spacing.md,
  },
  noticeIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeCopy: { flex: 1 },
  noticeTitle: { ...Typography.bodyStrong },
  noticeText: { ...Typography.caption, marginTop: 2 },
  features: { marginTop: Spacing.md, gap: Spacing.sm },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs },
  check: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  featureText: { ...Typography.body, flex: 1 },
  change: { marginTop: Spacing.lg },
  changeHint: { ...Typography.caption, textAlign: 'center', marginTop: Spacing.xs },
  support: { alignSelf: 'center', marginTop: Spacing.xs },
  cancelNext: { alignSelf: 'center', marginTop: Spacing.sm },
});
