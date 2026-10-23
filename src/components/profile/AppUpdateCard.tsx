import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppButton from '../AppButton';
import FormErrorBanner from '../FormErrorBanner';
import { APP_DISPLAY_NAME } from '../../config/appConfig';
import {
  Colors,
  IconSize,
  Radius,
  ScreenPad,
  Shadow,
  Spacing,
  Typography,
} from '../../constants/theme';
import { useAppUpdate } from '../../hooks/useAppUpdate';
import { useOtaUpdate } from '../../hooks/useOtaUpdate';

/**
 * Profile card that tells the coach a newer app is available.
 * - A newer version in Google Play or the App Store: "Update available" with an Update button.
 * - A downloaded JavaScript update: "Update ready" with a Restart button.
 * Renders nothing when the app is up to date.
 */
export default function AppUpdateCard() {
  const store = useAppUpdate();
  const ota = useOtaUpdate();

  if (store.available) {
    const storeName = Platform.OS === 'ios' ? 'the App Store' : 'Google Play';
    return (
      <View style={styles.card} accessibilityRole="summary">
        <View style={styles.row}>
          <View style={styles.iconWell}>
            <Ionicons name="cloud-download-outline" size={IconSize.lg} color={Colors.secondary} />
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>Update available</Text>
            <Text style={styles.sub}>
              {store.storeVersion
                ? `Version ${store.storeVersion} is ready on ${storeName}.`
                : `A new version of ${APP_DISPLAY_NAME} is ready on ${storeName}.`}
            </Text>
          </View>
        </View>
        <FormErrorBanner message={store.error} />
        <AppButton
          label="Update now"
          icon="arrow-forward-outline"
          size="compact"
          loading={store.starting}
          onPress={() => void store.start()}
          accessibilityLabel={`Update ${APP_DISPLAY_NAME} from ${storeName}`}
          style={styles.button}
        />
      </View>
    );
  }

  if (ota.ready) {
    return (
      <View style={styles.card} accessibilityRole="summary">
        <View style={styles.row}>
          <View style={styles.iconWell}>
            <Ionicons name="sparkles-outline" size={IconSize.lg} color={Colors.secondary} />
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>Update ready</Text>
            <Text style={styles.sub}>Restart the app to get the latest improvements.</Text>
          </View>
        </View>
        <AppButton
          label="Restart now"
          icon="refresh-outline"
          size="compact"
          onPress={ota.applyNow}
          style={styles.button}
        />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: ScreenPad.horizontal,
    marginTop: Spacing.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.secondaryMuted,
    ...Shadow.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconWell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0 },
  title: { ...Typography.bodyStrong },
  sub: { ...Typography.caption, marginTop: 2 },
  button: { alignSelf: 'flex-start' },
  hint: { ...Typography.caption },
});
