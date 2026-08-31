import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../constants/theme';
import EmptyState from '../components/EmptyState';
import { HeaderHomeButton } from '../components/ScreenHeader';
import { getRecheckupList } from '../api/clientApi';
import { queryKeys } from '../api/queryKeys';
import { getCurrentCoachCode } from '../auth/session';
import { useRefreshControl, refreshControlTheme } from '../hooks/useRefreshControl';
import { getErrorMessage } from '../api/client';
import { stripNonDigits } from '../utils/validation';
import type { RecheckupDueClient, ClientSummary } from '../types/models';
import type { CheckupsStackScreenProps } from '../types/navigation';

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

  const startCheckup = (item: RecheckupDueClient) => {
    const client: ClientSummary = {
      id: item.clientCode,
      clientCode: item.clientCode,
      name: item.name,
      mobileNo: item.mobileNo,
      age: item.age,
      initials: item.initials,
      lastCheckupDate: item.lastCheckupDate,
    };
    navigation.navigate('ClientBmi', { client });
  };

  const renderRow = ({ item }: { item: RecheckupDueClient }) => (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.initials || '?'}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.subMeta}>{describeLast(item)}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={11} color={Colors.primary} />
          <Text style={[styles.meta, { color: Colors.primary }]}>{describeDue(item)}</Text>
        </View>
        <Text style={styles.overdue}>{describeOverdue(item.daysOverdue)}</Text>
      </View>

      <TouchableOpacity
        style={styles.recheckBtn}
        onPress={() => startCheckup(item)}
        accessibilityRole="button"
        accessibilityLabel={`Re-checkup for ${item.name}`}
      >
        <Ionicons name="clipboard-outline" size={12} color={Colors.white} />
        <Text style={styles.recheckBtnText}>Re-checkup</Text>
      </TouchableOpacity>
    </View>
  );

  const subtitle =
    dueQuery.isPending || errorMessage
      ? null
      : dueClients.length === 0
        ? 'All up to date'
        : `${dueClients.length} due for re-checkup`;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Checkups</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <HeaderHomeButton />
      </View>

      <View style={styles.body}>
        <View style={styles.searchWrap}>
          <Ionicons
            name="search-outline"
            size={18}
            color={Colors.textLight}
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name or mobile..."
            placeholderTextColor={Colors.textLight}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {dueQuery.isPending ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 30 }} />
        ) : errorMessage ? (
          <Text style={styles.error}>{errorMessage}</Text>
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
                icon={search.trim() ? 'search-outline' : 'checkmark-circle-outline'}
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
  header: {
    backgroundColor: Colors.secondary,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: { flex: 1, marginRight: 12 },
  title: { color: Colors.white, fontSize: 22, fontWeight: '800' },
  subtitle: { color: Colors.onDarkMuted, fontSize: 13, fontWeight: '600', marginTop: 4 },
  body: { flex: 1, padding: 20 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    height: 46,
    ...Shadow.sm,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textDark },
  emptyWrap: { flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    ...Shadow.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  info: { flex: 1, minWidth: 0, marginRight: 10 },
  name: { fontSize: 14, fontWeight: '700', color: Colors.textDark, lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 3, marginTop: 2 },
  meta: { fontSize: 11, fontWeight: '700', flexShrink: 1 },
  subMeta: { fontSize: 11, color: Colors.textLight, marginTop: 1 },
  overdue: { fontSize: 11, fontWeight: '700', color: Colors.primary, marginTop: 2 },
  recheckBtn: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
  },
  recheckBtnText: { fontSize: 11, fontWeight: '700', color: Colors.white },
  error: { textAlign: 'center', color: Colors.textLight, fontSize: 13, marginTop: 20 },
});
