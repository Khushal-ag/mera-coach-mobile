import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
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
import { deferMpinSetup, getLastLoginId, setMpin } from '../../auth/mpin';
import { toUserMessage } from '../../api/client';
import { isValidMpinFormat } from '../../utils/mpinCrypto';

type Step = 'create' | 'confirm';

/**
 * Shown after password login when no MPIN is stored yet.
 * The create step can be skipped; the confirm step cannot.
 */
/** Below this screen height the logo shrinks so everything fits without scrolling. */
const COMPACT_SCREEN_HEIGHT = 640;

export default function MpinSetupScreen() {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  // A shorter logo keeps the keypad and the link below it on screen on small phones.
  const logoSize = screenHeight < COMPACT_SCREEN_HEIGHT ? 72 : 100;
  const [step, setStep] = useState<Step>('create');
  const [draft, setDraft] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const onComplete = useCallback(
    async (value: string) => {
      if (savingRef.current) return;
      if (!isValidMpinFormat(value)) {
        setError('Enter a 4-digit MPIN.');
        setPin('');
        return;
      }

      if (step === 'create') {
        setDraft(value);
        setPin('');
        setError(null);
        setStep('confirm');
        return;
      }

      if (value !== draft) {
        setError('MPINs do not match. Try again.');
        setPin('');
        setStep('create');
        setDraft('');
        return;
      }

      savingRef.current = true;
      setSaving(true);
      setError(null);
      try {
        await setMpin(value, getLastLoginId() ?? undefined);
      } catch (err) {
        setError(toUserMessage(err, 'Could not save MPIN. Please try again.'));
        setPin('');
        setStep('create');
        setDraft('');
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [draft, step],
  );

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
          <Text style={styles.title}>{step === 'create' ? 'Enter MPIN' : 'Confirm MPIN'}</Text>
          <Text style={styles.sub}>Unlock Mera Coach with your 4- digit-code</Text>

          <MpinKeypad
            value={pin}
            onChange={v => {
              setPin(v);
              setError(null);
            }}
            onComplete={value => void onComplete(value)}
            disabled={saving}
            error={error}
          />

          {step === 'create' ? (
            <TouchableOpacity
              onPress={() => void deferMpinSetup()}
              disabled={saving}
              activeOpacity={PressOpacity.soft}
              accessibilityRole="button"
              accessibilityLabel="Skip MPIN setup for now"
              hitSlop={HitSlop.sm}
              style={styles.forgotHit}
            >
              <Text style={styles.forgot}>Skip for now</Text>
            </TouchableOpacity>
          ) : null}
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
    lineHeight: 18,
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
