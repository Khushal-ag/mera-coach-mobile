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
import { getClientList } from '../api/clientApi';
import { queryKeys } from '../api/queryKeys';
import { getCurrentCoachCode } from '../auth/session';
import { useRefreshControl } from '../hooks/useRefreshControl';
import { getErrorMessage } from '../api/client';
import {
  rankForRecheckup,
  needsRecheckup,
  describeCheckup,
  describeLastCheckup,
  describeRecheckupGate,
} from '../utils/recheckup';
import { stripNonDigits } from '../utils/validation';
import type { CheckupUrgency, RankedClient } from '../utils/recheckup';
import type { MainTabScreenProps } from '../types/navigation';
import type { IoniconName } from '../types/icons';

const URGENCY_STYLE: Record<CheckupUrgency, { color: string; bg: string; icon: IoniconName }> = {
  never: { color: Colors.primary, bg: Colors.primaryLight, icon: 'alert-circle-outline' },
  overdue: { color: Colors.primary, bg: Colors.primaryLight, icon: 'time-outline' },
  due: { color: Colors.accent, bg: Colors.accentLight, icon: 'hourglass-outline' },
  ok: { color: Colors.secondary, bg: Colors.secondaryLight, icon: 'checkmark-circle-outline' },
};

/** Empty only when the coach has no clients, or search matched nothing. */
function emptyStateFor(totalClients: number): {
  icon: IoniconName;
  title: string;
  message: string;
} {
  if (totalClients === 0) {
    return {
      icon: 'clipboard-outline',
      title: 'No clients yet',
      message: 'Add a client to start tracking their weekly BMI check-up schedule.',
    };
  }
  return {
    icon: 'search-outline',
    title: 'No matches',
    message: 'Try a different name or mobile number.',
  };
}

function headerSubtitle(dueCount: number, totalClients: number): string {
  if (totalClients === 0) return 'Weekly BMI check-ups';
  if (dueCount === 0) {
    return `All up to date · ${totalClients} client${totalClients === 1 ? '' : 's'}`;
  }
  return `${dueCount} need check-up · ${totalClients} client${totalClients === 1 ? '' : 's'}`;
}

export default function ReCheckupListScreen({ navigation }: MainTabScreenProps<'Checkups'>) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  // Same key as the dashboard and client list so all three share one cache entry.
  const clientsQuery = useQuery({
    queryKey: queryKeys.clientList(getCurrentCoachCode()),
    queryFn: () => getClientList(),
  });
  const refreshControl = useRefreshControl(clientsQuery);

  const clients = useMemo(() => clientsQuery.data ?? [], [clientsQuery.data]);
  const ranked = useMemo(() => rankForRecheckup(clients), [clients]);
  const dueCount = useMemo(() => ranked.filter(r => needsRecheckup(r.status)).length, [ranked]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return ranked;
    const digits = stripNonDigits(search);
    return ranked.filter(r => {
      if (r.client.name.toLowerCase().includes(term)) return true;
      return digits.length > 0 && (r.client.mobileNo ?? '').includes(digits);
    });
  }, [ranked, search]);

  const errorMessage = clientsQuery.isError
    ? getErrorMessage(clientsQuery.error, 'Could not load clients. Pull down to try again.')
    : null;

  const renderRow = ({ item }: { item: RankedClient }) => {
    const { client, status } = item;
    const tone = URGENCY_STYLE[status.urgency];
    const canRecheck = needsRecheckup(status);

    const startCheckup = () => {
      if (!canRecheck) return;
      navigation.navigate('ClientBmi', { client });
    };

    return (
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{client.initials || '?'}</Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>
            {client.name}
          </Text>
          <Text style={styles.subMeta}>{describeLastCheckup(status)}</Text>
          <View style={styles.metaRow}>
            <Ionicons name={tone.icon} size={11} color={tone.color} />
            <Text style={[styles.meta, { color: tone.color }]}>
              {canRecheck ? describeCheckup(status) : describeRecheckupGate(status)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.recheckBtn,
            canRecheck
              ? { backgroundColor: Colors.primary }
              : { backgroundColor: Colors.backgroundTan },
          ]}
          onPress={startCheckup}
          disabled={!canRecheck}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canRecheck }}
          accessibilityLabel={
            canRecheck
              ? `Re-checkup for ${client.name}`
              : `Re-checkup locked for ${client.name}. ${describeRecheckupGate(status)}`
          }
        >
          <Ionicons
            name={canRecheck ? 'clipboard-outline' : 'lock-closed-outline'}
            size={12}
            color={canRecheck ? Colors.white : Colors.textLight}
          />
          <Text
            style={[styles.recheckBtnText, { color: canRecheck ? Colors.white : Colors.textLight }]}
          >
            Re-checkup
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Checkups</Text>
        {!clientsQuery.isPending && !errorMessage ? (
          <Text style={styles.subtitle}>{headerSubtitle(dueCount, clients.length)}</Text>
        ) : null}
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

        {clientsQuery.isPending ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 30 }} />
        ) : errorMessage ? (
          <Text style={styles.error}>{errorMessage}</Text>
        ) : (
          <FlatList
            data={visible}
            keyExtractor={item => item.client.id ?? item.client.clientCode ?? item.client.name}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              visible.length === 0 ? styles.emptyWrap : undefined,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshControl.refreshing}
                onRefresh={refreshControl.onRefresh}
                tintColor={Colors.primary}
              />
            }
            ListEmptyComponent={<EmptyState {...emptyStateFor(clients.length)} />}
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
  },
  title: { color: Colors.white, fontSize: 22, fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600', marginTop: 4 },
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
  recheckBtn: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: Radius.pill,
  },
  recheckBtnText: { fontSize: 11, fontWeight: '700' },
  error: { textAlign: 'center', color: Colors.textLight, fontSize: 13, marginTop: 20 },
});
