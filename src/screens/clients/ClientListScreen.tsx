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
  headingFont,
} from '../../constants/theme';
import { BrandImages } from '../../constants/images';
import EmptyState from '../../components/EmptyState';
import ListPager from '../../components/ListPager';
import ReloadState from '../../components/ReloadState';
import ClientAvatar from '../../components/ClientAvatar';
import SearchField from '../../components/SearchField';
import SectionTag from '../../components/SectionTag';
import WaveScreenHeader, {
  WaveHeaderActionButton,
} from '../../components/WaveScreenHeader';
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

const PAGE_SIZE = 5;

function checkupLine(item: ClientSummary): string {
  const raw = lastCheckupLabel(item.lastCheckupDate);
  if (raw === 'No check-up recorded') return raw;
  return raw.replace(/^Last check-up\s+/i, 'Last Check-up : ');
}

export default function ClientListScreen({
  navigation,
}: ClientsStackScreenProps<'ClientListHome'>) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  const errorMessage = clientsQuery.isError
    ? getErrorMessage(clientsQuery.error, 'Could not load clients. Pull down to try again.')
    : null;
  const showLoadError = !!errorMessage && clients.length === 0;
  const totalCount = clients.length;
  const totalLabel = totalCount === 1 ? '1 Client' : `${totalCount} Clients`;

  const onSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const goAddClient = () => navigation.navigate('AddClient');
  const goClientDetail = (item: ClientSummary) =>
    navigation.navigate('ClientDetail', { client: item });

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
      <WaveScreenHeader
        title="My Clients"
        titleIcon="people-outline"
        onBack={() => navigateToDashboard(navigation)}
        onHome={() => navigateToDashboard(navigation)}
        rightExtra={
          <WaveHeaderActionButton
            icon="add-outline"
            onPress={goAddClient}
            accessibilityLabel="Add client"
          />
        }
      />

      <View style={styles.body}>
        <SectionTag icon="person-outline" label="Client roster" />

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
          onChangeText={onSearchChange}
          accessibilityLabel="Search clients"
        />

        {clientsQuery.isPending && !clientsQuery.data ? (
          <ActivityIndicator color={Colors.secondary} style={{ marginTop: 30 }} />
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
            data={pageItems}
            keyExtractor={item => item.id ?? item.clientCode ?? item.name}
            showsVerticalScrollIndicator={false}
            initialNumToRender={8}
            maxToRenderPerBatch={6}
            windowSize={5}
            contentContainerStyle={[
              filtered.length === 0 ? styles.emptyWrap : undefined,
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
                {...emptyState}
                {...(clients.length === 0
                  ? {
                      actionLabel: 'Add client',
                      onAction: goAddClient,
                    }
                  : {})}
              />
            }
            ListFooterComponent={
              filtered.length > PAGE_SIZE ? (
                <ListPager
                  page={safePage}
                  totalPages={totalPages}
                  onChangePage={setPage}
                  variant="square"
                />
              ) : null
            }
            renderItem={({ item }) => {
              const mobile = (item.mobileNo ?? '').trim();
              return (
                <View style={styles.card}>
                  <ClientAvatar
                    clientCode={item.clientCode}
                    width={ListPortrait.width}
                    height={ListPortrait.height}
                    borderRadius={ListPortrait.radius}
                    allowUpload
                    style={styles.avatar}
                  />
                  <View style={styles.middle}>
                    <View style={styles.textRow}>
                      <TouchableOpacity
                        style={styles.info}
                        onPress={() => goClientDetail(item)}
                        activeOpacity={PressOpacity.strong}
                        accessibilityRole="button"
                        accessibilityLabel={`Open ${item.name}`}
                      >
                        <Text style={styles.name} numberOfLines={1}>
                          {item.name}
                        </Text>
                        {item.age != null ? (
                          <Text style={styles.meta} numberOfLines={1}>
                            Age: {item.age}
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
                      </TouchableOpacity>
                      <Ionicons
                        name="chevron-forward-outline"
                        size={IconSize.lg}
                        color={Colors.textDark}
                        style={styles.chevron}
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.selectBtn}
                      onPress={() => goClientDetail(item)}
                      activeOpacity={PressOpacity.default}
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${item.name}`}
                    >
                      <Text style={styles.selectBtnText}>Select</Text>
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
  body: {
    flex: 1,
    paddingHorizontal: ScreenPad.horizontal,
    paddingTop: Spacing.sm,
  },
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.secondaryMuted,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm + 2,
    marginBottom: Spacing.sm,
  },
  totalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
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
    fontSize: 16,
    fontFamily: headingFont.bold,
    color: Colors.textDark,
    marginTop: 1,
  },
  search: { marginBottom: Spacing.sm },
  emptyWrap: { flexGrow: 1 },
  errorWrap: { flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: ListCard.minHeight,
    backgroundColor: Colors.white,
    borderRadius: ListCard.radius,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    borderWidth: ListCard.borderWidth,
    borderColor: ListCard.borderColor,
    padding: ListPortrait.contentPad,
  },
  avatar: {
    marginRight: Spacing.sm,
  },
  middle: {
    flex: 1,
    minWidth: 0,
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  info: { flex: 1, minWidth: 0, paddingRight: Spacing.xs },
  chevron: { marginLeft: Spacing.xxs },
  name: {
    fontSize: 18,
    fontFamily: headingFont.bold,
    color: Colors.textDark,
    lineHeight: 24,
  },
  meta: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.textDark,
    marginTop: 3,
    lineHeight: 18,
  },
  selectBtn: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    minHeight: 40,
  },
  selectBtnText: {
    color: Colors.white,
    fontSize: 14,
    fontFamily: FontFamily.bold,
  },
});
