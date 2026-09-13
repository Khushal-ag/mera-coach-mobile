import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontFamily,
  PressOpacity,
  Radius,
  Shadow,
  Spacing,
  buttonStyles,
} from '../../constants/theme';
import { BrandImages } from '../../constants/images';
import EmptyState from '../../components/EmptyState';
import ReloadState from '../../components/ReloadState';
import ClientAvatar from '../../components/ClientAvatar';
import SearchField from '../../components/SearchField';
import TabRootHeader from '../../components/TabRootHeader';
import { getRecheckupList } from '../../api/clientApi';
import { queryKeys } from '../../api/queryKeys';
import { getCurrentCoachCode } from '../../auth/session';
import { useRefreshControl, refreshControlTheme } from '../../hooks/useRefreshControl';
import { getErrorMessage } from '../../api/client';
import { stripNonDigits } from '../../utils/validation';
import type { RecheckupDueClient, ClientSummary } from '../../types/models';
import type { CheckupsStackScreenProps } from '../../types/navigation';
import { navigateToDashboard } from '../../utils/navigationBack';

function describeOverdue(daysOverdue: number): string {
  if (daysOverdue <= 0) return 'Due today';
  if (daysOverdue === 1) return '1 day overdue';
  return `${daysOverdue} days overdue`;
}

function describeLast(item: RecheckupDueClient): string {
  if (item.lastCheckupDate) return `Last check-up ${item.lastCheckupDate}`;
  return 'No check-up recorded';
}

function describeDue(item: RecheckupDueClient): string {
  if (item.dueDate) return `Due ${item.dueDate}`;
  return describeOverdue(item.daysOverdue);
}

export default function ReCheckupListScreen({
  navigation,
}: CheckupsStackScreenProps<'CheckupListHome'>) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
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

  const errorMessage = dueQuery.isError
    ? getErrorMessage(dueQuery.error, 'Could not load checkups. Pull down to try again.')
    : null;
  const showLoadError = !!errorMessage && dueClients.length === 0;

  const startCheckup = (item: RecheckupDueClient) => {
    const client: ClientSummary = {
      id: item.clientCode,
      clientCode: item.clientCode,
      name: item.name,
      mobileNo: item.mobileNo,
      age: item.age,
      lastCheckupDate: item.lastCheckupDate,
    };
    navigation.navigate('ClientBmi', { client });
  };

  const renderRow = ({ item }: { item: RecheckupDueClient }) => {
    const dueLabel = describeDue(item);
    const overdueLabel = item.dueDate ? describeOverdue(item.daysOverdue) : null;

    return (
      <View style={styles.card}>
        <ClientAvatar clientCode={item.clientCode} size={40} />

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.subMeta}>{describeLast(item)}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={11} color={Colors.primary} />
            <Text style={[styles.meta, { color: Colors.primary }]}>{dueLabel}</Text>
          </View>
          {overdueLabel ? <Text style={styles.overdue}>{overdueLabel}</Text> : null}
        </View>

        <TouchableOpacity
          style={styles.recheckBtn}
          onPress={() => startCheckup(item)}
          accessibilityRole="button"
          accessibilityLabel={`Re-checkup for ${item.name}`}
          activeOpacity={PressOpacity.default}
        >
          <Ionicons name="clipboard-outline" size={12} color={Colors.white} />
          <Text style={styles.recheckBtnText}>Re-checkup</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const subtitle =
    dueQuery.isPending || showLoadError
      ? null
      : dueClients.length === 0
        ? 'All up to date'
        : `${dueClients.length} due for re-checkup`;

  return (
    <View style={styles.container}>
      <TabRootHeader
        title="Checkups"
        subtitle={subtitle ?? undefined}
        onBack={() => navigateToDashboard(navigation)}
      />

      <View style={styles.body}>
        <SearchField
          style={styles.search}
          placeholder="Search name or mobile..."
          value={search}
          onChangeText={setSearch}
          accessibilityLabel="Search checkups"
        />

        {dueQuery.isPending && !dueQuery.data ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 30 }} />
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
          <FlatList
            data={visible}
            keyExtractor={(item, index) => item.clientCode ?? `${item.name}-${index}`}
            showsVerticalScrollIndicator={false}
            initialNumToRender={8}
            maxToRenderPerBatch={6}
            windowSize={5}
            contentContainerStyle={[
              visible.length === 0 ? styles.emptyWrap : undefined,
              { paddingBottom: Math.max(insets.bottom, 16) },
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
            renderItem={renderRow}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  body: { flex: 1, padding: Spacing.md },
  search: { marginBottom: Spacing.sm },
  emptyWrap: { flexGrow: 1 },
  errorWrap: { flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  info: { flex: 1, minWidth: 0, marginRight: 10 },
  name: { fontSize: 14, fontFamily: FontFamily.bold, color: Colors.textDark, lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 3, marginTop: 2 },
  meta: { fontSize: 11, fontFamily: FontFamily.bold, flexShrink: 1 },
  subMeta: { fontSize: 11, color: Colors.textLight, marginTop: 1 },
  overdue: { fontSize: 11, fontFamily: FontFamily.bold, color: Colors.primary, marginTop: 2 },
  recheckBtn: {
    flexShrink: 0,
    ...buttonStyles.compact,
    paddingHorizontal: Spacing.sm,
  },
  recheckBtnText: buttonStyles.compactText,
});
