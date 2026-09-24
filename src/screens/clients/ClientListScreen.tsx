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
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Colors,
  FontFamily,
  PressOpacity,
  Radius,
  Shadow,
  Spacing,
  TouchTarget,
  Typography,
  headingFont,
} from '../../constants/theme';
import { BrandImages } from '../../constants/images';
import EmptyState from '../../components/EmptyState';
import ReloadState from '../../components/ReloadState';
import ClientAvatar from '../../components/ClientAvatar';
import ClientStatusChip from '../../components/ClientStatusChip';
import SearchField from '../../components/SearchField';
import SectionTag from '../../components/SectionTag';
import { HeaderBackButton, HeaderHomeButton } from '../../components/ScreenHeader';
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

function checkupLine(item: ClientSummary): string {
  const raw = lastCheckupLabel(item.lastCheckupDate);
  if (raw === 'No check-up recorded') return raw;
  return raw.replace(/^Last check-up\s+/i, 'Last Check-up : ');
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
  const totalCount = clients.length;
  const totalLabel = totalCount === 1 ? '1 Client' : `${totalCount} Clients`;

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
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <HeaderBackButton onPress={() => navigateToDashboard(navigation)} onDark={false} />
        <View style={styles.headerTitleRow}>
          <Ionicons name="people" size={22} color={Colors.secondary} />
          <Text style={styles.headerTitle}>My Clients</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('AddClient')}
            accessibilityRole="button"
            accessibilityLabel="Add client"
            activeOpacity={PressOpacity.default}
          >
            <Ionicons name="add" size={22} color={Colors.white} />
          </TouchableOpacity>
          <HeaderHomeButton onDark={false} />
        </View>
      </View>

      <View style={styles.body}>
        <SectionTag icon="people-outline" label="Client roster" />

        <View style={styles.totalCard} accessibilityRole="text" accessibilityLabel={totalLabel}>
          <View style={styles.totalIcon}>
            <Ionicons name="people-outline" size={22} color={Colors.secondary} />
          </View>
          <View style={styles.totalCopy}>
            <Text style={styles.totalEyebrow}>Total Clients</Text>
            <Text style={styles.totalValue}>{totalLabel}</Text>
          </View>
        </View>

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
          <FlatList
            data={filtered}
            keyExtractor={item => item.id ?? item.clientCode ?? item.name}
            showsVerticalScrollIndicator={false}
            initialNumToRender={8}
            maxToRenderPerBatch={6}
            windowSize={5}
            contentContainerStyle={[
              filtered.length === 0 ? styles.emptyWrap : undefined,
              { paddingBottom: Spacing.md },
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
              const mobile = (item.mobileNo ?? '').trim();
              return (
                <View style={styles.card}>
                  <ClientAvatar clientCode={item.clientCode} size={82} allowUpload />
                  <View style={styles.cardBody}>
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
                          {item.age ? (
                            <Text style={styles.metaInline}>{`  Age: ${item.age}`}</Text>
                          ) : null}
                        </Text>
                        {item.goal ? (
                          <Text style={styles.meta} numberOfLines={1}>
                            {item.goal}
                          </Text>
                        ) : null}
                        {mobile ? (
                          <Text style={styles.meta} numberOfLines={1}>
                            {mobile}
                          </Text>
                        ) : null}
                        <Text style={styles.meta} numberOfLines={1}>
                          {checkupLine(item)}
                        </Text>
                      </View>
                      {item.status ? <ClientStatusChip status={item.status} /> : null}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.selectBtn}
                      onPress={() => navigation.navigate('ClientDetail', { client: item })}
                      activeOpacity={PressOpacity.default}
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${item.name}`}
                    >
                      <Text style={styles.selectBtnText}>Select</Text>
                      <Ionicons name="chevron-forward" size={14} color={Colors.white} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
    gap: Spacing.xs,
  },
  headerTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  headerTitle: {
    color: Colors.secondary,
    fontSize: 18,
    fontFamily: headingFont.extraBold,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  addBtn: {
    width: TouchTarget.header,
    height: TouchTarget.header,
    borderRadius: TouchTarget.header / 2,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm + 2,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  totalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalCopy: { flex: 1, minWidth: 0 },
  totalEyebrow: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    color: Colors.textLight,
  },
  totalValue: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    color: Colors.textDark,
    marginTop: 1,
  },
  search: { marginBottom: Spacing.sm },
  emptyWrap: { flexGrow: 1 },
  errorWrap: { flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.sm + 2,
    marginBottom: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    minHeight: 132,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  cardBody: { flex: 1, minWidth: 0, justifyContent: 'space-between' },
  cardMain: { flexDirection: 'row', alignItems: 'flex-start', minWidth: 0 },
  info: { flex: 1, minWidth: 0 },
  name: { ...Typography.bodyStrong, fontFamily: headingFont.bold, fontSize: 15 },
  metaInline: {
    ...Typography.caption,
    fontFamily: FontFamily.medium,
    color: Colors.textLight,
  },
  meta: { ...Typography.caption, marginTop: 2 },
  selectBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.secondary,
    borderRadius: Radius.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    marginTop: Spacing.xs,
  },
  selectBtnText: {
    color: Colors.white,
    fontSize: 12,
    fontFamily: FontFamily.bold,
  },
});
