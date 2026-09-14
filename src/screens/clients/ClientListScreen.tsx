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
  TouchTarget,
  Typography,
} from '../../constants/theme';
import { BrandImages } from '../../constants/images';
import EmptyState from '../../components/EmptyState';
import ReloadState from '../../components/ReloadState';
import ClientAvatar from '../../components/ClientAvatar';
import ClientStatusChip from '../../components/ClientStatusChip';
import SearchField from '../../components/SearchField';
import TabRootHeader from '../../components/TabRootHeader';
import SectionTag from '../../components/SectionTag';
import { getClientList } from '../../api/clientApi';
import { queryKeys } from '../../api/queryKeys';
import { getCurrentCoachCode } from '../../auth/session';
import { useRefreshControl, refreshControlTheme } from '../../hooks/useRefreshControl';
import { getErrorMessage } from '../../api/client';
import { stripNonDigits } from '../../utils/validation';
import { lastCheckupLabel } from '../../utils/recheckup';
import type { ClientsStackScreenProps } from '../../types/navigation';
import type { ClientSummary } from '../../types/models';
import { navigateToDashboard } from '../../utils/navigationBack';

function clientMeta(item: ClientSummary): string {
  const parts: string[] = [];
  if (item.age) parts.push(`Age ${item.age}`);
  if (item.goal) parts.push(item.goal);
  return parts.join(' · ');
}

export default function ClientListScreen({
  navigation,
}: ClientsStackScreenProps<'ClientListHome'>) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  const clientsQuery = useQuery({
    queryKey: queryKeys.clientList(getCurrentCoachCode()),
    queryFn: () => getClientList(),
  });
  const refreshControl = useRefreshControl(clientsQuery);
  const clients = useMemo(() => clientsQuery.data ?? [], [clientsQuery.data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clients;
    const digits = stripNonDigits(search);
    return clients.filter(c => {
      if (c.name.toLowerCase().includes(term)) return true;
      return digits.length > 0 && (c.mobileNo ?? '').includes(digits);
    });
  }, [clients, search]);

  const errorMessage = clientsQuery.isError
    ? getErrorMessage(clientsQuery.error, 'Could not load clients. Pull down to try again.')
    : null;
  const showLoadError = !!errorMessage && clients.length === 0;

  const emptyState =
    clients.length === 0
      ? {
          illustration: BrandImages.emptyClients,
          title: 'No clients yet',
          message: 'Tap + to add your first client and start their assessment.',
        }
      : {
          icon: 'search-outline' as const,
          title: 'No matches',
          message: 'Try a different name or mobile number.',
        };

  return (
    <View style={styles.container}>
      <TabRootHeader
        title="My Clients"
        onBack={() => navigateToDashboard(navigation)}
        right={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('AddClient')}
            accessibilityRole="button"
            accessibilityLabel="Add client"
            activeOpacity={PressOpacity.default}
          >
            <Ionicons name="add" size={22} color={Colors.white} />
          </TouchableOpacity>
        }
      />

      <View style={styles.body}>
        <SectionTag icon="people-outline" label="Client roster" />
        <SearchField
          style={styles.search}
          placeholder="Search name or mobile..."
          value={search}
          onChangeText={setSearch}
          accessibilityLabel="Search clients"
        />

        {clientsQuery.isPending && !clientsQuery.data ? (
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
              illustration={BrandImages.emptyClients}
              title="Could not load clients"
              message={errorMessage!}
              onRetry={() => void clientsQuery.refetch()}
              loading={clientsQuery.isFetching}
            />
          </ScrollView>
        ) : (
          <>
            <Text style={styles.count}>
              {filtered.length} {filtered.length === 1 ? 'client' : 'clients'}
            </Text>

            <FlatList
              data={filtered}
              keyExtractor={item => item.id ?? item.clientCode ?? item.name}
              showsVerticalScrollIndicator={false}
              // Keep photo N+1 bounded to near-viewport rows (virtualization already helps).
              initialNumToRender={8}
              maxToRenderPerBatch={6}
              windowSize={5}
              contentContainerStyle={[
                filtered.length === 0 ? styles.emptyWrap : undefined,
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
                  {...emptyState}
                  {...(clients.length === 0
                    ? {
                        actionLabel: 'Add client',
                        onAction: () => navigation.navigate('AddClient'),
                      }
                    : {})}
                />
              }
              renderItem={({ item }) => {
                const meta = clientMeta(item);
                const mobile = (item.mobileNo ?? '').trim();
                return (
                  <View style={styles.card}>
                    <ClientAvatar clientCode={item.clientCode} size={46} allowUpload />
                    <TouchableOpacity
                      style={styles.cardMain}
                      onPress={() => navigation.navigate('ClientDetail', { client: item })}
                      activeOpacity={PressOpacity.strong}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${item.name}`}
                    >
                      <View style={styles.info}>
                        <Text style={styles.name} numberOfLines={1}>
                          {item.name}
                        </Text>
                        {meta ? (
                          <Text style={styles.meta} numberOfLines={1}>
                            {meta}
                          </Text>
                        ) : null}
                        {mobile ? (
                          <Text style={styles.meta} numberOfLines={1}>
                            {mobile}
                          </Text>
                        ) : null}
                        <Text style={styles.meta} numberOfLines={1}>
                          {lastCheckupLabel(item.lastCheckupDate)}
                        </Text>
                      </View>
                      {item.status ? <ClientStatusChip status={item.status} /> : null}
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={Colors.border}
                        style={{ marginLeft: 6 }}
                      />
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  addBtn: {
    width: TouchTarget.header,
    height: TouchTarget.header,
    borderRadius: TouchTarget.header / 2,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, padding: Spacing.md },
  search: { marginBottom: Spacing.sm },
  count: {
    ...Typography.caption,
    fontFamily: FontFamily.semibold,
    marginBottom: Spacing.sm - 2,
  },
  emptyWrap: { flexGrow: 1 },
  errorWrap: { flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.sm + 2,
    marginBottom: Spacing.sm - 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0 },
  info: { flex: 1, minWidth: 0 },
  name: { ...Typography.bodyStrong, fontFamily: FontFamily.bold, fontSize: 15 },
  meta: { ...Typography.caption, marginTop: 1 },
});
