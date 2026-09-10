import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow, Spacing } from '../constants/theme';
import FormErrorBanner from '../components/FormErrorBanner';
import KeyboardSafeScroll from '../components/KeyboardSafeScroll';
import ScreenHeader from '../components/ScreenHeader';
import ReloadState from '../components/ReloadState';
import CoachPackagesEditor from '../components/CoachPackagesEditor';
import DemoModeHint from '../components/DemoModeHint';
import {
  buildSaveCoachProfileParams,
  getCoachProfileFull,
  saveCoachProfile,
  type CoachProfileFull,
} from '../api/coachApi';
import { getErrorMessage } from '../api/client';
import { queryKeys } from '../api/queryKeys';
import { USE_MVP_MOCKS } from '../config/appConfig';
import { resolveDemoPackages, saveDemoPackages } from '../data/mvpMockStore';
import { serializeCoachPackages, validateCoachPackagesDraft } from '../utils/coachPackages';
import type { ProfileStackScreenProps } from '../types/navigation';
import type { CoachPackage } from '../types/models';

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
  const seedQuery = useQuery({
    queryKey: [...queryKeys.coachMvpDemo(profile.coachCode), 'packages-edit'] as const,
    queryFn: () => resolveDemoPackages(profile.coachCode, profile.packages),
    enabled: USE_MVP_MOCKS,
    initialData:
      (profile.packages?.length ?? 0) > 0
        ? { packages: profile.packages ?? [], isDemo: false }
        : undefined,
  });

  const seeded = USE_MVP_MOCKS
    ? seedQuery.data
    : { packages: profile.packages ?? [], isDemo: false };
  const [packages, setPackages] = useState<CoachPackage[] | null>(null);
  const draft = packages ?? seeded?.packages ?? [];
  const isDemo = seeded?.isDemo ?? false;
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleSave = async () => {
    const packagesError = validateCoachPackagesDraft(draft);
    if (packagesError) {
      setBanner(packagesError);
      return;
    }

    setBanner(null);
    setSaving(true);
    try {
      const serialized = serializeCoachPackages(draft);

      if (USE_MVP_MOCKS) {
        await saveDemoPackages(profile.coachCode, serialized);
        queryClient.invalidateQueries({ queryKey: queryKeys.coachMvpDemo(profile.coachCode) });
        queryClient.invalidateQueries({
          queryKey: queryKeys.coachProfileByCode(profile.coachCode),
        });
        Alert.alert(
          'Packages saved',
          isDemo
            ? 'Saved on this device for demo. The API does not store packages yet.'
            : 'Your packages have been updated.',
          [{ text: 'OK', onPress: onDone }],
        );
        return;
      }

      // Reload so we merge against the latest profile and do not wipe other fields.
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

  if (USE_MVP_MOCKS && !seeded) {
    return <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />;
  }

  return (
    <KeyboardSafeScroll
      ref={scrollRef}
      style={styles.body}
      contentContainerStyle={styles.bodyContent}
      keyboardPadding={180}
    >
      <FormErrorBanner message={banner} />
      {isDemo ? <DemoModeHint /> : null}
      <CoachPackagesEditor packages={draft} onChange={setPackages} />

      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={() => void handleSave()}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <>
            <Text style={styles.saveText}>Save packages</Text>
            <Ionicons name="checkmark" size={18} color={Colors.white} />
          </>
        )}
      </TouchableOpacity>
    </KeyboardSafeScroll>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  body: { flex: 1 },
  bodyContent: { padding: Spacing.lg, paddingBottom: Spacing.xl },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: Spacing.md,
    ...Shadow.md,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
