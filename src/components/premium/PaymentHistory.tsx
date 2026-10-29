import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  Colors,
  IconSize,
  Radius,
  Shadow,
  Spacing,
  Typography,
  headingFont,
} from '../../constants/theme';
import {
  formatInr,
  formatSubscriptionDate,
  subscriptionPeriodLabel,
  type PaymentHistoryItem,
} from '../../utils/premiumOffer';

/** Past payments, newest first. Renders nothing when there are none. */
export default function PaymentHistory({ items }: { items: PaymentHistoryItem[] }) {
  if (items.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerIconWrapper}>
          <Ionicons name="receipt-outline" size={IconSize.md} color={Colors.secondary} />
        </View>
        <Text style={styles.title}>Payment History</Text>
      </View>

      <View style={styles.list}>
        {items.map((item, index) => {
          const orderedDate = formatSubscriptionDate(item.orderedOn);
          const start = formatSubscriptionDate(item.periodStart);
          const end = formatSubscriptionDate(item.periodEnd);
          const plan = item.planName || subscriptionPeriodLabel(item.durationMonths) || 'Premium';
          const periodText =
            start && end ? `${start} – ${end}` : orderedDate ? `Paid on ${orderedDate}` : null;
          const isRefunded = item.status === 'refunded';
          const isRefunding = item.status === 'refunding';

          return (
            <View
              key={item.orderId || index}
              style={[styles.itemCard, index > 0 && styles.itemSpacing]}
              accessible
              accessibilityLabel={`${plan}, ${formatInr(item.amount)}`}
            >
              {/* Top Row: Plan Title + Status Badge + Amount */}
              <View style={styles.topRow}>
                <View style={styles.planInfo}>
                  <Text style={styles.planTitle}>{plan}</Text>
                  {isRefunded ? (
                    <View style={[styles.statusBadge, styles.statusRefunded]}>
                      <Text style={styles.statusRefundedText}>Refunded</Text>
                    </View>
                  ) : isRefunding ? (
                    <View style={[styles.statusBadge, styles.statusRefunding]}>
                      <Text style={styles.statusRefundingText}>Refunding</Text>
                    </View>
                  ) : (
                    <View style={[styles.statusBadge, styles.statusPaid]}>
                      <Ionicons name="checkmark-circle" size={12} color={Colors.secondary} />
                      <Text style={styles.statusPaidText}>Paid</Text>
                    </View>
                  )}
                </View>

                <Text style={[styles.amount, isRefunded && styles.amountRefunded]}>
                  {formatInr(item.amount)}
                </Text>
              </View>

              {/* Date / Validity Row */}
              {periodText ? (
                <View style={styles.dateRow}>
                  <Ionicons name="calendar-outline" size={13} color={Colors.textLight} />
                  <Text style={styles.dateText}>{periodText}</Text>
                </View>
              ) : null}

              {/* Bottom Tags: Reference + Promo */}
              {item.paymentReference || item.promoCode ? (
                <View style={styles.tagsRow}>
                  {item.paymentReference ? (
                    <View style={styles.refPill}>
                      <Text style={styles.refPillLabel}>Ref:</Text>
                      <Text style={styles.refPillValue} numberOfLines={1}>
                        {item.paymentReference}
                      </Text>
                    </View>
                  ) : null}

                  {item.promoCode ? (
                    <View style={styles.promoPill}>
                      <Ionicons name="pricetag-outline" size={11} color="#b45309" />
                      <Text style={styles.promoPillText}>{item.promoCode}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  headerIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.headline,
    fontSize: 16,
    lineHeight: 22,
    color: Colors.textDark,
  },
  list: {
    gap: Spacing.xs,
  },
  itemCard: {
    backgroundColor: '#f9fbf9',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#e5ece7',
    padding: Spacing.sm + 2,
  },
  itemSpacing: {
    marginTop: Spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  planInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexShrink: 1,
  },
  planTitle: {
    ...Typography.bodyStrong,
    fontSize: 15,
    color: Colors.textDark,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  statusPaid: {
    backgroundColor: Colors.secondaryLight,
  },
  statusPaidText: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: Colors.secondaryDark,
  },
  statusRefunding: {
    backgroundColor: Colors.accentLight,
  },
  statusRefundingText: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: '#996500',
  },
  statusRefunded: {
    backgroundColor: Colors.destructiveSoft,
  },
  statusRefundedText: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: Colors.destructive,
  },
  amount: {
    fontFamily: headingFont.bold,
    fontSize: 15,
    lineHeight: 20,
    color: Colors.textDark,
  },
  amountRefunded: {
    color: Colors.textLight,
    textDecorationLine: 'line-through',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  dateText: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.textLight,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e9efe9',
  },
  refPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#edf2ee',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    maxWidth: 200,
  },
  refPillLabel: {
    ...Typography.caption,
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textLight,
  },
  refPillValue: {
    ...Typography.caption,
    fontSize: 11,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    color: Colors.textDark,
  },
  promoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  promoPillText: {
    ...Typography.caption,
    fontSize: 10,
    fontWeight: '600',
    color: '#b45309',
  },
});
