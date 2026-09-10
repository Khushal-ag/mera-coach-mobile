import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow, Spacing } from '../constants/theme';
import FormErrorBanner from '../components/FormErrorBanner';
import KeyboardSafeScroll from '../components/KeyboardSafeScroll';
import ScreenHeader from '../components/ScreenHeader';
import ReloadState from '../components/ReloadState';
import CoachEventsEditor from '../components/CoachEventsEditor';
import DemoModeHint from '../components/DemoModeHint';
import {
  buildSaveCoachProfileParams,
  getCoachProfileFull,
  saveCoachProfile,
  type CoachProfileFull,
} from '../api/coachApi';
import { getErrorMessage } from '../api/client';
import { queryKeys } from '../api/queryKeys';
import { USE_MVP_MOCKS } from '../config/appConfig';
import { resolveDemoEvents, saveDemoEvents } from '../data/mvpMockStore';
import { serializeCoachEvents, validateCoachEventsDraft } from '../utils/coachEvents';
import type { ProfileStackScreenProps } from '../types/navigation';
import type { CoachEvent } from '../types/models';

export default function EditEventsScreen({ navigation }: ProfileStackScreenProps<'EditEvents'>) {
  const profileQuery = useQuery({
    queryKey: queryKeys.coachProfileFull,
    queryFn: getCoachProfileFull,
  });

  const errorMessage =
    profileQuery.isError && !profileQuery.data
      ? getErrorMessage(profileQuery.error, 'Could not load your events.')
      : null;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Events" onBack={() => navigation.goBack()} />

      {profileQuery.isPending ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
      ) : errorMessage ? (
        <ReloadState
          title="Could not load events"
          message={errorMessage}
          onRetry={() => void profileQuery.refetch()}
          loading={profileQuery.isFetching}
          showPullHint={false}
        />
      ) : (
        <EditEventsForm profile={profileQuery.data!} onDone={() => navigation.goBack()} />
      )}
    </View>
  );
}

function EditEventsForm({ profile, onDone }: { profile: CoachProfileFull; onDone: () => void }) {
  const scrollRef = useRef<ScrollView>(null);
  const seedQuery = useQuery({
    queryKey: [...queryKeys.coachMvpDemo(profile.coachCode), 'events-edit'] as const,
    queryFn: () => resolveDemoEvents(profile.coachCode, profile.events),
    enabled: USE_MVP_MOCKS,
    initialData:
      (profile.events?.length ?? 0) > 0
        ? { events: profile.events ?? [], isDemo: false }
        : undefined,
  });

  const seeded = USE_MVP_MOCKS ? seedQuery.data : { events: profile.events ?? [], isDemo: false };
  const [events, setEvents] = useState<CoachEvent[] | null>(null);
  const draft = events ?? seeded?.events ?? [];
  const isDemo = seeded?.isDemo ?? false;
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleSave = async () => {
    const eventsError = validateCoachEventsDraft(draft);
    if (eventsError) {
      setBanner(eventsError);
      return;
    }

    setBanner(null);
    setSaving(true);
    try {
      const serialized = serializeCoachEvents(draft);

      if (USE_MVP_MOCKS) {
        await saveDemoEvents(profile.coachCode, serialized);
        queryClient.invalidateQueries({ queryKey: queryKeys.coachMvpDemo(profile.coachCode) });
        queryClient.invalidateQueries({
          queryKey: queryKeys.coachProfileByCode(profile.coachCode),
        });
        Alert.alert(
          'Events saved',
          isDemo
            ? 'Saved on this device for demo. The API does not store events yet.'
            : 'Your events have been updated.',
          [{ text: 'OK', onPress: onDone }],
        );
        return;
      }

      // Reload so we merge against the latest profile and do not wipe other fields.
      const latest = await getCoachProfileFull();
      await saveCoachProfile(
        buildSaveCoachProfileParams(latest, {
          events: serialized,
        }),
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.coachProfile });
      queryClient.invalidateQueries({ queryKey: queryKeys.coachProfileFull });
      queryClient.invalidateQueries({ queryKey: ['coachPublicList'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.coachProfileByCode(latest.coachCode) });
      Alert.alert('Events saved', 'Your events have been updated.', [
        { text: 'OK', onPress: onDone },
      ]);
    } catch (err) {
      setBanner(getErrorMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  if (USE_MVP_MOCKS && !seeded) {
    return <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />;
  }

  return (
    <KeyboardSafeScroll
      ref={scrollRef}
      style={styles.body}
      contentContainerStyle={styles.bodyContent}
      keyboardPadding={180}
    >
      <FormErrorBanner message={banner} />
      {isDemo ? <DemoModeHint /> : null}
      <CoachEventsEditor events={draft} onChange={setEvents} />

      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={() => void handleSave()}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <>
            <Text style={styles.saveText}>Save events</Text>
            <Ionicons name="checkmark" size={18} color={Colors.white} />
          </>
        )}
      </TouchableOpacity>
    </KeyboardSafeScroll>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  body: { flex: 1 },
  bodyContent: { padding: Spacing.lg, paddingBottom: Spacing.xl },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: Spacing.md,
    ...Shadow.md,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
