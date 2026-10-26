import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Shadow, Spacing, Typography, headingFont } from '../../constants/theme';
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
      <Text style={styles.title}>Payment history</Text>
      {items.map((item, index) => {
        const when = formatSubscriptionDate(item.orderedOn);
        const start = formatSubscriptionDate(item.periodStart);
        const end = formatSubscriptionDate(item.periodEnd);
        const plan = item.planName || subscriptionPeriodLabel(item.durationMonths) || 'Premium';
        const detail = [
          when,
          start && end ? `${start} to ${end}` : '',
          item.paymentReference ? `Ref ${item.paymentReference}` : '',
        ]
          .filter(Boolean)
          .join(' · ');
        return (
          <View
            key={item.orderId}
            style={[styles.row, index > 0 && styles.rowBorder]}
            accessible
            accessibilityLabel={`${plan}, ${formatInr(item.amount)}. ${detail}`}
          >
            <View style={styles.rowCopy}>
              <Text style={styles.plan}>{plan}</Text>
              {detail ? <Text style={styles.detail}>{detail}</Text> : null}
              {item.promoCode ? <Text style={styles.detail}>Promo {item.promoCode}</Text> : null}
            </View>
            <View style={styles.amountCol}>
              <Text style={[styles.amount, item.status === 'refunded' && styles.amountRefunded]}>
                {formatInr(item.amount)}
              </Text>
              {item.status !== 'paid' ? (
                <Text style={styles.statusTag}>
                  {item.status === 'refunded' ? 'Refunded' : 'Refund in progress'}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  title: { ...Typography.headline, fontSize: 16, lineHeight: 22, marginBottom: Spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  rowCopy: { flex: 1, minWidth: 0 },
  plan: { ...Typography.bodyStrong },
  detail: { ...Typography.caption, marginTop: 2 },
  amountCol: { alignItems: 'flex-end' },
  amount: { fontFamily: headingFont.bold, fontSize: 15, lineHeight: 20, color: Colors.textDark },
  amountRefunded: { color: Colors.textLight, textDecorationLine: 'line-through' },
  statusTag: { ...Typography.caption, color: Colors.primary, marginTop: 2 },
});
