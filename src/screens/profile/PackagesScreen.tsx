import React, { useState } from 'react';
import {
  View,
  Text,
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
import { getErrorMessage } from '../../api/client';
import { queryKeys } from '../../api/queryKeys';
import {
  deletePackage,
  getMyPackages,
  MAX_PACKAGES,
  type ShowcasePackage,
} from '../../api/showcaseApi';
import { refreshControlTheme, useRefreshControl } from '../../hooks/useRefreshControl';
import { formatMoney } from '../../utils/formatMoney';
import { navigateToDashboard } from '../../utils/navigationBack';
import type { PackagesStackScreenProps } from '../../types/navigation';

const CANVAS = '#F3FAF7';
const PAGE_SIZE = 5;

export default function PackagesScreen({ navigation }: PackagesStackScreenProps<'PackagesHome'>) {
  const queryClient = useQueryClient();
  const packagesQuery = useQuery({ queryKey: queryKeys.myPackages, queryFn: getMyPackages });
  const refreshControl = useRefreshControl(packagesQuery);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);

  const errorMessage =
    packagesQuery.isError && !packagesQuery.data
      ? getErrorMessage(packagesQuery.error, 'Could not load your packages.')
      : null;

  const packages = packagesQuery.data ?? [];
  const atMax = packages.length >= MAX_PACKAGES;
  const totalPages = Math.max(1, Math.ceil(packages.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagePackages = packages.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const goAdd = () => {
    if (atMax) {
      setActionError(`You can add up to ${MAX_PACKAGES} packages.`);
      return;
    }
    setActionError(null);
    navigation.navigate('EditPackages');
  };

  const persistRemove = async (pkg: ShowcasePackage) => {
    if (removingId) return;
    setRemovingId(pkg.packageId);
    setActionError(null);
    try {
      await deletePackage(pkg.packageId);
      void queryClient.invalidateQueries({ queryKey: ['showcase'] });
    } catch (err) {
      setActionError(getErrorMessage(err, 'Could not remove this package. Please try again.'));
    } finally {
      setRemovingId(null);
    }
  };

  const confirmRemove = (pkg: ShowcasePackage) => {
    Alert.alert('Remove package', `Remove ${pkg.packageName || 'this package'}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void persistRemove(pkg) },
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

      {packagesQuery.isPending ? (
        <ActivityIndicator color={Colors.secondary} style={styles.pending} />
      ) : errorMessage ? (
        <ReloadState
          title="Could not load packages"
          message={errorMessage}
          onRetry={() => void packagesQuery.refetch()}
          loading={packagesQuery.isFetching}
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
                Bundle the products you recommend into a package with its own price. It shows on
                your public profile.
              </Text>
            </View>
          ) : (
            pagePackages.map(pkg => {
              const removing = removingId === pkg.packageId;
              return (
                <View key={pkg.packageId} style={styles.card}>
                  <TouchableOpacity
                    style={styles.cardMain}
                    onPress={() =>
                      navigation.navigate('EditPackages', { packageId: pkg.packageId })
                    }
                    activeOpacity={PressOpacity.default}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${pkg.packageName}`}
                  >
                    <View style={styles.cardBody}>
                      <Text style={styles.brand}>{pkg.brandName}</Text>
                      <Text style={styles.cardTitle} numberOfLines={2}>
                        {pkg.packageName}
                      </Text>
                      <Text style={styles.cardMeta} numberOfLines={1}>
                        {pkg.items.map(item => item.itemName).join(', ')}
                      </Text>
                      <Text style={styles.cardPrice}>{formatMoney(pkg.totalAmount)}</Text>
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
                    accessibilityLabel={`Remove ${pkg.packageName}`}
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
  emptyTitle: { ...Typography.headline },
  emptyMessage: { ...Typography.body, color: Colors.textLight, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: ListCard.minHeight,
    backgroundColor: Colors.white,
    borderRadius: ListCard.radius,
    overflow: 'hidden',
    borderWidth: ListCard.borderWidth,
    borderColor: ListCard.borderColor,
    padding: Spacing.sm,
  },
  cardMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minWidth: 0,
  },
  cardBody: { flex: 1, minWidth: 0 },
  brand: { ...Typography.label, color: Colors.secondary, fontFamily: FontFamily.semibold },
  cardTitle: { ...Typography.headline },
  cardMeta: { marginTop: 2, ...Typography.label, fontFamily: FontFamily.regular },
  cardPrice: { marginTop: 4, ...Typography.bodyStrong, color: Colors.accentInk },
  removeBtn: {
    width: TouchTarget.icon,
    height: TouchTarget.icon,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.xxs,
    flexShrink: 0,
  },
});
