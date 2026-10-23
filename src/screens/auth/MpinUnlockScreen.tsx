import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  Alert,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Colors,
  FontFamily,
  HitSlop,
  PressOpacity,
  Radius,
  Shadow,
  Spacing,
  TouchTarget,
  headingFont,
} from '../../constants/theme';
import { BrandImages } from '../../constants/images';
import BrandLogo from '../../components/BrandLogo';
import MpinKeypad from '../../components/auth/MpinKeypad';
import { attemptMpin, clearMpin, clearMpinSetupDeferred, markMpinUnlocked } from '../../auth/mpin';
import { logoutLocal } from '../../auth/logout';

/**
 * Cold-start gate when a valid JWT and MPIN are present.
 * Forgot MPIN clears the verifier and session so the user can password-login and set a new MPIN.
 */
/** Below this screen height the logo shrinks so everything fits without scrolling. */
const COMPACT_SCREEN_HEIGHT = 640;

export default function MpinUnlockScreen() {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  // A shorter logo keeps the keypad and the link below it on screen on small phones.
  const logoSize = screenHeight < COMPACT_SCREEN_HEIGHT ? 72 : 100;
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onComplete = useCallback(
    async (value: string) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      try {
        const result = await attemptMpin(value);
        if (result.status === 'ok') {
          markMpinUnlocked();
          return;
        }
        setPin('');
        if (result.status === 'locked') {
          setError('Too many attempts. Sign in with your password.');
          await logoutLocal();
          return;
        }
        setError(
          `Incorrect MPIN. ${result.remaining} ${result.remaining === 1 ? 'try' : 'tries'} left.`,
        );
      } finally {
        setBusy(false);
      }
    },
    [busy],
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
              await logoutLocal();
            })();
          },
        },
      ],
    );
  };

  return (
    <ImageBackground source={BrandImages.mpinAtmosphere} style={styles.bg} resizeMode="cover">
      <ScrollView
        contentContainerStyle={[
          styles.inner,
          { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <BrandLogo size={logoSize} style={styles.logo} />

        <View style={styles.card}>
          <Text style={styles.title}>Enter MPIN</Text>
          <Text style={styles.sub}>Unlock Mera Coach with your 4- digit-code</Text>

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
            hitSlop={HitSlop.sm}
            style={styles.forgotHit}
          >
            <Text style={styles.forgot}>Forgot MPIN? Use password</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: Colors.background },
  inner: {
    flexGrow: 1,
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
    lineHeight: 28,
    fontFamily: headingFont.bold,
    color: Colors.secondary,
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
  forgotHit: {
    justifyContent: 'center',
    minHeight: TouchTarget.min,
    marginTop: Spacing.sm,
  },
  forgot: {
    textAlign: 'center',
    fontSize: 13,
    fontFamily: FontFamily.bold,
    color: Colors.secondary,
  },
});
