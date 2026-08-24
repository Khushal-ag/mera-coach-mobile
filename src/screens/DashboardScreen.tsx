import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Shadow } from '../constants/theme';
import { getClientList } from '../api/clientApi';
import { getCoachProfile } from '../api/coachApi';
import { queryKeys } from '../api/queryKeys';
import { getCurrentCoachCode, getCurrentCoachName } from '../auth/session';
import { getErrorMessage } from '../api/client';
import { dueForRecheckup } from '../utils/recheckup';
import type { MainTabScreenProps } from '../types/navigation';
import type { IoniconName } from '../types/icons';

function greetingForNow(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

interface StatCard {
  label: string;
  icon: IoniconName;
  color: string;
  bg: string;
  /** null marks a stat whose data source does not exist yet — rendered as "Coming soon". */
  value: string | null;
  onPress?: () => void;
}

export default function DashboardScreen({ navigation }: MainTabScreenProps<'Dashboard'>) {
  const insets = useSafeAreaInsets();
  const clientsQuery = useQuery({
    queryKey: queryKeys.clientList(getCurrentCoachCode()),
    queryFn: () => getClientList(),
  });
  const profileQuery = useQuery({
    queryKey: queryKeys.coachProfile,
    queryFn: getCoachProfile,
  });
  const clients = clientsQuery.data ?? null;
  const coachName = profileQuery.data?.name || getCurrentCoachName() || 'Coach';

  const onRefresh = useCallback(() => {
    Promise.all([clientsQuery.refetch(), profileQuery.refetch()]).then(([clientsResult]) => {
      if (clientsResult.isError) {
        Alert.alert('Refresh failed', getErrorMessage(clientsResult.error, 'Please try again.'));
      }
    });
  }, [clientsQuery, profileQuery]);

  const clientsErrorMessage =
    clientsQuery.isError && !clients
      ? getErrorMessage(clientsQuery.error, 'Could not load client count.')
      : null;

  const recentClients = useMemo(() => (clients ?? []).slice(0, 3), [clients]);

  // Same due-only list as the Checkups tab.
  const dueCount = useMemo(() => (clients ? dueForRecheckup(clients).length : null), [clients]);

  const stats: StatCard[] = [
    {
      label: 'Total Clients',
      value: clients ? String(clients.length) : '—',
      icon: 'people',
      color: Colors.secondary,
      bg: Colors.secondaryLight,
      onPress: () => navigation.navigate('Clients'),
    },
    {
      // No leads endpoint exists yet — see MyLeadsScreen.
      label: 'Active Leads',
      value: null,
      icon: 'funnel',
      color: Colors.accent,
      bg: Colors.accentLight,
    },
    {
      label: 'Checkups Due',
      value: dueCount != null ? String(dueCount) : '—',
      icon: 'clipboard',
      color: Colors.primary,
      bg: Colors.primaryLight,
      onPress: () => navigation.navigate('Checkups'),
    },
    {
      // ClientList carries no signup/created date, so new-clients-this-month is not derivable.
      label: 'New This Month',
      value: null,
      icon: 'calendar',
      color: '#7c3aed',
      bg: '#ede9fe',
    },
  ];

  // Three outcomes share this slot: still loading, a load failure with nothing cached, or a
  // genuinely empty client list. The last two get the same card shape with different copy so
  // a network blip never reads as "you have no clients".
  function renderRecentClients() {
    if (clientsQuery.isPending) {
      return (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={Colors.secondary} />
          <Text style={styles.loadingText}>Loading clients</Text>
        </View>
      );
    }

    if (recentClients.length === 0) {
      const failed = clientsErrorMessage != null;
      return (
        <View style={styles.emptyCard}>
          <View style={[styles.emptyIcon, failed && styles.emptyIconFailed]}>
            <Ionicons
              name={failed ? 'cloud-offline-outline' : 'people-outline'}
              size={24}
              color={failed ? Colors.primary : Colors.secondary}
            />
          </View>
          <Text style={styles.emptyTitle}>
            {failed ? 'Could not load clients' : 'No clients yet'}
          </Text>
          <Text style={styles.emptyBody}>
            {failed
              ? 'Check your connection and try again.'
              : 'Add your first client to start tracking their plan and check-ups.'}
          </Text>
          <TouchableOpacity
            style={styles.emptyCta}
            onPress={failed ? onRefresh : () => navigation.navigate('AddClient')}
          >
            <Ionicons name={failed ? 'refresh' : 'person-add'} size={16} color={Colors.white} />
            <Text style={styles.emptyCtaText}>{failed ? 'Retry' : 'Add Client'}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return recentClients.map((c, i) => (
      <TouchableOpacity
        key={c.clientCode || c.id || String(i)}
        style={styles.clientRow}
        onPress={() => navigation.navigate('ClientDetail', { client: c })}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{c.initials || '?'}</Text>
        </View>
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>{c.name}</Text>
          {c.goal ? <Text style={styles.clientGoal}>{c.goal}</Text> : null}
        </View>
        {c.status ? (
          <View
            style={[
              styles.statusBadge,
              c.status === 'Active' ? styles.statusActive : styles.statusWarning,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                c.status === 'Active' ? styles.statusActiveText : styles.statusWarningText,
              ]}
            >
              {c.status}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    ));
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={clientsQuery.isRefetching || profileQuery.isRefetching}
          onRefresh={onRefresh}
          tintColor={Colors.secondary}
        />
      }
    >
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.headerText}>
          <Text style={styles.greeting}>{greetingForNow()},</Text>
          <Text style={styles.coachName}>{coachName}</Text>
        </View>
        <TouchableOpacity
          style={styles.notifBtn}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Ionicons name="notifications-outline" size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <Text style={styles.sectionTitle}>Overview</Text>
        {clientsErrorMessage ? <Text style={styles.statsError}>{clientsErrorMessage}</Text> : null}
        <View style={styles.statsGrid}>
          {stats.map(stat => {
            const pending = stat.value === null;
            return (
              <TouchableOpacity
                key={stat.label}
                style={[styles.statCard, { backgroundColor: pending ? Colors.white : stat.bg }]}
                onPress={stat.onPress}
                disabled={pending || !stat.onPress}
                accessibilityState={{ disabled: pending }}
                accessibilityLabel={
                  pending ? `${stat.label}: coming soon` : `${stat.label}: ${stat.value}`
                }
              >
                <View
                  style={[
                    styles.statIcon,
                    { backgroundColor: pending ? Colors.border : stat.color },
                  ]}
                >
                  <Ionicons
                    name={stat.icon}
                    size={18}
                    color={pending ? Colors.textLight : Colors.white}
                  />
                </View>
                <View style={styles.statValueRow}>
                  {pending ? (
                    <View style={styles.soonPill}>
                      <Text style={styles.soonPillText}>Coming soon</Text>
                    </View>
                  ) : (
                    <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                  )}
                </View>
                <Text style={[styles.statLabel, pending && styles.statLabelPending]}>
                  {stat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('AddClient')}
          >
            <View style={[styles.actionIcon, { backgroundColor: Colors.primaryLight }]}>
              <Ionicons name="person-add" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.actionText}>Add Client</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Clients')}>
            <View style={[styles.actionIcon, { backgroundColor: Colors.secondaryLight }]}>
              <Ionicons name="people" size={20} color={Colors.secondary} />
            </View>
            <Text style={styles.actionText}>All Clients</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Checkups')}
          >
            <View style={[styles.actionIcon, { backgroundColor: Colors.accentLight }]}>
              <Ionicons name="clipboard" size={20} color={Colors.accent} />
            </View>
            <Text style={styles.actionText}>Checkups</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Leads')}>
            <View style={[styles.actionIcon, { backgroundColor: '#ede9fe' }]}>
              <Ionicons name="funnel" size={20} color="#7c3aed" />
            </View>
            <Text style={styles.actionText}>My Leads</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Clients</Text>
          {recentClients.length > 0 ? (
            <TouchableOpacity onPress={() => navigation.navigate('Clients')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {renderRecentClients()}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.secondary,
    paddingBottom: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: { flex: 1 },
  greeting: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  coachName: { color: Colors.white, fontSize: 22, fontWeight: '800', marginTop: 2 },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 12,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  seeAll: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  statsError: { fontSize: 12, color: Colors.accent, marginBottom: 10, marginTop: -6 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  statCard: {
    width: '47%',
    borderRadius: Radius.md,
    padding: 16,
    alignItems: 'flex-start',
    ...Shadow.sm,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  // Keeps the coming-soon pill and a real stat number on the same baseline so the grid stays even.
  statValueRow: { minHeight: 34, justifyContent: 'center' },
  statValue: { fontSize: 26, fontWeight: '800' },
  statLabel: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  statLabelPending: { color: Colors.textLight, opacity: 0.75 },
  soonPill: {
    backgroundColor: Colors.backgroundTan,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  soonPillText: { fontSize: 10, fontWeight: '700', color: Colors.textLight },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  actionBtn: { alignItems: 'center', width: '23%' },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionText: { fontSize: 11, color: Colors.textDark, fontWeight: '600', textAlign: 'center' },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    paddingVertical: 22,
    marginTop: 4,
    ...Shadow.sm,
  },
  loadingText: { fontSize: 13, color: Colors.textLight },
  // Dashed border reads as an empty slot waiting to be filled, rather than a card that failed
  // to load. Solid white with a shadow is reserved for rows that hold real data.
  emptyCard: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    paddingVertical: 26,
    paddingHorizontal: 24,
    marginTop: 4,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyIconFailed: { backgroundColor: Colors.primaryLight },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: Colors.textDark, marginBottom: 4 },
  emptyBody: {
    fontSize: 13,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  emptyCtaText: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 14,
    marginTop: 10,
    ...Shadow.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  clientGoal: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  statusBadge: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  statusActive: { backgroundColor: Colors.secondaryLight },
  statusWarning: { backgroundColor: Colors.accentLight },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusActiveText: { color: Colors.secondary },
  statusWarningText: { color: Colors.accent },
});
