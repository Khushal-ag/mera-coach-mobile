import React, { useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Colors, ScreenPad, Spacing } from '../../constants/theme';
import AppButton from '../../components/AppButton';
import FormErrorBanner from '../../components/FormErrorBanner';
import KeyboardSafeScroll, {
  STICKY_FOOTER_KEYBOARD_PADDING,
} from '../../components/KeyboardSafeScroll';
import StickyFooter from '../../components/StickyFooter';
import ReloadState from '../../components/ReloadState';
import CoachEventsEditor from '../../components/profile/CoachEventsEditor';
import {
  buildSaveCoachProfileParams,
  getCoachProfileFull,
  saveCoachProfile,
  type CoachProfileFull,
} from '../../api/coachApi';
import { getErrorMessage } from '../../api/client';
import { queryKeys, invalidateCoachProfileCaches } from '../../api/queryKeys';
import { serializeCoachEvents, validateCoachEventsDraft } from '../../utils/coachEvents';
import { isPendingLocalMediaUrl } from '../../utils/mediaUrl';
import type { EventsStackScreenProps } from '../../types/navigation';
import type { CoachEvent } from '../../types/models';
import TabRootHeader from '../../components/TabRootHeader';
import { navigateToDashboard } from '../../utils/navigationBack';

export default function EditEventsScreen({ navigation }: EventsStackScreenProps<'EventsHome'>) {
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
      <TabRootHeader title="Events" onBack={() => navigateToDashboard(navigation)} />

      {profileQuery.isPending ? (
        <ActivityIndicator color={Colors.secondary} style={{ marginTop: 60 }} />
      ) : errorMessage ? (
        <ReloadState
          title="Could not load events"
          message={errorMessage}
          onRetry={() => void profileQuery.refetch()}
          loading={profileQuery.isFetching}
          showPullHint={false}
        />
      ) : (
        <EditEventsForm
          profile={profileQuery.data!}
          onDone={() => navigateToDashboard(navigation)}
        />
      )}
    </View>
  );
}

function EditEventsForm({ profile, onDone }: { profile: CoachProfileFull; onDone: () => void }) {
  const scrollRef = useRef<ScrollView>(null);
  const [events, setEvents] = useState<CoachEvent[] | null>(null);
  const draft = events ?? profile.events ?? [];
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleSave = async () => {
    const eventsError = validateCoachEventsDraft(draft);
    if (eventsError) {
      setBanner(eventsError);
      return;
    }
    if (draft.some(e => isPendingLocalMediaUrl(e.imageUrl))) {
      setBanner('Please wait for the event photo upload to finish.');
      return;
    }

    setBanner(null);
    setSaving(true);
    try {
      const serialized = serializeCoachEvents(draft);
      const latest = await getCoachProfileFull();
      await saveCoachProfile(
        buildSaveCoachProfileParams(latest, {
          events: serialized,
        }),
      );
      invalidateCoachProfileCaches(queryClient, latest.coachCode);
      Alert.alert('Events saved', 'Your events have been updated.', [
        { text: 'OK', onPress: onDone },
      ]);
    } catch (err) {
      setBanner(getErrorMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.formRoot}>
      <KeyboardSafeScroll
        ref={scrollRef}
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardPadding={STICKY_FOOTER_KEYBOARD_PADDING}
      >
        <FormErrorBanner message={banner} />
        <CoachEventsEditor events={draft} onChange={setEvents} coachCode={profile.coachCode} />
      </KeyboardSafeScroll>

      <StickyFooter>
        <AppButton
          label="Save events"
          onPress={() => void handleSave()}
          loading={saving}
          icon="checkmark-outline"
        />
      </StickyFooter>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  formRoot: { flex: 1 },
  body: { flex: 1 },
  bodyContent: {
    paddingHorizontal: ScreenPad.horizontal,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
});
