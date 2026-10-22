import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { UseInfiniteQueryResult, InfiniteData } from '@tanstack/react-query';
import AppButton from '../AppButton';
import { Colors, Spacing } from '../../constants/theme';
import { ReviewCard, ReviewSummaryCard } from './ReviewComponents';
import type { ReviewsPage } from '../../api/reviewsApi';

type ReviewsQuery = UseInfiniteQueryResult<InfiniteData<ReviewsPage>, Error>;

/** Summary, review cards and "Show more". Renders nothing while loading or when there are no reviews. */
export default function ReviewsList({
  query,
  showSummary = true,
}: {
  query: ReviewsQuery;
  showSummary?: boolean;
}) {
  if (query.isLoading) return <ActivityIndicator color={Colors.secondary} style={styles.loader} />;
  const pages = query.data?.pages ?? [];
  const items = pages.flatMap(p => p.items);
  const summary = pages[0]?.summary;
  if (!summary || items.length === 0) return null;

  return (
    <View style={styles.list}>
      {showSummary ? <ReviewSummaryCard summary={summary} /> : null}
      {items.map(review => (
        <ReviewCard key={review.feedbackId} review={review} />
      ))}
      {query.hasNextPage ? (
        <AppButton
          label="Show more reviews"
          variant="secondary"
          size="compact"
          onPress={() => void query.fetchNextPage()}
          loading={query.isFetchingNextPage}
        />
      ) : null}
      {query.isError ? <Text style={styles.error}>Could not load more reviews.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.sm },
  loader: { marginVertical: Spacing.lg },
  error: { color: Colors.destructive, fontSize: 13, textAlign: 'center' },
});
