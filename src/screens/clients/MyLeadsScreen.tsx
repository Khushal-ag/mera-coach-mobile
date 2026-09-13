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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontFamily,
  FormControl,
  IconSize,
  PressOpacity,
  Radius,
  Shadow,
  Spacing,
  Typography,
  statusChipStyles,
} from '../../constants/theme';
import { BrandImages } from '../../constants/images';
import EmptyState from '../../components/EmptyState';
import ReloadState from '../../components/ReloadState';
import PersonAvatar from '../../components/PersonAvatar';
import ScreenHeader from '../../components/ScreenHeader';
import SearchField from '../../components/SearchField';
import { getEnquiryLeads, updateEnquiryLead, type EnquiryLead } from '../../api/clientApi';
import { queryKeys } from '../../api/queryKeys';
import { getCurrentCoachCode } from '../../auth/session';
import { useRefreshControl, refreshControlTheme } from '../../hooks/useRefreshControl';
import { getErrorMessage } from '../../api/client';
import { stripNonDigits } from '../../utils/validation';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DashboardStackParamList, ProfileStackParamList } from '../../types/navigation';

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

  const openTel = () => {
    if (!lead.clientMobile) return;
    Linking.openURL(`tel:${lead.clientMobile}`).catch(() =>
      Alert.alert('Unable to call', 'Could not open the phone dialer.'),
    );
  };

  const openMail = () => {
    if (!lead.clientEmail) return;
    Linking.openURL(`mailto:${lead.clientEmail}`).catch(() =>
      Alert.alert('Unable to email', 'Could not open the mail app.'),
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
      <View style={styles.cardTop}>
        <PersonAvatar size={40} style={styles.avatar} />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {lead.clientName || '-'}
          </Text>
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
        </View>
        <View
          style={[styles.statusBadge, lead.isContacted ? styles.statusContacted : styles.statusNew]}
        >
          <Text
            style={[
              styles.statusText,
              lead.isContacted ? styles.statusContactedText : styles.statusNewText,
            ]}
          >
            {lead.isContacted ? 'Contacted' : 'New'}
          </Text>
        </View>
      </View>

      <View style={styles.contactRow}>
        {lead.clientMobile ? (
          <TouchableOpacity
            style={styles.contactChip}
            onPress={openTel}
            activeOpacity={PressOpacity.default}
            accessibilityRole="link"
            accessibilityLabel={`Call ${lead.clientMobile}`}
          >
            <Ionicons name="call-outline" size={IconSize.sm} color={Colors.secondary} />
            <Text style={styles.contactChipText}>{lead.clientMobile}</Text>
          </TouchableOpacity>
        ) : null}
        {lead.clientEmail ? (
          <TouchableOpacity
            style={styles.contactChip}
            onPress={openMail}
            activeOpacity={PressOpacity.default}
            accessibilityRole="link"
            accessibilityLabel={`Email ${lead.clientEmail}`}
          >
            <Ionicons name="mail-outline" size={IconSize.sm} color={Colors.secondary} />
            <Text style={styles.contactChipText} numberOfLines={1}>
              {lead.clientEmail}
            </Text>
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
        placeholder="Add note…"
        placeholderTextColor={Colors.textLight}
        editable={!savingNotes}
        returnKeyType="done"
        blurOnSubmit
      />
    </View>
  );
}

type LeadsScreenProps =
  | NativeStackScreenProps<DashboardStackParamList, 'Leads'>
  | NativeStackScreenProps<ProfileStackParamList, 'Leads'>;

export default function MyLeadsScreen({ navigation }: LeadsScreenProps) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const coachCode = getCurrentCoachCode();
  const [search, setSearch] = useState('');

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

  const activeCount = useMemo(() => leads.filter(l => !l.isContacted).length, [leads]);

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

  const subtitle = leads.length === 0 ? undefined : `${activeCount} new · ${leads.length} total`;

  return (
    <View style={styles.container}>
      <ScreenHeader title="My Leads" onBack={() => navigation.goBack()} />

      <View style={styles.body}>
        <SearchField
          style={styles.search}
          placeholder="Search name, mobile, email..."
          value={search}
          onChangeText={setSearch}
          accessibilityLabel="Search leads"
        />

        {leadsQuery.isPending && !leadsQuery.data ? (
          <ActivityIndicator color={Colors.primary} style={styles.loader} />
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
            {subtitle ? <Text style={styles.count}>{subtitle}</Text> : null}
            <FlatList
              data={filtered}
              keyExtractor={item => String(item.id)}
              showsVerticalScrollIndicator={false}
              initialNumToRender={8}
              maxToRenderPerBatch={6}
              windowSize={5}
              contentContainerStyle={[
                filtered.length === 0 ? styles.emptyWrap : undefined,
                { paddingBottom: Math.max(insets.bottom, Spacing.md) },
              ]}
              refreshControl={
                <RefreshControl
                  refreshing={refreshControl.refreshing}
                  onRefresh={refreshControl.onRefresh}
                  {...refreshControlTheme}
                />
              }
              ListEmptyComponent={<EmptyState {...emptyState} />}
              renderItem={({ item }) => (
                <LeadRow
                  lead={item}
                  onToggleContacted={onToggleContacted}
                  onSaveNotes={onSaveNotes}
                />
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
  body: { flex: 1, padding: Spacing.md },
  search: { marginBottom: Spacing.sm },
  loader: { marginTop: Spacing.xl - 2 },
  count: {
    ...Typography.label,
    color: Colors.textLight,
    marginBottom: Spacing.sm - 2,
  },
  emptyWrap: { flexGrow: 1 },
  errorWrap: { flexGrow: 1 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.sm + 2,
    marginBottom: Spacing.sm - 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: { marginRight: Spacing.sm - 2 },
  info: { flex: 1, minWidth: 0, marginRight: Spacing.xs },
  name: { ...Typography.bodyStrong, fontFamily: FontFamily.bold, fontSize: 15 },
  date: { ...Typography.micro, marginTop: 2 },
  lookingFor: {
    ...Typography.caption,
    color: Colors.textDark,
    marginTop: Spacing.xxs,
    lineHeight: 16,
  },
  statusBadge: {
    ...statusChipStyles.base,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
  },
  statusNew: { backgroundColor: Colors.accentLight },
  statusContacted: { backgroundColor: Colors.secondaryLight },
  statusText: statusChipStyles.microText,
  statusNewText: { color: Colors.accent },
  statusContactedText: { color: Colors.secondary },
  contactRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.sm },
  contactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    maxWidth: '100%',
    backgroundColor: Colors.background,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm - 2,
    paddingVertical: 6,
    minHeight: 32,
  },
  contactChipText: {
    ...Typography.caption,
    fontFamily: FontFamily.semibold,
    color: Colors.secondary,
    maxWidth: 200,
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
