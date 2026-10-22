import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  type ListRenderItem,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import {
  Colors,
  FontFamily,
  ListCard,
  PressOpacity,
  ScreenPad,
  Spacing,
  headingFont,
} from '../../constants/theme';
import { BrandImages } from '../../constants/images';
import AppButton from '../../components/AppButton';
import FormErrorBanner from '../../components/FormErrorBanner';
import EmptyState from '../../components/EmptyState';
import ListPager from '../../components/ListPager';
import ReloadState from '../../components/ReloadState';
import ClientAvatar from '../../components/ClientAvatar';
import SearchField from '../../components/SearchField';
import WaveScreenHeader from '../../components/WaveScreenHeader';
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
import { useOpenAddClient } from '../../hooks/useOpenAddClient';

const PAGE_SIZE = 5;
/** Figma client row portrait (leads match; checkups stay on ListPortrait). */
const CLIENT_PORTRAIT = { width: 82, height: 91, radius: 12 } as const;

function checkupLine(item: ClientSummary): string {
  const raw = lastCheckupLabel(item.lastCheckupDate);
  if (raw === 'No check-up recorded') return raw;
  return raw.replace(/^Last check-up\s+/i, 'Last Check-up : ');
}

const ClientRow = React.memo(function ClientRow({
  item,
  onOpen,
  onUploadError,
}: {
  item: ClientSummary;
  onOpen: (item: ClientSummary) => void;
  onUploadError: (message: string | null) => void;
}) {
  const mobile = (item.mobileNo ?? '').trim();
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onOpen(item)}
      activeOpacity={PressOpacity.strong}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.name}`}
    >
      <ClientAvatar
        clientCode={item.clientCode}
        width={CLIENT_PORTRAIT.width}
        height={CLIENT_PORTRAIT.height}
        borderRadius={CLIENT_PORTRAIT.radius}
        allowUpload
        onUploadError={onUploadError}
        style={styles.avatar}
      />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          Age: {item.age != null ? item.age : '-'}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {mobile || '-'}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {checkupLine(item)}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

export default function ClientListScreen({
  navigation,
}: ClientsStackScreenProps<'ClientListHome'>) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);

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
  const showPageAdd =
    clients.length > 0 || showLoadError || (clientsQuery.isPending && !clientsQuery.data);

  const onSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const { openAddClient, checkingSubscription, subscriptionError } = useOpenAddClient();
  const goAddClient = useCallback(() => {
    void openAddClient();
  }, [openAddClient]);
  const goClientDetail = useCallback(
    (item: ClientSummary) => navigation.navigate('ClientDetail', { client: item }),
    [navigation],
  );

  const emptyState =
    clients.length === 0
      ? {
          illustration: BrandImages.emptyClients,
          title: 'No clients yet',
          message: 'Add your first client and start their assessment.',
        }
      : {
          icon: 'search-outline' as const,
          title: 'No matches',
          message: 'Try a different name or mobile number.',
        };

  const renderItem = useCallback<ListRenderItem<ClientSummary>>(
    ({ item }) => <ClientRow item={item} onOpen={goClientDetail} onUploadError={setActionError} />,
    [goClientDetail],
  );

  const keyExtractor = useCallback(
    (item: ClientSummary) => item.id ?? item.clientCode ?? item.name,
    [],
  );

  const listContentStyle = useMemo(
    () => [filtered.length === 0 ? styles.emptyWrap : undefined, styles.listPadBottom],
    [filtered.length],
  );

  return (
    <View style={styles.container}>
      <WaveScreenHeader
        title="My Clients"
        onBack={() => navigateToDashboard(navigation)}
        onHome={() => navigateToDashboard(navigation)}
      />

      <View style={styles.body}>
        <FormErrorBanner message={subscriptionError} />
        <FormErrorBanner message={actionError} />
        <FormErrorBanner message={refreshControl.refreshError} />
        {showPageAdd ? (
          <View style={styles.addRow}>
            <AppButton
              label="Add client"
              size="compact"
              icon="add-outline"
              iconPosition="left"
              onPress={goAddClient}
              loading={checkingSubscription}
              accessibilityLabel="Add client"
            />
          </View>
        ) : null}

        <SearchField
          style={styles.search}
          placeholder="Search name or mobile..."
          value={search}
          onChangeText={onSearchChange}
          accessibilityLabel="Search clients"
        />

        {clientsQuery.isPending && !clientsQuery.data ? (
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
            keyExtractor={keyExtractor}
            showsVerticalScrollIndicator={false}
            initialNumToRender={8}
            maxToRenderPerBatch={6}
            windowSize={5}
            contentContainerStyle={listContentStyle}
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
            renderItem={renderItem}
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
  addRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: Spacing.sm,
  },
  search: { marginBottom: Spacing.sm },
  loader: { marginTop: 30 },
  emptyWrap: { flexGrow: 1 },
  errorWrap: { flexGrow: 1 },
  listPadBottom: { paddingBottom: ScreenPad.tabBarClearance },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: ListCard.radius,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    borderWidth: ListCard.borderWidth,
    borderColor: ListCard.borderColor,
    padding: 12,
  },
  avatar: {
    marginRight: Spacing.sm,
  },
  info: { flex: 1, minWidth: 0 },
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
});
