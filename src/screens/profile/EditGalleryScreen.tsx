import React from 'react';
import { View, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../constants/theme';
import ScreenHeader from '../../components/ScreenHeader';
import ReloadState from '../../components/ReloadState';
import CoachGallery from '../../components/CoachGallery';
import { getCoachProfileFull } from '../../api/coachApi';
import { getErrorMessage } from '../../api/client';
import { queryKeys } from '../../api/queryKeys';
import type { ProfileStackScreenProps } from '../../types/navigation';

export default function EditGalleryScreen({ navigation }: ProfileStackScreenProps<'EditGallery'>) {
  const insets = useSafeAreaInsets();
  const profileQuery = useQuery({
    queryKey: queryKeys.coachProfileFull,
    queryFn: getCoachProfileFull,
  });

  const errorMessage =
    profileQuery.isError && !profileQuery.data
      ? getErrorMessage(profileQuery.error, 'Could not load your profile.')
      : null;

  const coachCode = profileQuery.data?.coachCode ?? '';

  return (
    <View style={styles.container}>
      <ScreenHeader title="Photo gallery" onBack={() => navigation.goBack()} />

      {profileQuery.isPending ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
      ) : errorMessage ? (
        <ReloadState
          title="Could not load gallery"
          message={errorMessage}
          onRetry={() => void profileQuery.refetch()}
          loading={profileQuery.isFetching}
          showPullHint={false}
        />
      ) : (
        <ScrollView
          style={styles.body}
          contentContainerStyle={[
            styles.bodyContent,
            { paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.lg },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <CoachGallery coachCode={coachCode} editable />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  body: { flex: 1 },
  bodyContent: { padding: Spacing.lg, paddingBottom: Spacing.xl },
});
