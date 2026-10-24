import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, Radius, Spacing, headingFont } from '../../constants/theme';
import { formatPostDate } from '../../utils/formatPostDate';
import type { Review, ReviewSummary } from '../../api/reviewsApi';

const STAR = '#D4862B';
const STAR_OFF = '#CFCAC3';

/** Five stars, filled up to the rounded value. */
function StarRow({ value, size = 16 }: { value: number; size?: number }) {
  const filled = Math.round(value);
  return (
    <View
      style={styles.starRow}
      accessibilityRole="image"
      accessibilityLabel={`${value.toFixed(1)} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map(n => (
        <Ionicons
          key={n}
          name={n <= filled ? 'star' : 'star-outline'}
          size={size}
          color={n <= filled ? STAR : STAR_OFF}
        />
      ))}
    </View>
  );
}

function Bar({ ratio }: { ratio: number }) {
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${Math.max(0, Math.min(1, ratio)) * 100}%` }]} />
    </View>
  );
}

/** Average and the star breakdown, like a product review summary. */
export function ReviewSummaryCard({ summary }: { summary: ReviewSummary }) {
  if (summary.reviewCount === 0) return null;
  return (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <Text style={styles.average}>{summary.average.toFixed(1)}</Text>
        <View style={styles.headCopy}>
          <StarRow value={summary.average} size={20} />
          <Text style={styles.count}>
            {summary.reviewCount} {summary.reviewCount === 1 ? 'review' : 'reviews'}
          </Text>
        </View>
      </View>

      {[5, 4, 3, 2, 1].map(star => {
        const count = summary.starCounts[star - 1] ?? 0;
        return (
          <View key={star} style={styles.starLine}>
            <Text style={styles.starLabel}>{star} star</Text>
            <Bar ratio={count / summary.reviewCount} />
            <Text style={styles.starCount}>{count}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** One client's review. Read-only: there is no edit or remove control. */
export function ReviewCard({ review }: { review: Review }) {
  const initial = (review.clientName.trim()[0] ?? '?').toUpperCase();
  return (
    <View style={styles.card}>
      <View style={styles.reviewHead}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.reviewWho}>
          <Text style={styles.name} numberOfLines={1}>
            {review.clientName || 'A client'}
          </Text>
          <Text style={styles.date}>{formatPostDate(review.createdOn.slice(0, 10))}</Text>
        </View>
        <View style={styles.overall}>
          <Text style={styles.overallValue}>{review.overall.toFixed(1)}</Text>
          <Ionicons name="star" size={14} color={STAR} />
        </View>
      </View>
      <StarRow value={review.overall} />
      {review.comments ? <Text style={styles.comment}>{review.comments}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  starRow: { flexDirection: 'row', gap: 2 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xs,
  },
  headCopy: { gap: 4 },
  average: {
    fontSize: 44,
    lineHeight: 50,
    fontFamily: headingFont.extraBold,
    color: Colors.textDark,
  },
  count: { fontSize: 13, fontFamily: FontFamily.regular, color: Colors.textLight },
  starLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  starLabel: { width: 44, fontSize: 12, fontFamily: FontFamily.medium, color: Colors.textDark },
  starCount: { width: 24, textAlign: 'right', fontSize: 12, color: Colors.textLight },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EFE9E0',
    overflow: 'hidden',
  },
  barFill: { height: 8, borderRadius: 4, backgroundColor: STAR },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: headingFont.bold, fontSize: 16, color: Colors.secondaryDark },
  reviewWho: { flex: 1, minWidth: 0 },
  name: { fontFamily: headingFont.bold, fontSize: 15, color: Colors.textDark },
  date: { fontSize: 12, fontFamily: FontFamily.regular, color: Colors.textLight },
  overall: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  overallValue: { fontFamily: headingFont.bold, fontSize: 15, color: Colors.textDark },
  comment: { fontSize: 14, lineHeight: 20, fontFamily: FontFamily.regular, color: Colors.textDark },
});
