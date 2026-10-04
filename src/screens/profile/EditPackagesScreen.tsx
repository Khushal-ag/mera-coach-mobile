import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontFamily,
  IconSize,
  PressOpacity,
  Radius,
  ScreenPad,
  Spacing,
} from '../../constants/theme';
import FormErrorBanner from '../../components/FormErrorBanner';
import KeyboardSafeScroll from '../../components/KeyboardSafeScroll';
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
import {
  MAX_COACH_PACKAGES,
  createEmptyPackage,
  serializeCoachPackages,
  coachPackageAmountError,
  validateCoachPackagesDraft,
} from '../../utils/coachPackages';
import { isPendingLocalMediaUrl } from '../../utils/mediaUrl';
import type { PackagesStackScreenProps } from '../../types/navigation';
import type { CoachPackage } from '../../types/models';
import WaveScreenHeader from '../../components/WaveScreenHeader';
import { navigateToDashboard } from '../../utils/navigationBack';

const CANVAS = '#F3FAF7';

export default function EditPackagesScreen({
  navigation,
  route,
}: PackagesStackScreenProps<'EditPackages'>) {
  const packageId = route.params?.packageId;
  const profileQuery = useQuery({
    queryKey: queryKeys.coachProfileFull,
    queryFn: getCoachProfileFull,
  });

  const errorMessage =
    profileQuery.isError && !profileQuery.data
      ? getErrorMessage(profileQuery.error, 'Could not load your packages.')
      : null;

  const missingPackage =
    !!packageId &&
    !!profileQuery.data &&
    !(profileQuery.data.packages ?? []).some(pkg => pkg.id === packageId);

  return (
    <View style={styles.container}>
      <WaveScreenHeader
        title="Package Creation"
        onBack={() => navigation.goBack()}
        onHome={() => navigateToDashboard(navigation)}
      />

      {profileQuery.isPending ? (
        <ActivityIndicator color={Colors.secondary} style={styles.pending} />
      ) : errorMessage ? (
        <ReloadState
          title="Could not load packages"
          message={errorMessage}
          onRetry={() => void profileQuery.refetch()}
          loading={profileQuery.isFetching}
          showPullHint={false}
        />
      ) : missingPackage ? (
        <ReloadState
          title="Package not found"
          message="This package is no longer on your list."
          onRetry={() => navigation.goBack()}
          retryLabel="Back to packages"
          showPullHint={false}
        />
      ) : (
        <EditPackagesForm
          key={packageId ?? 'new'}
          profile={profileQuery.data!}
          packageId={packageId}
          onDone={() => navigation.goBack()}
        />
      )}
    </View>
  );
}

function packageDraft(profile: CoachProfileFull, packageId?: string): CoachPackage[] {
  if (!packageId) return [createEmptyPackage()];
  const existing = (profile.packages ?? []).find(pkg => pkg.id === packageId);
  if (!existing) return [];
  return [
    {
      id: existing.id,
      name: existing.name,
      price: existing.price,
      duration: existing.duration,
      description: existing.description,
      imageUrl: existing.imageUrl ?? '',
    },
  ];
}

function mergePackageDraft(
  saved: CoachPackage[],
  draft: CoachPackage[],
  packageId?: string,
): CoachPackage[] {
  const editing = !!packageId && saved.some(pkg => pkg.id === packageId);
  if (!editing) {
    const known = new Set(saved.map(pkg => pkg.id));
    return [...saved, ...draft.filter(pkg => !known.has(pkg.id))];
  }
  const draftIds = new Set(draft.map(pkg => pkg.id));
  const kept = saved.filter(pkg => pkg.id !== packageId || draftIds.has(pkg.id));
  const next = kept.map(pkg => draft.find(item => item.id === pkg.id) ?? pkg);
  for (const pkg of draft) {
    if (!saved.some(item => item.id === pkg.id)) next.push(pkg);
  }
  return next;
}

function EditPackagesForm({
  profile,
  packageId,
  onDone,
}: {
  profile: CoachProfileFull;
  packageId?: string;
  onDone: () => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const [packages, setPackages] = useState<CoachPackage[]>(() => packageDraft(profile, packageId));
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const saved = profile.packages ?? [];
  const editingExisting = !!packageId && saved.some(pkg => pkg.id === packageId);
  const reservedSlots = editingExisting ? Math.max(0, saved.length - 1) : saved.length;
  const photoUploading = packages.some(pkg => isPendingLocalMediaUrl(pkg.imageUrl));

  const showBanner = (message: string) => {
    setBanner(message);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleSave = async () => {
    if (saving) return;
    const next = mergePackageDraft(saved, packages, packageId);
    const packagesError = validateCoachPackagesDraft(packages);
    if (packagesError) {
      showBanner(packagesError);
      return;
    }
    if (!packages.some(pkg => pkg.name.trim())) {
      showBanner('Add a package name before saving.');
      return;
    }
    for (const pkg of packages) {
      if (!pkg.name.trim()) continue;
      const amountError = coachPackageAmountError(pkg.price);
      if (amountError) {
        showBanner(`${pkg.name.trim()}: ${amountError}`);
        return;
      }
    }
    if (next.filter(pkg => pkg.name.trim()).length > MAX_COACH_PACKAGES) {
      showBanner(`You can add up to ${MAX_COACH_PACKAGES} packages.`);
      return;
    }
    if (photoUploading) {
      showBanner('Please wait for the package photo upload to finish.');
      return;
    }

    setBanner(null);
    setSaving(true);
    try {
      const serialized = serializeCoachPackages(next);
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
      showBanner(getErrorMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const submitBusy = saving || photoUploading;

  return (
    <View style={styles.formRoot}>
      <KeyboardSafeScroll
        ref={scrollRef}
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardPadding={Spacing.xl}
      >
        <FormErrorBanner message={banner} />
        <CoachPackagesEditor
          packages={packages}
          onChange={setPackages}
          coachCode={profile.coachCode}
          focusPackageId={packageId ?? packages[0]?.id}
          reservedSlots={reservedSlots}
          initialPhotoId={packageId ?? null}
        />
        <TouchableOpacity
          style={[styles.createBtn, submitBusy && styles.createBtnDisabled]}
          onPress={() => void handleSave()}
          disabled={submitBusy}
          activeOpacity={PressOpacity.default}
          accessibilityRole="button"
          accessibilityLabel="Create Package"
          accessibilityState={{ disabled: submitBusy, busy: saving }}
        >
          {saving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Text style={styles.createLabel}>Create Package</Text>
              <View style={styles.createArrow}>
                <Ionicons
                  name="arrow-forward-outline"
                  size={IconSize.md}
                  color={Colors.accentInk}
                />
              </View>
            </>
          )}
        </TouchableOpacity>
      </KeyboardSafeScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CANVAS },
  pending: { marginTop: 60 },
  formRoot: { flex: 1 },
  body: { flex: 1, backgroundColor: CANVAS },
  bodyContent: {
    paddingHorizontal: ScreenPad.horizontal,
    paddingTop: Spacing.md,
  },
  createBtn: {
    minHeight: 56,
    borderRadius: Radius.pill,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 56,
  },
  createBtnDisabled: { opacity: 0.6 },
  createLabel: {
    color: Colors.white,
    fontFamily: FontFamily.semibold,
    fontSize: 18,
    lineHeight: 24,
  },
  createArrow: {
    position: 'absolute',
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
