import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  Switch,
  Linking,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontFamily,
  FormControl,
  IconSize,
  ListCard,
  PressOpacity,
  Radius,
  ScreenPad,
  Spacing,
  Typography,
  headingFont,
} from '../../constants/theme';
import { BrandImages } from '../../constants/images';
import EmptyState from '../../components/EmptyState';
import FormErrorBanner from '../../components/FormErrorBanner';
import ListPager from '../../components/ListPager';
import ReloadState from '../../components/ReloadState';
import PersonAvatar from '../../components/PersonAvatar';
import SearchField from '../../components/SearchField';
import WaveScreenHeader from '../../components/WaveScreenHeader';
import { getEnquiryLeads, updateEnquiryLead, type EnquiryLead } from '../../api/clientApi';
import { queryKeys } from '../../api/queryKeys';
import { getCurrentCoachCode } from '../../auth/session';
import { useRefreshControl, refreshControlTheme } from '../../hooks/useRefreshControl';
import { getErrorMessage } from '../../api/client';
import { stripNonDigits } from '../../utils/validation';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DashboardStackParamList, ProfileStackParamList } from '../../types/navigation';
import { navigateToDashboard } from '../../utils/navigationBack';

const PAGE_SIZE = 5;

const LeadRow = React.memo(function LeadRow({
  lead,
  onToggleContacted,
  onSaveNotes,
  onActionError,
}: {
  lead: EnquiryLead;
  onToggleContacted: (lead: EnquiryLead, next: boolean) => void;
  onSaveNotes: (lead: EnquiryLead, notes: string) => void;
  onActionError: (message: string) => void;
}) {
  const [notesDraft, setNotesDraft] = useState(lead.notes);
  const [editingNotes, setEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const isNew = !lead.isContacted;

  const openTel = () => {
    if (!lead.clientMobile) return;
    Linking.openURL(`tel:${lead.clientMobile}`).catch(() =>
      onActionError('Could not open the phone dialer.'),
    );
  };

  const beginNotesEdit = () => {
    setNotesDraft(lead.notes);
    setEditingNotes(true);
  };

  const commitNotes = async () => {
    if (!editingNotes) return;
    const next = notesDraft.trim();
    setEditingNotes(false);
    if (savingNotes || next === lead.notes) return;
    setSavingNotes(true);
    try {
      await onSaveNotes(lead, next);
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <PersonAvatar width={82} height={91} borderRadius={12} style={styles.avatar} />
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {lead.clientName || '-'}
            </Text>
            {isNew ? (
              <View style={styles.newPill}>
                <Text style={styles.newPillText}>New</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.date} numberOfLines={1}>
            {lead.dateLabel || '-'}
          </Text>
          <Text style={styles.lookingFor} numberOfLines={2}>
            Looking for: {lead.lookingFor || '-'}
          </Text>
          {lead.clientMobile ? (
            <TouchableOpacity
              style={styles.phonePill}
              onPress={openTel}
              activeOpacity={PressOpacity.default}
              accessibilityRole="link"
              accessibilityLabel={`Call ${lead.clientMobile}`}
            >
              <Ionicons name="call-outline" size={IconSize.sm} color={Colors.secondary} />
              <Text style={styles.phoneText} numberOfLines={1}>
                {lead.clientMobile}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.date} numberOfLines={1}>
              -
            </Text>
          )}
        </View>
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel} numberOfLines={2}>
          Marked as contacted
        </Text>
        <Switch
          value={lead.isContacted}
          onValueChange={next => onToggleContacted(lead, next)}
          trackColor={{ false: Colors.border, true: Colors.accentInk }}
          thumbColor={Colors.white}
          accessibilityLabel={lead.isContacted ? 'Mark lead as new' : 'Mark lead as contacted'}
        />
      </View>

      <TextInput
        style={styles.notesInput}
        value={editingNotes ? notesDraft : lead.notes}
        onChangeText={setNotesDraft}
        onFocus={beginNotesEdit}
        onEndEditing={commitNotes}
        placeholder="Add note.."
        placeholderTextColor={Colors.textLight}
        editable={!savingNotes}
        returnKeyType="done"
        blurOnSubmit
      />
    </View>
  );
});

type LeadsScreenProps =
  | NativeStackScreenProps<DashboardStackParamList, 'Leads'>
  | NativeStackScreenProps<ProfileStackParamList, 'Leads'>;

export default function MyLeadsScreen({ navigation }: LeadsScreenProps) {
  const queryClient = useQueryClient();
  const coachCode = getCurrentCoachCode();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);

  const leadsQuery = useQuery({
    queryKey: queryKeys.enquiryLeads(coachCode),
    queryFn: () => getEnquiryLeads(coachCode),
  });
  const refreshControl = useRefreshControl(leadsQuery);
  const leads = useMemo(() => leadsQuery.data ?? [], [leadsQuery.data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return leads;
    const digits = stripNonDigits(search);
    return leads.filter(l => {
      if (l.clientName.toLowerCase().includes(term)) return true;
      if (l.clientEmail.toLowerCase().includes(term)) return true;
      if (l.lookingFor.toLowerCase().includes(term)) return true;
      return digits.length > 0 && l.clientMobile.includes(digits);
    });
  }, [leads, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  const onSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const invalidate = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: queryKeys.enquiryLeads(coachCode) });
  }, [queryClient, coachCode]);

  const onToggleContacted = useCallback(
    async (lead: EnquiryLead, next: boolean) => {
      const key = queryKeys.enquiryLeads(coachCode);
      const previous = queryClient.getQueryData<EnquiryLead[]>(key);
      queryClient.setQueryData<EnquiryLead[]>(key, old =>
        (old ?? []).map(l => (l.id === lead.id ? { ...l, isContacted: next } : l)),
      );
      try {
        await updateEnquiryLead({ leadId: lead.id, isContacted: next });
        setActionError(null);
      } catch (err) {
        if (previous) queryClient.setQueryData(key, previous);
        setActionError(getErrorMessage(err, 'Could not update lead status.'));
        await invalidate();
      }
    },
    [coachCode, queryClient, invalidate, setActionError],
  );

  const onSaveNotes = useCallback(
    async (lead: EnquiryLead, notes: string) => {
      try {
        await updateEnquiryLead({ leadId: lead.id, notes });
        setActionError(null);
        queryClient.setQueryData<EnquiryLead[]>(queryKeys.enquiryLeads(coachCode), old =>
          (old ?? []).map(l => (l.id === lead.id ? { ...l, notes } : l)),
        );
      } catch (err) {
        setActionError(getErrorMessage(err, 'Could not save notes.'));
        await invalidate();
      }
    },
    [coachCode, queryClient, invalidate, setActionError],
  );

  const errorMessage = leadsQuery.isError
    ? getErrorMessage(leadsQuery.error, 'Could not load leads. Pull down to try again.')
    : null;
  const showLoadError = !!errorMessage && leads.length === 0;

  const emptyState =
    leads.length === 0
      ? {
          illustration: BrandImages.emptyLeads,
          title: 'No leads yet',
          message: 'Enquiries from your public profile will show up here so you can follow up.',
        }
      : {
          icon: 'search-outline' as const,
          title: 'No matches',
          message: 'Try a different name, mobile, email, or service.',
        };

  const renderItem = useCallback(
    ({ item }: { item: EnquiryLead }) => (
      <LeadRow
        lead={item}
        onToggleContacted={onToggleContacted}
        onSaveNotes={onSaveNotes}
        onActionError={setActionError}
      />
    ),
    [onToggleContacted, onSaveNotes, setActionError],
  );

  return (
    <View style={styles.container}>
      <WaveScreenHeader
        title="My Leads"
        onBack={() => navigation.goBack()}
        onHome={() => navigateToDashboard(navigation)}
      />

      <View style={styles.body}>
        <FormErrorBanner message={actionError} />
        <FormErrorBanner message={refreshControl.refreshError} />
        <SearchField
          style={styles.search}
          placeholder="Search name. mobile, email"
          value={search}
          onChangeText={onSearchChange}
          accessibilityLabel="Search leads"
        />

        {leadsQuery.isPending && !leadsQuery.data ? (
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
              illustration={BrandImages.emptyLeads}
              title="Could not load leads"
              message={errorMessage!}
              onRetry={() => void leadsQuery.refetch()}
              loading={leadsQuery.isFetching}
            />
          </ScrollView>
        ) : (
          <FlatList
            data={pageItems}
            keyExtractor={item => String(item.id)}
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
            ListEmptyComponent={<EmptyState {...emptyState} />}
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
  search: { marginBottom: Spacing.sm },
  loader: { marginTop: Spacing.xl - 2 },
  emptyWrap: { flexGrow: 1 },
  errorWrap: { flexGrow: 1 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: ListCard.radius,
    marginBottom: Spacing.sm,
    borderWidth: ListCard.borderWidth,
    borderColor: ListCard.borderColor,
    padding: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  avatar: {
    flexShrink: 0,
  },
  info: { flex: 1, minWidth: 0 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontFamily: headingFont.bold,
    color: Colors.textDark,
    lineHeight: 22,
  },
  newPill: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    minHeight: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newPillText: {
    color: Colors.white,
    fontSize: 11,
    fontFamily: FontFamily.bold,
  },
  date: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.textDark,
    marginTop: 3,
    lineHeight: 18,
  },
  lookingFor: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.textDark,
    marginTop: 3,
    lineHeight: 18,
  },
  phonePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.xs,
    minHeight: 24,
    maxWidth: '100%',
  },
  phoneText: {
    fontSize: 12,
    fontFamily: FontFamily.semibold,
    color: Colors.secondary,
    flexShrink: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  toggleLabel: { ...Typography.label, flex: 1, minWidth: 0 },
  notesInput: {
    marginTop: Spacing.sm - 2,
    borderWidth: FormControl.borderWidth,
    borderColor: Colors.border,
    borderRadius: FormControl.radius,
    paddingHorizontal: FormControl.paddingHorizontal,
    paddingVertical: Spacing.sm - 2,
    minHeight: FormControl.compactHeight + 4,
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.textDark,
    backgroundColor: FormControl.background,
  },
});
