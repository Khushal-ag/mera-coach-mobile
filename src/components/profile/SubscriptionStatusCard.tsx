import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AppButton from '../AppButton';
import { externalPaymentsAllowed } from '../../config/appConfig';
import FormErrorBanner from '../FormErrorBanner';
import {
  Colors,
  IconSize,
  Radius,
  Shadow,
  Spacing,
  Typography,
  headingFont,
} from '../../constants/theme';
import type { IoniconName } from '../../types/icons';
import {
  formatInr,
  formatSubscriptionDate,
  isRenewalWindow,
  subscriptionDaysLeft,
  subscriptionDaysLeftLabel,
  subscriptionPeriodLabel,
  type CoachSubscription,
  type SubscriptionStatus,
} from '../../utils/premiumOffer';

type SubscriptionStatusCardProps = {
  subscription: CoachSubscription | null;
  loading: boolean;
  errorMessage: string | null;
  retrying?: boolean;
  onRetry: () => void;
  /** True when unpaid coaches are blocked from adding a client. */
  subscriptionRequired: boolean;
  onManage: () => void;
};

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  none: 'Not subscribed',
  active: 'Active',
  expired: 'Expired',
};

const STATUS_ICON: Record<SubscriptionStatus, IoniconName> = {
  none: 'card-outline',
  active: 'checkmark-circle-outline',
  expired: 'time-outline',
};

function headline(subscription: CoachSubscription, period: string): string {
  if (subscription.status === 'none') return 'No active subscription';
  if (subscription.planName) return subscription.planName;
  if (period) return period;
  return subscription.status === 'expired' ? 'Subscription ended' : 'Active subscription';
}

function actionLabel(status: SubscriptionStatus, renewSoon = false, canBuy = true): string {
  if (!canBuy) return status === 'active' ? 'Manage' : 'Details';
  if (status === 'expired') return 'Renew';
  if (status === 'active') return renewSoon ? 'Renew' : 'Manage';
  return 'View plans';
}

export default function SubscriptionStatusCard({
  subscription,
  loading,
  errorMessage,
  retrying = false,
  onRetry,
  subscriptionRequired,
  onManage,
}: SubscriptionStatusCardProps) {
  if (loading && !subscription) {
    return (
      <View style={styles.card} accessibilityLabel="Loading your subscription">
        <ActivityIndicator color={Colors.secondary} />
        <Text style={styles.loading}>Loading your subscription</Text>
      </View>
    );
  }

  if (errorMessage && !subscription) {
    return (
      <View style={styles.card}>
        <FormErrorBanner message={errorMessage} />
        <AppButton
          label="Try again"
          size="compact"
          variant="secondary"
          onPress={onRetry}
          loading={retrying}
          accessibilityLabel="Try loading your subscription again"
        />
      </View>
    );
  }

  if (!subscription) return null;

  const period = subscriptionPeriodLabel(subscription.durationMonths);
  const title = headline(subscription, period);
  const started = formatSubscriptionDate(subscription.startedOn);
  const ends = formatSubscriptionDate(subscription.expiresOn);
  const daysLabel =
    subscription.status === 'active'
      ? subscriptionDaysLeftLabel(subscriptionDaysLeft(subscription.expiresOn))
      : null;
  const rows: { label: string; value: string }[] = [];
  if (subscription.amount > 0) rows.push({ label: 'Price', value: formatInr(subscription.amount) });
  if (period) rows.push({ label: 'Period', value: period });
  if (started) rows.push({ label: 'Started on', value: started });
  if (ends) {
    rows.push({
      label: subscription.status === 'expired' ? 'Expired on' : 'Expires on',
      value: ends,
    });
  }
  if (subscription.next) {
    const nextStarts = formatSubscriptionDate(subscription.next.startsOn);
    const nextName =
      subscription.next.planName || subscriptionPeriodLabel(subscription.next.durationMonths);
    rows.push({
      label: 'Up next',
      value: nextStarts ? `${nextName} from ${nextStarts}` : nextName,
    });
  }

  const missingClients =
    subscription.status === 'none' && subscriptionRequired
      ? 'You cannot add a client until you subscribe.'
      : null;
  const endedCopy =
    subscription.status === 'expired'
      ? ends
        ? `This plan ended on ${ends}.`
        : 'This plan has ended.'
      : null;
  const showBilling = subscription.status === 'active' || subscription.status === 'expired';
  const iconTone = {
    none: styles.iconNone,
    active: styles.iconActive,
    expired: styles.iconExpired,
  }[subscription.status];
  const chipTone = {
    none: styles.chipNone,
    active: styles.chipActive,
    expired: styles.chipExpired,
  }[subscription.status];
  const chipTextTone = {
    none: styles.chipTextNone,
    active: styles.chipTextActive,
    expired: styles.chipTextExpired,
  }[subscription.status];

  return (
    <View
      style={styles.card}
      accessibilityRole="summary"
      accessibilityLabel={`Subscription, ${title}`}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, iconTone]}>
          <Ionicons
            name={STATUS_ICON[subscription.status]}
            size={IconSize.lg}
            color={subscription.status === 'expired' ? Colors.primary : Colors.headerGradientBottom}
          />
        </View>
        <Text style={styles.title}>{title}</Text>
        <View style={[styles.chip, chipTone]}>
          <Text style={[styles.chipText, chipTextTone]}>{STATUS_LABEL[subscription.status]}</Text>
        </View>
      </View>

      {missingClients ? <Text style={styles.body}>{missingClients}</Text> : null}
      {endedCopy ? <Text style={styles.body}>{endedCopy}</Text> : null}

      {rows.length > 0 ? (
        <View style={styles.rows}>
          {rows.map(row => (
            <View key={row.label} style={styles.row}>
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Text style={styles.rowValue}>{row.value}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {daysLabel ? <Text style={styles.days}>{daysLabel}</Text> : null}

      {showBilling ? (
        <Text style={styles.billing}>
          {subscription.status === 'active'
            ? 'Does not renew automatically. Plan changes start after this plan ends.'
            : 'Billing is completed on the secure payment page.'}
        </Text>
      ) : null}

      <AppButton
        label={actionLabel(
          subscription.status,
          isRenewalWindow(subscription),
          externalPaymentsAllowed(),
        )}
        size="compact"
        icon="arrow-forward-outline"
        onPress={onManage}
        style={styles.cta}
        accessibilityLabel={
          subscription.status === 'none'
            ? 'View subscription plans'
            : actionLabel(
                subscription.status,
                isRenewalWindow(subscription),
                externalPaymentsAllowed(),
              )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  loading: {
    ...Typography.caption,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconNone: { backgroundColor: Colors.backgroundTan },
  iconActive: { backgroundColor: Colors.secondaryLight },
  iconExpired: { backgroundColor: Colors.primaryLight },
  title: {
    ...Typography.headline,
    fontFamily: headingFont.extraBold,
    fontSize: 16,
    flex: 1,
  },
  chip: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    flexShrink: 0,
  },
  chipNone: { backgroundColor: Colors.backgroundTan },
  chipActive: { backgroundColor: Colors.secondaryLight },
  chipExpired: { backgroundColor: Colors.primaryLight },
  chipText: {
    fontFamily: headingFont.bold,
    fontSize: 12,
  },
  chipTextNone: { color: Colors.textLight },
  chipTextActive: { color: Colors.headerGradientBottom },
  chipTextExpired: { color: Colors.primary },
  body: {
    ...Typography.body,
    color: Colors.textLight,
    marginTop: Spacing.sm,
  },
  rows: {
    marginTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  rowLabel: {
    ...Typography.caption,
    color: Colors.textLight,
  },
  rowValue: {
    ...Typography.bodyStrong,
    flexShrink: 1,
    textAlign: 'right',
  },
  days: {
    ...Typography.bodyStrong,
    color: Colors.secondary,
    marginTop: Spacing.sm,
  },
  billing: {
    ...Typography.caption,
    color: Colors.textLight,
    marginTop: Spacing.sm,
  },
  cta: {
    marginTop: Spacing.md,
    alignSelf: 'flex-start',
  },
});
