import React, { useEffect, useState } from 'react';
import { View, Text, Switch, Linking, StyleSheet, ScrollView } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Colors, FontFamily, Radius, ScreenPad, Spacing, Typography } from '../../constants/theme';
import AppButton from '../../components/AppButton';
import FormErrorBanner from '../../components/FormErrorBanner';
import ReloadState from '../../components/ReloadState';
import WaveScreenHeader from '../../components/WaveScreenHeader';
import { getErrorMessage } from '../../api/client';
import {
  getNotificationPreferences,
  updateNotificationPreference,
  type NotificationPreference,
} from '../../api/notificationApi';
import { queryKeys } from '../../api/queryKeys';
import {
  getPushPermission,
  pushSupported,
  registerForPush,
  requestPushPermission,
  type PushPermission,
} from '../../notifications/pushRegistration';
import type { DashboardStackScreenProps } from '../../types/navigation';

const GROUP_HINT: Record<string, string> = {
  LEADS_CLIENTS: 'New leads waiting, client check-ups due, incomplete client profiles',
  BUSINESS: 'Packages, events, gallery and success stories',
  SUBSCRIPTION: 'Reminders before your plan ends',
  FEEDBACK: 'Feedback received and clients you have not asked yet',
};

export default function NotificationSettingsScreen({
  navigation,
}: DashboardStackScreenProps<'NotificationSettings'>) {
  const queryClient = useQueryClient();
  const [permission, setPermission] = useState<PushPermission | null>(null);
  const [error, setError] = useState<string | null>(null);

  const prefsQuery = useQuery({
    queryKey: queryKeys.notificationPrefs,
    queryFn: getNotificationPreferences,
  });

  const toggle = useMutation({
    mutationFn: (p: { groupCode: string; isEnabled: boolean }) =>
      updateNotificationPreference(p.groupCode, p.isEnabled),
    onSuccess: data => queryClient.setQueryData(queryKeys.notificationPrefs, data),
    onError: e => setError(getErrorMessage(e, 'Could not save that change. Try again.')),
  });

  useEffect(() => {
    void getPushPermission().then(setPermission);
  }, []);

  const turnOn = async () => {
    if (permission === 'denied') {
      void Linking.openSettings();
      return;
    }
    if (await requestPushPermission()) await registerForPush().catch(() => undefined);
    setPermission(await getPushPermission());
  };

  const prefs: NotificationPreference[] = prefsQuery.data ?? [];

  return (
    <View style={styles.container}>
      <WaveScreenHeader title="Notification settings" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <FormErrorBanner message={error} />

        {pushSupported() && permission !== null && permission !== 'granted' ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>
              Notifications are off on this phone, so alerts only appear inside the app.
            </Text>
            <AppButton
              label={permission === 'denied' ? 'Open phone settings' : 'Turn on notifications'}
              onPress={() => void turnOn()}
            />
          </View>
        ) : null}

        {prefsQuery.isError ? (
          <ReloadState
            message={getErrorMessage(prefsQuery.error, 'Could not load your settings.')}
            onRetry={() => void prefsQuery.refetch()}
          />
        ) : (
          prefs.map(p => (
            <View key={p.groupCode} style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{p.label}</Text>
                <Text style={styles.rowHint}>{GROUP_HINT[p.groupCode] ?? ''}</Text>
              </View>
              <Switch
                value={p.isEnabled}
                onValueChange={isEnabled => {
                  setError(null);
                  toggle.mutate({ groupCode: p.groupCode, isEnabled });
                }}
                trackColor={{ false: Colors.border, true: Colors.accentInk }}
                thumbColor={Colors.white}
                accessibilityLabel={p.label}
              />
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: ScreenPad.horizontal, gap: Spacing.sm, paddingBottom: Spacing.xl },
  banner: {
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  bannerText: { fontFamily: FontFamily.regular, fontSize: 13, color: Colors.textDark },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  rowText: { flex: 1 },
  rowTitle: { ...Typography.headline, fontSize: 15, lineHeight: 20 },
  rowHint: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.textLight, marginTop: 2 },
});
