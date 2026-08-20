import React, { useState } from 'react';
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
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../constants/theme';
import { getClientList } from '../api/clientApi';
import { queryKeys } from '../api/queryKeys';
import { getCurrentCoachCode } from '../auth/session';
import { useRefreshControl } from '../hooks/useRefreshControl';
import { getErrorMessage } from '../api/client';
import type { MainTabScreenProps } from '../types/navigation';

export default function ClientListScreen({ navigation }: MainTabScreenProps<'Clients'>) {
  const [search, setSearch] = useState('');

  const clientsQuery = useQuery({
    queryKey: queryKeys.clientList(getCurrentCoachCode()),
    queryFn: () => getClientList(),
  });
  const refreshControl = useRefreshControl(clientsQuery);
  const clients = clientsQuery.data ?? [];
  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  const errorMessage = clientsQuery.isError
    ? getErrorMessage(clientsQuery.error, 'Could not load clients. Pull down to try again.')
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Clients</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddClient')}>
          <Ionicons name="add" size={22} color={Colors.white} />
        </TouchableOpacity>
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
            placeholder="Search clients..."
            placeholderTextColor={Colors.textLight}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {clientsQuery.isPending ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 30 }} />
        ) : errorMessage ? (
          <Text style={styles.empty}>{errorMessage}</Text>
        ) : (
          <>
            <Text style={styles.count}>{filtered.length} clients</Text>

            <FlatList
              data={filtered}
              keyExtractor={item => item.id ?? item.name}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshControl.refreshing}
                  onRefresh={refreshControl.onRefresh}
                  tintColor={Colors.primary}
                />
              }
              ListEmptyComponent={
                <Text style={styles.empty}>No clients yet. Tap + to add your first one.</Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.card}
                  onPress={() => navigation.navigate('ClientDetail', { client: item })}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.initials || '?'}</Text>
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.meta}>
                      {item.age ? `Age ${item.age}` : item.goal || ''}
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
              )}
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
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { color: Colors.white, fontSize: 22, fontWeight: '800' },
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: 10,
    ...Shadow.sm,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: Colors.textDark },
  meta: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  badge: { borderRadius: Radius.pill, paddingHorizontal: 9, paddingVertical: 3 },
  badgeActive: { backgroundColor: Colors.secondaryLight },
  badgeWarning: { backgroundColor: Colors.accentLight },
  badgeNew: { backgroundColor: Colors.primaryLight },
  badgeText: { fontSize: 10, fontWeight: '700' },
  badgeActiveText: { color: Colors.secondary },
  badgeWarningText: { color: Colors.accent },
  badgeNewText: { color: Colors.primary },
  empty: { textAlign: 'center', color: Colors.textLight, fontSize: 13, marginTop: 20 },
});
