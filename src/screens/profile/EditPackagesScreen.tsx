import React, { useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Colors, Spacing } from '../../constants/theme';
import AppButton from '../../components/AppButton';
import FormErrorBanner from '../../components/FormErrorBanner';
import KeyboardSafeScroll, {
  STICKY_FOOTER_KEYBOARD_PADDING,
} from '../../components/KeyboardSafeScroll';
import StickyFooter from '../../components/StickyFooter';
import ReloadState from '../../components/ReloadState';
import CoachPackagesEditor from '../../components/profile/CoachPackagesEditor';
import {
  buildSaveCoachProfileParams,
  getCoachProfileFull,
  saveCoachProfile,
  type CoachProfileFull,
} from '../../api/coachApi';
import { getErrorMessage } from '../../api/client';
import { queryKeys, invalidateCoachProfileCaches } from '../../api/queryKeys';
import { serializeCoachPackages, validateCoachPackagesDraft } from '../../utils/coachPackages';
import { isPendingLocalMediaUrl } from '../../utils/mediaUrl';
import type { PackagesStackScreenProps } from '../../types/navigation';
import type { CoachPackage } from '../../types/models';
import TabRootHeader from '../../components/TabRootHeader';
import { navigateToDashboard } from '../../utils/navigationBack';

export default function EditPackagesScreen({
  navigation,
}: PackagesStackScreenProps<'PackagesHome'>) {
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
      <TabRootHeader title="Packages" onBack={() => navigateToDashboard(navigation)} />

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
        <EditPackagesForm
          profile={profileQuery.data!}
          onDone={() => navigateToDashboard(navigation)}
        />
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
      invalidateCoachProfileCaches(queryClient, latest.coachCode);
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
    <View style={styles.formRoot}>
      <KeyboardSafeScroll
        ref={scrollRef}
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardPadding={STICKY_FOOTER_KEYBOARD_PADDING}
      >
        <FormErrorBanner message={banner} />
        <CoachPackagesEditor
          packages={draft}
          onChange={setPackages}
          coachCode={profile.coachCode}
        />
      </KeyboardSafeScroll>

      <StickyFooter>
        <AppButton
          label="Save packages"
          onPress={() => void handleSave()}
          loading={saving}
          icon="checkmark"
        />
      </StickyFooter>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  formRoot: { flex: 1 },
  body: { flex: 1 },
  bodyContent: { padding: Spacing.lg, paddingBottom: Spacing.sm },
});
