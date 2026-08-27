import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
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
import { Colors, Radius, Shadow } from '../constants/theme';
import EmptyState from '../components/EmptyState';
import ScreenHeader from '../components/ScreenHeader';
import { getEnquiryLeads, updateEnquiryLead, type EnquiryLead } from '../api/clientApi';
import { queryKeys } from '../api/queryKeys';
import { getCurrentCoachCode } from '../auth/session';
import { useRefreshControl, refreshControlTheme } from '../hooks/useRefreshControl';
import { getErrorMessage } from '../api/client';
import { stripNonDigits } from '../utils/validation';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DashboardStackParamList, ProfileStackParamList } from '../types/navigation';

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
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{lead.initials}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {lead.clientName || '—'}
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
            accessibilityRole="link"
            accessibilityLabel={`Call ${lead.clientMobile}`}
          >
            <Ionicons name="call-outline" size={14} color={Colors.secondary} />
            <Text style={styles.contactChipText}>{lead.clientMobile}</Text>
          </TouchableOpacity>
        ) : null}
        {lead.clientEmail ? (
          <TouchableOpacity
            style={styles.contactChip}
            onPress={openMail}
            accessibilityRole="link"
            accessibilityLabel={`Email ${lead.clientEmail}`}
          >
            <Ionicons name="mail-outline" size={14} color={Colors.secondary} />
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

  const emptyState =
    leads.length === 0
      ? {
          icon: 'funnel-outline' as const,
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
        <View style={styles.searchWrap}>
          <Ionicons
            name="search-outline"
            size={18}
            color={Colors.textLight}
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name, mobile, email…"
            placeholderTextColor={Colors.textLight}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        {leadsQuery.isPending ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 30 }} />
        ) : errorMessage ? (
          <Text style={styles.error}>{errorMessage}</Text>
        ) : (
          <>
            {subtitle ? <Text style={styles.count}>{subtitle}</Text> : null}
            <FlatList
              data={filtered}
              keyExtractor={item => String(item.id)}
              showsVerticalScrollIndicator={false}
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
  count: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 10,
  },
  emptyWrap: { flexGrow: 1 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: 10,
    ...Shadow.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  info: { flex: 1, minWidth: 0, marginRight: 8 },
  name: { fontSize: 15, fontWeight: '700', color: Colors.textDark },
  date: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  lookingFor: { fontSize: 12, color: Colors.textDark, marginTop: 4, lineHeight: 16 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  statusNew: { backgroundColor: Colors.accentLight },
  statusContacted: { backgroundColor: Colors.secondaryLight },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusNewText: { color: Colors.accent },
  statusContactedText: { color: Colors.secondary },
  contactRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  contactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '100%',
    backgroundColor: Colors.background,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  contactChipText: { fontSize: 12, fontWeight: '600', color: Colors.secondary, maxWidth: 200 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  toggleLabel: { fontSize: 13, fontWeight: '600', color: Colors.textDark },
  notesInput: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textDark,
    backgroundColor: Colors.background,
  },
  error: { textAlign: 'center', color: Colors.textLight, fontSize: 13, marginTop: 20 },
});
