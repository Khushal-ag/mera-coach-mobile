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
import ClientAvatar from '../components/ClientAvatar';
import { HeaderHomeButton } from '../components/ScreenHeader';
import { getClientList } from '../api/clientApi';
import { queryKeys } from '../api/queryKeys';
import { getCurrentCoachCode } from '../auth/session';
import { useRefreshControl, refreshControlTheme } from '../hooks/useRefreshControl';
import { getErrorMessage } from '../api/client';
import { stripNonDigits } from '../utils/validation';
import { lastCheckupLabel } from '../utils/recheckup';
import type { ClientsStackScreenProps } from '../types/navigation';
import type { ClientSummary } from '../types/models';

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

  const emptyState =
    clients.length === 0
      ? {
          icon: 'people-outline' as const,
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
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>My Clients</Text>
        <View style={styles.headerActions}>
          <HeaderHomeButton />
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('AddClient')}
            accessibilityLabel="Add client"
          >
            <Ionicons name="add" size={22} color={Colors.white} />
          </TouchableOpacity>
        </View>
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
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        {clientsQuery.isPending ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 30 }} />
        ) : errorMessage ? (
          <Text style={styles.error}>{errorMessage}</Text>
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
              ListEmptyComponent={<EmptyState {...emptyState} />}
              renderItem={({ item }) => {
                const meta = clientMeta(item);
                const mobile = (item.mobileNo ?? '').trim();
                return (
                  <View style={styles.card}>
                    <ClientAvatar
                      clientCode={item.clientCode}
                      initials={item.initials}
                      size={46}
                      allowUpload
                    />
                    <TouchableOpacity
                      style={styles.cardMain}
                      onPress={() => navigation.navigate('ClientDetail', { client: item })}
                      activeOpacity={0.7}
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
                      {item.status ? (
                        <View
                          style={[
                            styles.badge,
                            item.status === 'Active' && styles.badgeActive,
                            item.status === 'Checkup Due' && styles.badgeWarning,
                            item.status === 'New' && styles.badgeNew,
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeText,
                              item.status === 'Active' && styles.badgeActiveText,
                              item.status === 'Checkup Due' && styles.badgeWarningText,
                              item.status === 'New' && styles.badgeNewText,
                            ]}
                          >
                            {item.status}
                          </Text>
                        </View>
                      ) : null}
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
  header: {
    backgroundColor: Colors.secondary,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { color: Colors.white, fontSize: 22, fontWeight: '800' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  count: { fontSize: 12, color: Colors.textLight, marginBottom: 10, fontWeight: '600' },
  emptyWrap: { flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: 10,
    ...Shadow.sm,
  },
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0 },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: '700', color: Colors.textDark },
  meta: { fontSize: 12, color: Colors.textLight, marginTop: 1 },
  badge: { borderRadius: Radius.pill, paddingHorizontal: 9, paddingVertical: 3 },
  badgeActive: { backgroundColor: Colors.secondaryLight },
  badgeWarning: { backgroundColor: Colors.accentLight },
  badgeNew: { backgroundColor: Colors.primaryLight },
  badgeText: { fontSize: 10, fontWeight: '700' },
  badgeActiveText: { color: Colors.secondary },
  badgeWarningText: { color: Colors.accent },
  badgeNewText: { color: Colors.primary },
  error: { textAlign: 'center', color: Colors.textLight, fontSize: 13, marginTop: 20 },
});
