import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import ReloadState from '../../components/ReloadState';
import EmptyState from '../../components/EmptyState';
import WaveScreenHeader from '../../components/WaveScreenHeader';
import ReviewsList from '../../components/reviews/ReviewsList';
import { Colors, ScreenPad, Spacing, Typography } from '../../constants/theme';
import { getErrorMessage } from '../../api/client';
import { useMyReviews } from '../../hooks/useReviews';
import { refreshControlTheme, useRefreshControl } from '../../hooks/useRefreshControl';
import { navigateToDashboard } from '../../utils/navigationBack';
import type { ProfileStackScreenProps } from '../../types/navigation';

/** Feedback clients have left for this coach. Read-only: a coach cannot edit or remove a review. */
export default function ReviewsScreen({ navigation }: ProfileStackScreenProps<'Reviews'>) {
  const query = useMyReviews();
  const refresh = useRefreshControl(query);
  const empty = !query.isPending && (query.data?.pages[0]?.items.length ?? 0) === 0;

  return (
    <View style={styles.container}>
      <WaveScreenHeader
        title="Reviews"
        onBack={() => navigation.goBack()}
        onHome={() => navigateToDashboard(navigation)}
      />
      {query.isError && !query.data ? (
        <ReloadState
          title="Could not load reviews"
          message={getErrorMessage(query.error, 'Please try again.')}
          onRetry={() => void query.refetch()}
          loading={query.isFetching}
          showPullHint={false}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refresh.refreshing}
              onRefresh={refresh.onRefresh}
              {...refreshControlTheme}
            />
          }
        >
          <Text style={styles.note}>
            Each client&apos;s latest feedback counts toward your rating. Reviews are shown as the
            client wrote them.
          </Text>
          {empty ? (
            <EmptyState
              icon="chatbubble-ellipses-outline"
              title="No reviews yet"
              message="Ask a client for feedback from their profile. Their review shows up here."
            />
          ) : (
            <ReviewsList query={query} />
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: ScreenPad.horizontal, paddingBottom: Spacing.xl, gap: Spacing.sm },
  note: { ...Typography.caption, color: Colors.textLight },
});
