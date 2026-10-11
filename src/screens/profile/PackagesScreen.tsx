import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontFamily,
  IconSize,
  ListCard,
  ListPortrait,
  PressOpacity,
  ScreenPad,
  Shadow,
  Spacing,
  TouchTarget,
  Typography,
} from '../../constants/theme';
import AppButton from '../../components/AppButton';
import FormErrorBanner from '../../components/FormErrorBanner';
import ListPager from '../../components/ListPager';
import ReloadState from '../../components/ReloadState';
import WaveScreenHeader from '../../components/WaveScreenHeader';
import {
  buildSaveCoachProfileParams,
  getCoachProfileFull,
  saveCoachProfile,
} from '../../api/coachApi';
import { getErrorMessage } from '../../api/client';
import { queryKeys, invalidateCoachProfileCaches } from '../../api/queryKeys';
import { refreshControlTheme, useRefreshControl } from '../../hooks/useRefreshControl';
import {
  MAX_COACH_PACKAGES,
  serializeCoachPackages,
  validateCoachPackagesDraft,
} from '../../utils/coachPackages';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import { navigateToDashboard } from '../../utils/navigationBack';
import type { PackagesStackScreenProps } from '../../types/navigation';
import type { CoachPackage } from '../../types/models';

const CANVAS = '#F3FAF7';
const PAGE_SIZE = 5;

export default function PackagesScreen({ navigation }: PackagesStackScreenProps<'PackagesHome'>) {
  const queryClient = useQueryClient();
  const profileQuery = useQuery({
    queryKey: queryKeys.coachProfileFull,
    queryFn: getCoachProfileFull,
  });
  const refreshControl = useRefreshControl(profileQuery);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);

  const errorMessage =
    profileQuery.isError && !profileQuery.data
      ? getErrorMessage(profileQuery.error, 'Could not load your packages.')
      : null;

  const packages = profileQuery.data?.packages ?? [];
  const atMax = packages.length >= MAX_COACH_PACKAGES;
  const totalPages = Math.max(1, Math.ceil(packages.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagePackages = packages.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const goAdd = () => {
    if (atMax) {
      setActionError(`You can add up to ${MAX_COACH_PACKAGES} packages.`);
      return;
    }
    setActionError(null);
    navigation.navigate('EditPackages');
  };

  const goEdit = (pkg: CoachPackage) => {
    navigation.navigate('EditPackages', { packageId: pkg.id });
  };

  const persistRemove = async (id: string) => {
    const profile = profileQuery.data;
    if (!profile || removingId) return;
    const next = (profile.packages ?? []).filter(pkg => pkg.id !== id);
    const packagesError = validateCoachPackagesDraft(next);
    if (packagesError) {
      setActionError(packagesError);
      return;
    }
    setRemovingId(id);
    setActionError(null);
    try {
      const serialized = serializeCoachPackages(next);
      const latest = await getCoachProfileFull();
      await saveCoachProfile(
        buildSaveCoachProfileParams(latest, {
          packages: serialized,
        }),
      );
      invalidateCoachProfileCaches(queryClient, latest.coachCode);
    } catch (err) {
      setActionError(getErrorMessage(err, 'Could not remove this package. Please try again.'));
    } finally {
      setRemovingId(null);
    }
  };

  const confirmRemove = (pkg: CoachPackage) => {
    const label = pkg.name.trim() || 'this package';
    Alert.alert('Remove package', `Remove ${label}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void persistRemove(pkg.id);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <WaveScreenHeader
        title="Packages"
        showBack={false}
        onHome={() => navigateToDashboard(navigation)}
      />
      <View style={styles.addRow}>
        <AppButton
          label="Add package"
          size="compact"
          icon="add-outline"
          iconPosition="left"
          onPress={goAdd}
          accessibilityLabel="Add package"
        />
      </View>
      <View style={styles.bannerPad}>
        <FormErrorBanner message={actionError} />
        <FormErrorBanner message={refreshControl.refreshError} />
      </View>

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
      ) : (
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshControl.refreshing}
              onRefresh={refreshControl.onRefresh}
              {...refreshControlTheme}
            />
          }
        >
          {packages.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="cube-outline" size={IconSize.xxl} color={Colors.accentInk} />
              <Text style={styles.emptyTitle}>No packages yet</Text>
              <Text style={styles.emptyMessage}>
                Add a coaching package with a name and price for your public profile.
              </Text>
            </View>
          ) : (
            pagePackages.map((pkg, index) => {
              const title = pkg.name.trim() || `Package ${(safePage - 1) * PAGE_SIZE + index + 1}`;
              const price = pkg.price.trim();
              const removing = removingId === pkg.id;
              const imageUri = resolveMediaUrl(pkg.imageUrl);
              return (
                <View key={pkg.id} style={styles.card}>
                  <TouchableOpacity
                    style={styles.cardMain}
                    onPress={() => goEdit(pkg)}
                    activeOpacity={PressOpacity.default}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${title}`}
                  >
                    {imageUri ? (
                      <Image source={{ uri: imageUri }} style={styles.photo} resizeMode="cover" />
                    ) : (
                      <View style={styles.photo} />
                    )}
                    <View style={styles.cardBody}>
                      <Text style={styles.cardTitle} numberOfLines={2}>
                        {title}
                      </Text>
                      <Text style={price ? styles.cardPrice : styles.cardMeta} numberOfLines={2}>
                        {price || 'Tap to edit details'}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward-outline"
                      size={IconSize.md}
                      color={Colors.accentInk}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => confirmRemove(pkg)}
                    disabled={removing}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${title}`}
                    activeOpacity={PressOpacity.default}
                  >
                    {removing ? (
                      <ActivityIndicator size="small" color={Colors.destructive} />
                    ) : (
                      <Ionicons
                        name="trash-outline"
                        size={IconSize.md}
                        color={Colors.destructive}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              );
            })
          )}
          {packages.length > PAGE_SIZE ? (
            <ListPager
              page={safePage}
              totalPages={totalPages}
              onChangePage={setPage}
              variant="square"
            />
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CANVAS },
  pending: { marginTop: 60 },
  body: { flex: 1, backgroundColor: CANVAS },
  addRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: ScreenPad.horizontal,
    paddingTop: Spacing.md,
  },
  bannerPad: { paddingHorizontal: ScreenPad.horizontal },
  bodyContent: {
    paddingHorizontal: ScreenPad.horizontal,
    paddingTop: Spacing.md,
    paddingBottom: ScreenPad.tabBarClearance,
    gap: Spacing.sm,
  },
  emptyCard: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: Spacing.lg,
    ...Shadow.sm,
  },
  emptyTitle: {
    ...Typography.headline,
  },
  emptyMessage: {
    ...Typography.body,
    color: Colors.textLight,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: ListCard.minHeight,
    backgroundColor: Colors.white,
    borderRadius: ListCard.radius,
    overflow: 'hidden',
    borderWidth: ListCard.borderWidth,
    borderColor: ListCard.borderColor,
    padding: ListPortrait.contentPad,
  },
  cardMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minWidth: 0,
  },
  photo: {
    width: ListPortrait.width,
    height: ListPortrait.height,
    borderRadius: ListPortrait.radius,
    backgroundColor: Colors.cardTintGreen,
    overflow: 'hidden',
    flexShrink: 0,
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitle: {
    ...Typography.headline,
  },
  cardPrice: {
    marginTop: 3,
    ...Typography.bodyStrong,
    color: Colors.accentInk,
  },
  cardMeta: {
    marginTop: 3,
    ...Typography.label,
    fontFamily: FontFamily.regular,
  },
  removeBtn: {
    width: TouchTarget.icon,
    height: TouchTarget.icon,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.xxs,
    flexShrink: 0,
  },
});
