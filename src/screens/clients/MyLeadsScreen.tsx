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
  Alert,
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
  ListPortrait,
  PressOpacity,
  Radius,
  ScreenPad,
  Spacing,
  Typography,
  headingFont,
} from '../../constants/theme';
import { BrandImages } from '../../constants/images';
import EmptyState from '../../components/EmptyState';
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

function LeadRow({
  lead,
  onToggleContacted,
  onSaveNotes,
}: {
  lead: EnquiryLead;
  onToggleContacted: (lead: EnquiryLead, next: boolean) => void;
  onSaveNotes: (lead: EnquiryLead, notes: string) => void;
}) {
  const [notesDraft, setNotesDraft] = useState(lead.notes);
  const [editingNotes, setEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const isNew = !lead.isContacted;

  const openTel = () => {
    if (!lead.clientMobile) return;
    Linking.openURL(`tel:${lead.clientMobile}`).catch(() =>
      Alert.alert('Unable to call', 'Could not open the phone dialer.'),
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
      <PersonAvatar size={ListPortrait.width} fillHeight style={styles.avatar} />
      <View style={styles.content}>
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
          {lead.dateLabel ? (
            <Text style={styles.date} numberOfLines={1}>
              {lead.dateLabel}
            </Text>
          ) : null}
          {lead.lookingFor ? (
            <Text style={styles.lookingFor} numberOfLines={2}>
              Looking for: {lead.lookingFor}
            </Text>
          ) : null}
          {lead.clientMobile ? (
            <TouchableOpacity
              style={styles.phonePill}
              onPress={openTel}
              activeOpacity={PressOpacity.default}
              accessibilityRole="link"
              accessibilityLabel={`Call ${lead.clientMobile}`}
            >
              <Ionicons name="call" size={IconSize.sm} color={Colors.secondary} />
              <Text style={styles.phoneText}>{lead.clientMobile}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Marked as contacted</Text>
          <Switch
            value={lead.isContacted}
            onValueChange={next => onToggleContacted(lead, next)}
            trackColor={{ false: Colors.border, true: Colors.secondaryLight }}
            thumbColor={lead.isContacted ? Colors.secondary : Colors.textLight}
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
    </View>
  );
}

type LeadsScreenProps =
  | NativeStackScreenProps<DashboardStackParamList, 'Leads'>
  | NativeStackScreenProps<ProfileStackParamList, 'Leads'>;

export default function MyLeadsScreen({ navigation }: LeadsScreenProps) {
  const queryClient = useQueryClient();
  const coachCode = getCurrentCoachCode();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

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

  const newCount = useMemo(() => leads.filter(l => !l.isContacted).length, [leads]);
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
      } catch (err) {
        if (previous) queryClient.setQueryData(key, previous);
        Alert.alert('Update failed', getErrorMessage(err, 'Could not update lead status.'));
        await invalidate();
      }
    },
    [coachCode, queryClient, invalidate],
  );

  const onSaveNotes = useCallback(
    async (lead: EnquiryLead, notes: string) => {
      try {
        await updateEnquiryLead({ leadId: lead.id, notes });
        queryClient.setQueryData<EnquiryLead[]>(queryKeys.enquiryLeads(coachCode), old =>
          (old ?? []).map(l => (l.id === lead.id ? { ...l, notes } : l)),
        );
      } catch (err) {
        Alert.alert('Save failed', getErrorMessage(err, 'Could not save notes.'));
        await invalidate();
      }
    },
    [coachCode, queryClient, invalidate],
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
      <LeadRow lead={item} onToggleContacted={onToggleContacted} onSaveNotes={onSaveNotes} />
    ),
    [onToggleContacted, onSaveNotes],
  );

  return (
    <View style={styles.container}>
      <WaveScreenHeader
        title="My Leads"
        onBack={() => navigation.goBack()}
        onHome={() => navigateToDashboard(navigation)}
      />

      <View style={styles.body}>
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
          <>
            {leads.length > 0 ? (
              <View style={styles.summaryChip}>
                <Ionicons name="people-outline" size={IconSize.lg} color={Colors.secondary} />
                <View style={styles.summaryText}>
                  <Text style={styles.summaryTotal}>{leads.length} Total Clients</Text>
                  <Text style={styles.summaryNew}>{newCount} New</Text>
                </View>
              </View>
            ) : null}
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
          </>
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
  summaryChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm - 2,
    marginBottom: Spacing.sm,
  },
  summaryText: { justifyContent: 'center' },
  summaryTotal: {
    ...Typography.caption,
    color: Colors.textLight,
  },
  summaryNew: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    color: Colors.textDark,
    marginTop: 1,
  },
  emptyWrap: { flexGrow: 1 },
  errorWrap: { flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  avatar: {
    marginRight: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
    padding: ListPortrait.contentPad,
  },
  info: { minWidth: 0 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  name: {
    fontSize: 18,
    fontFamily: headingFont.bold,
    color: Colors.textDark,
    lineHeight: 24,
    flexShrink: 1,
  },
  newPill: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm - 2,
    paddingVertical: 2,
  },
  newPillText: {
    color: Colors.white,
    fontSize: 10,
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
    paddingVertical: 6,
    marginTop: Spacing.xs,
    minHeight: 30,
  },
  phoneText: {
    fontSize: 13,
    fontFamily: FontFamily.semibold,
    color: Colors.secondary,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  toggleLabel: { ...Typography.label },
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
