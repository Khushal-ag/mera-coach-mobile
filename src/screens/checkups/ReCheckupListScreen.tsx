import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontFamily,
  IconSize,
  ListCard,
  ListPortrait,
  PressOpacity,
  Radius,
  ScreenPad,
  Spacing,
  Typography,
  headingFont,
} from '../../constants/theme';
import { BrandImages } from '../../constants/images';
import EmptyState from '../../components/EmptyState';
import ListPager from '../../components/ListPager';
import ReloadState from '../../components/ReloadState';
import ClientAvatar from '../../components/ClientAvatar';
import SearchField from '../../components/SearchField';
import WaveScreenHeader from '../../components/WaveScreenHeader';
import { getRecheckupList } from '../../api/clientApi';
import { queryKeys } from '../../api/queryKeys';
import { getCurrentCoachCode } from '../../auth/session';
import { useRefreshControl, refreshControlTheme } from '../../hooks/useRefreshControl';
import { getErrorMessage } from '../../api/client';
import { stripNonDigits } from '../../utils/validation';
import type { RecheckupDueClient, ClientSummary } from '../../types/models';
import type { CheckupsStackScreenProps } from '../../types/navigation';
import { navigateToDashboard } from '../../utils/navigationBack';

const PAGE_SIZE = 5;

function describeStatus(daysOverdue: number): string {
  if (daysOverdue < 0) {
    if (daysOverdue >= -3) return 'Due soon';
    return 'Upcoming';
  }
  if (daysOverdue === 0) return 'Due today';
  if (daysOverdue === 1) return '1 day overdue';
  return `${daysOverdue} days overdue`;
}

function describeLast(item: RecheckupDueClient): string {
  if (item.lastCheckupDate) return `Last check-up ${item.lastCheckupDate}`;
  return 'No check-up recorded';
}

export default function ReCheckupListScreen({
  navigation,
}: CheckupsStackScreenProps<'CheckupListHome'>) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const coachCode = getCurrentCoachCode();

  const dueQuery = useQuery({
    queryKey: queryKeys.recheckupList(coachCode),
    queryFn: () => getRecheckupList({ coachCode }),
  });
  const refreshControl = useRefreshControl(dueQuery);

  const dueClients = useMemo(() => dueQuery.data ?? [], [dueQuery.data]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return dueClients;
    const digits = stripNonDigits(search);
    return dueClients.filter(c => {
      if (c.name.toLowerCase().includes(term)) return true;
      if (c.age != null && String(c.age).includes(term)) return true;
      return digits.length > 0 && (c.mobileNo ?? '').includes(digits);
    });
  }, [dueClients, search]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return visible.slice(start, start + PAGE_SIZE);
  }, [visible, safePage]);

  const onSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const errorMessage = dueQuery.isError
    ? getErrorMessage(dueQuery.error, 'Could not load checkups. Pull down to try again.')
    : null;
  const showLoadError = !!errorMessage && dueClients.length === 0;

  const startCheckup = useCallback(
    (item: RecheckupDueClient) => {
      const client: ClientSummary = {
        id: item.clientCode,
        clientCode: item.clientCode,
        name: item.name,
        mobileNo: item.mobileNo,
        age: item.age,
        lastCheckupDate: item.lastCheckupDate,
      };
      navigation.navigate('ClientBmi', { client });
    },
    [navigation],
  );

  const renderRow = useCallback(
    ({ item }: { item: RecheckupDueClient }) => {
      const statusLabel = describeStatus(item.daysOverdue);

      return (
        <View style={styles.card}>
          <ClientAvatar
            clientCode={item.clientCode}
            width={ListPortrait.width}
            height={ListPortrait.height}
            borderRadius={ListPortrait.radius}
            style={styles.avatar}
          />

          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.subMeta} numberOfLines={1}>
              {describeLast(item)}
            </Text>
            {item.dueDate ? (
              <Text style={styles.dueText} numberOfLines={1}>
                Due {item.dueDate}
              </Text>
            ) : (
              <Text style={styles.dueText} numberOfLines={1}>
                {statusLabel}
              </Text>
            )}
            <View style={styles.overduePill}>
              <Ionicons name="time-outline" size={IconSize.sm} color={Colors.secondary} />
              <Text style={styles.overdueText} numberOfLines={1}>
                {statusLabel}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.recheckBtn}
              onPress={() => startCheckup(item)}
              activeOpacity={PressOpacity.default}
              accessibilityRole="button"
              accessibilityLabel={`Re-checkup for ${item.name}`}
            >
              <Ionicons name="clipboard-outline" size={IconSize.sm} color={Colors.white} />
              <Text style={styles.recheckText}>Re-Checkup</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [startCheckup],
  );

  return (
    <View style={styles.container}>
      <WaveScreenHeader
        title="Checkups"
        onBack={() => navigateToDashboard(navigation)}
        onHome={() => navigateToDashboard(navigation)}
      />

      <View style={styles.body}>
        <SearchField
          style={styles.search}
          placeholder="Search name. mobile, email"
          value={search}
          onChangeText={onSearchChange}
          accessibilityLabel="Search checkups"
        />

        {dueQuery.isPending && !dueQuery.data ? (
          <ActivityIndicator color={Colors.secondary} style={styles.loader} />
        ) : showLoadError ? (
          <ScrollView
            contentContainerStyle={styles.errorWrap}
            refreshControl={
              <RefreshControl
                refreshing={refreshControl.refreshing}
                onRefresh={refreshControl.onRefresh}
                {...refreshControlTheme}
              />
            }
          >
            <ReloadState
              illustration={BrandImages.emptyCheckups}
              title="Could not load checkups"
              message={errorMessage!}
              onRetry={() => void dueQuery.refetch()}
              loading={dueQuery.isFetching}
            />
          </ScrollView>
        ) : (
          <>
            {!dueQuery.isPending ? (
              <View style={styles.summaryChip}>
                <View style={styles.summaryIcon}>
                  <Ionicons name="people" size={IconSize.sm} color={Colors.white} />
                </View>
                <Text style={styles.summaryText}>{dueClients.length} Due for re-checkup</Text>
              </View>
            ) : null}
            <FlatList
              data={pageItems}
              keyExtractor={(item, index) => item.clientCode ?? `${item.name}-${index}`}
              showsVerticalScrollIndicator={false}
              initialNumToRender={8}
              maxToRenderPerBatch={6}
              windowSize={5}
              contentContainerStyle={[
                visible.length === 0 ? styles.emptyWrap : undefined,
                { paddingBottom: ScreenPad.tabBarClearance },
              ]}
              refreshControl={
                <RefreshControl
                  refreshing={refreshControl.refreshing}
                  onRefresh={refreshControl.onRefresh}
                  {...refreshControlTheme}
                />
              }
              ListEmptyComponent={
                <EmptyState
                  icon={search.trim() ? 'search-outline' : undefined}
                  illustration={search.trim() ? undefined : BrandImages.emptyCheckups}
                  title={search.trim() ? 'No matches' : 'No checkups due'}
                  message={
                    search.trim()
                      ? 'Try a different name or mobile number.'
                      : 'No clients are due for re-checkup right now.'
                  }
                />
              }
              ListFooterComponent={
                visible.length > PAGE_SIZE ? (
                  <ListPager
                    page={safePage}
                    totalPages={totalPages}
                    onChangePage={setPage}
                    variant="square"
                  />
                ) : null
              }
              renderItem={renderRow}
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  body: {
    flex: 1,
    paddingHorizontal: ScreenPad.horizontal,
    paddingTop: Spacing.sm,
  },
  search: { marginBottom: Spacing.sm },
  loader: { marginTop: Spacing.xl - 2 },
  summaryChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm - 2,
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.pill,
    paddingLeft: Spacing.xs,
    paddingRight: Spacing.md,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  summaryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: {
    ...Typography.label,
    color: Colors.textDark,
  },
  emptyWrap: { flexGrow: 1 },
  errorWrap: { flexGrow: 1 },
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
    marginBottom: Spacing.sm,
  },
  avatar: {
    marginRight: Spacing.sm,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 18,
    fontFamily: headingFont.bold,
    color: Colors.textDark,
    lineHeight: 24,
  },
  subMeta: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.textDark,
    marginTop: 3,
    lineHeight: 18,
  },
  dueText: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    color: Colors.primary,
    marginTop: 4,
  },
  overduePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    marginTop: Spacing.xs,
    maxWidth: '100%',
  },
  overdueText: {
    fontSize: 12,
    fontFamily: FontFamily.semibold,
    color: Colors.secondary,
    flexShrink: 1,
  },
  recheckBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs + 2,
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.sm,
    minHeight: 36,
    maxWidth: '100%',
  },
  recheckText: {
    color: Colors.white,
    fontSize: 13,
    fontFamily: FontFamily.bold,
    flexShrink: 1,
  },
});
