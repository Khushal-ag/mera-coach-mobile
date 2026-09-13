import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontFamily, PressOpacity, Radius, Shadow, Spacing } from '../../constants/theme';
import { BrandImages } from '../../constants/images';
import BrandLockup from '../../components/BrandLockup';
import MpinKeypad from '../../components/auth/MpinKeypad';
import {
  clearMpin,
  clearMpinSetupDeferred,
  markMpinUnlocked,
  verifyStoredMpin,
} from '../../auth/mpin';
import { clearSession } from '../../auth/session';

const MAX_ATTEMPTS = 5;

/**
 * Cold-start gate when a valid JWT and MPIN are present.
 * Forgot MPIN clears the verifier and session so the user can password-login and set a new MPIN.
 */
export default function MpinUnlockScreen() {
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const onComplete = useCallback(
    async (value: string) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      try {
        const ok = await verifyStoredMpin(value);
        if (ok) {
          markMpinUnlocked();
          return;
        }
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);
        setPin('');
        if (nextAttempts >= MAX_ATTEMPTS) {
          setError('Too many attempts. Sign in with your password.');
          await clearMpin();
          await clearMpinSetupDeferred();
          await clearSession();
          return;
        }
        setError('Incorrect MPIN. Try again.');
      } finally {
        setBusy(false);
      }
    },
    [attempts, busy],
  );

  const onForgot = () => {
    Alert.alert(
      'Forgot MPIN?',
      'You will sign in with your password, then you can create a new MPIN.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Use password',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await clearMpin();
              await clearMpinSetupDeferred();
              await clearSession();
            })();
          },
        },
      ],
    );
  };

  return (
    <ImageBackground source={BrandImages.loginAtmosphere} style={styles.bg} resizeMode="cover">
      <View style={styles.scrim} />
      <View
        style={[
          styles.inner,
          { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.lg },
        ]}
      >
        <BrandLockup size="lg" style={styles.logo} />

        <View style={styles.card}>
          <Text style={styles.title}>Enter MPIN</Text>
          <Text style={styles.sub}>Unlock Mera Coach with your 4-digit code.</Text>

          <MpinKeypad
            value={pin}
            onChange={v => {
              setPin(v);
              setError(null);
            }}
            onComplete={value => void onComplete(value)}
            disabled={busy}
            error={error}
          />

          <TouchableOpacity
            onPress={onForgot}
            activeOpacity={PressOpacity.soft}
            accessibilityRole="button"
            accessibilityLabel="Forgot MPIN, use password instead"
          >
            <Text style={styles.forgot}>Forgot MPIN? Use password</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: Colors.secondary },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.authScrim,
  },
  inner: {
    flex: 1,
    zIndex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  logo: { marginBottom: Spacing.lg },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadow.lg,
  },
  title: {
    fontSize: 22,
    fontFamily: FontFamily.bold,
    color: Colors.textDark,
    marginBottom: 4,
    textAlign: 'center',
  },
  sub: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  forgot: {
    textAlign: 'center',
    marginTop: Spacing.sm,
    fontSize: 13,
    fontFamily: FontFamily.semibold,
    color: Colors.primary,
  },
});
