import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontFamily,
  IconSize,
  ListCard,
  ListPortrait,
  PressOpacity,
  ScreenPad,
  Shadow,
  Spacing,
  TouchTarget,
  Typography,
} from '../../constants/theme';
import ReloadState from '../../components/ReloadState';
import WaveScreenHeader, { WaveHeaderActionButton } from '../../components/WaveScreenHeader';
import {
  buildSaveCoachProfileParams,
  getCoachProfileFull,
  saveCoachProfile,
} from '../../api/coachApi';
import { getErrorMessage } from '../../api/client';
import { queryKeys, invalidateCoachProfileCaches } from '../../api/queryKeys';
import { refreshControlTheme, useRefreshControl } from '../../hooks/useRefreshControl';
import {
  MAX_COACH_EVENTS,
  serializeCoachEvents,
  validateCoachEventsDraft,
} from '../../utils/coachEvents';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import { navigateToDashboard } from '../../utils/navigationBack';
import type { EventsStackScreenProps } from '../../types/navigation';
import type { CoachEvent } from '../../types/models';

const CANVAS = '#F3FAF7';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDisplayDate(value: string): string | null {
  const trimmed = value.trim();
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (ymd) {
    const y = Number(ymd[1]);
    const m = Number(ymd[2]) - 1;
    const d = Number(ymd[3]);
    const dt = new Date(y, m, d);
    if (dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d) {
      return `${d} ${MONTHS[m]} ${y}`;
    }
  }
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (dmy) {
    const d = Number(dmy[1]);
    const m = Number(dmy[2]) - 1;
    const y = Number(dmy[3]);
    const dt = new Date(y, m, d);
    if (dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d) {
      return `${d} ${MONTHS[m]} ${y}`;
    }
  }
  return null;
}

export default function EventsScreen({ navigation }: EventsStackScreenProps<'EventsHome'>) {
  const queryClient = useQueryClient();
  const profileQuery = useQuery({
    queryKey: queryKeys.coachProfileFull,
    queryFn: getCoachProfileFull,
  });
  const refreshControl = useRefreshControl(profileQuery);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const errorMessage =
    profileQuery.isError && !profileQuery.data
      ? getErrorMessage(profileQuery.error, 'Could not load your events.')
      : null;

  const events = profileQuery.data?.events ?? [];
  const atMax = events.length >= MAX_COACH_EVENTS;

  const goAdd = () => {
    if (atMax) {
      Alert.alert('Event limit', `You can add up to ${MAX_COACH_EVENTS} events.`);
      return;
    }
    navigation.navigate('AddEvent');
  };

  const goEdit = (event: CoachEvent) => {
    navigation.navigate('AddEvent', { eventId: event.id });
  };

  const persistRemove = async (id: string) => {
    const profile = profileQuery.data;
    if (!profile || removingId) return;
    const next = (profile.events ?? []).filter(event => event.id !== id);
    const eventsError = validateCoachEventsDraft(next);
    if (eventsError) {
      Alert.alert('Could not remove event', eventsError);
      return;
    }
    setRemovingId(id);
    try {
      const serialized = serializeCoachEvents(next);
      const latest = await getCoachProfileFull();
      await saveCoachProfile(
        buildSaveCoachProfileParams(latest, {
          events: serialized,
        }),
      );
      invalidateCoachProfileCaches(queryClient, latest.coachCode);
    } catch (err) {
      Alert.alert(
        'Could not remove event',
        getErrorMessage(err, 'Something went wrong. Please try again.'),
      );
    } finally {
      setRemovingId(null);
    }
  };

  const confirmRemove = (event: CoachEvent) => {
    const label = event.title.trim() || 'this event';
    Alert.alert('Remove event', `Remove ${label}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void persistRemove(event.id);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <WaveScreenHeader
        title="Events"
        showBack={false}
        onHome={() => navigateToDashboard(navigation)}
        rightExtra={
          <WaveHeaderActionButton
            icon="add-outline"
            onPress={goAdd}
            accessibilityLabel="Add event"
          />
        }
      />

      {profileQuery.isPending ? (
        <ActivityIndicator color={Colors.secondary} style={styles.pending} />
      ) : errorMessage ? (
        <ReloadState
          title="Could not load events"
          message={errorMessage}
          onRetry={() => void profileQuery.refetch()}
          loading={profileQuery.isFetching}
          showPullHint={false}
        />
      ) : (
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshControl.refreshing}
              onRefresh={refreshControl.onRefresh}
              {...refreshControlTheme}
            />
          }
        >
          {events.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={IconSize.xxl} color={Colors.accentInk} />
              <Text style={styles.emptyTitle}>No events yet</Text>
              <Text style={styles.emptyMessage}>
                Add a workshop, training session, or client success story for your public profile.
              </Text>
            </View>
          ) : (
            events.map((event, index) => {
              const when = [formatDisplayDate(event.date) ?? event.date, event.time]
                .filter(Boolean)
                .join(' · ');
              const where = event.location.trim();
              const title = event.title.trim() || `Event ${index + 1}`;
              const removing = removingId === event.id;
              const imageUri = resolveMediaUrl(event.imageUrl);
              return (
                <View key={event.id} style={styles.card}>
                  <TouchableOpacity
                    style={styles.cardMain}
                    onPress={() => goEdit(event)}
                    activeOpacity={PressOpacity.default}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${title}`}
                  >
                    {imageUri ? (
                      <Image source={{ uri: imageUri }} style={styles.photo} resizeMode="cover" />
                    ) : (
                      <View style={styles.photo} />
                    )}
                    <View style={styles.cardBody}>
                      <Text style={styles.cardTitle} numberOfLines={2}>
                        {title}
                      </Text>
                      {when ? (
                        <Text style={styles.cardMeta} numberOfLines={1}>
                          {when}
                        </Text>
                      ) : null}
                      {where ? (
                        <Text style={styles.cardMeta} numberOfLines={1}>
                          {where}
                        </Text>
                      ) : null}
                      {!when && !where ? (
                        <Text style={styles.cardMeta} numberOfLines={1}>
                          Tap to edit details
                        </Text>
                      ) : null}
                    </View>
                    <Ionicons
                      name="chevron-forward-outline"
                      size={IconSize.md}
                      color={Colors.accentInk}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => confirmRemove(event)}
                    disabled={removing}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${title}`}
                    activeOpacity={PressOpacity.default}
                  >
                    {removing ? (
                      <ActivityIndicator size="small" color={Colors.destructive} />
                    ) : (
                      <Ionicons
                        name="trash-outline"
                        size={IconSize.md}
                        color={Colors.destructive}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CANVAS },
  pending: { marginTop: 60 },
  body: { flex: 1, backgroundColor: CANVAS },
  bodyContent: {
    paddingHorizontal: ScreenPad.horizontal,
    paddingTop: Spacing.md,
    paddingBottom: ScreenPad.tabBarClearance,
    gap: Spacing.sm,
  },
  emptyCard: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: Spacing.lg,
    ...Shadow.sm,
  },
  emptyTitle: {
    ...Typography.headline,
  },
  emptyMessage: {
    ...Typography.body,
    color: Colors.textLight,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: ListCard.minHeight,
    backgroundColor: Colors.white,
    borderRadius: ListCard.radius,
    overflow: 'hidden',
    borderWidth: ListCard.borderWidth,
    borderColor: ListCard.borderColor,
    padding: ListPortrait.contentPad,
  },
  cardMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minWidth: 0,
  },
  photo: {
    width: ListPortrait.width,
    height: ListPortrait.height,
    borderRadius: ListPortrait.radius,
    backgroundColor: Colors.cardTintGreen,
    overflow: 'hidden',
    flexShrink: 0,
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitle: {
    ...Typography.headline,
  },
  cardMeta: {
    marginTop: 3,
    ...Typography.label,
    fontFamily: FontFamily.regular,
  },
  removeBtn: {
    width: TouchTarget.icon,
    height: TouchTarget.icon,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.xxs,
    flexShrink: 0,
  },
});
