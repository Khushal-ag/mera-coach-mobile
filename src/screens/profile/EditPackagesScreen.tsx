import React, { useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Colors, Spacing } from '../../constants/theme';
import AppButton from '../../components/AppButton';
import FormErrorBanner from '../../components/FormErrorBanner';
import KeyboardSafeScroll from '../../components/KeyboardSafeScroll';
import ScreenHeader from '../../components/ScreenHeader';
import ReloadState from '../../components/ReloadState';
import CoachPackagesEditor from '../../components/profile/CoachPackagesEditor';
import {
  buildSaveCoachProfileParams,
  getCoachProfileFull,
  saveCoachProfile,
  type CoachProfileFull,
} from '../../api/coachApi';
import { getErrorMessage } from '../../api/client';
import { queryKeys } from '../../api/queryKeys';
import { serializeCoachPackages, validateCoachPackagesDraft } from '../../utils/coachPackages';
import { isPendingLocalMediaUrl } from '../../utils/mediaUrl';
import type { ProfileStackScreenProps } from '../../types/navigation';
import type { CoachPackage } from '../../types/models';

export default function EditPackagesScreen({
  navigation,
}: ProfileStackScreenProps<'EditPackages'>) {
  const profileQuery = useQuery({
    queryKey: queryKeys.coachProfileFull,
    queryFn: getCoachProfileFull,
  });

  const errorMessage =
    profileQuery.isError && !profileQuery.data
      ? getErrorMessage(profileQuery.error, 'Could not load your packages.')
      : null;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Packages" onBack={() => navigation.goBack()} />

      {profileQuery.isPending ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
      ) : errorMessage ? (
        <ReloadState
          title="Could not load packages"
          message={errorMessage}
          onRetry={() => void profileQuery.refetch()}
          loading={profileQuery.isFetching}
          showPullHint={false}
        />
      ) : (
        <EditPackagesForm profile={profileQuery.data!} onDone={() => navigation.goBack()} />
      )}
    </View>
  );
}

function EditPackagesForm({ profile, onDone }: { profile: CoachProfileFull; onDone: () => void }) {
  const scrollRef = useRef<ScrollView>(null);
  const [packages, setPackages] = useState<CoachPackage[] | null>(null);
  const draft = packages ?? profile.packages ?? [];
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleSave = async () => {
    const packagesError = validateCoachPackagesDraft(draft);
    if (packagesError) {
      setBanner(packagesError);
      return;
    }
    if (draft.some(p => isPendingLocalMediaUrl(p.imageUrl))) {
      setBanner('Please wait for the package photo upload to finish.');
      return;
    }

    setBanner(null);
    setSaving(true);
    try {
      const serialized = serializeCoachPackages(draft);
      const latest = await getCoachProfileFull();
      await saveCoachProfile(
        buildSaveCoachProfileParams(latest, {
          packages: serialized,
        }),
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.coachProfile });
      queryClient.invalidateQueries({ queryKey: queryKeys.coachProfileFull });
      queryClient.invalidateQueries({ queryKey: ['coachPublicList'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.coachProfileByCode(latest.coachCode) });
      Alert.alert('Packages saved', 'Your packages have been updated.', [
        { text: 'OK', onPress: onDone },
      ]);
    } catch (err) {
      setBanner(getErrorMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardSafeScroll
      ref={scrollRef}
      style={styles.body}
      contentContainerStyle={styles.bodyContent}
      keyboardPadding={180}
    >
      <FormErrorBanner message={banner} />
      <CoachPackagesEditor packages={draft} onChange={setPackages} coachCode={profile.coachCode} />

      <AppButton
        label="Save packages"
        onPress={() => void handleSave()}
        loading={saving}
        icon="checkmark"
        style={styles.saveBtn}
      />
    </KeyboardSafeScroll>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  body: { flex: 1 },
  bodyContent: { padding: Spacing.lg, paddingBottom: Spacing.xl },
  saveBtn: {
    marginTop: Spacing.md,
  },
});
