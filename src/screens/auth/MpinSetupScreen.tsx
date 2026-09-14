import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontFamily, Radius, Shadow, Spacing } from '../../constants/theme';
import { BrandImages } from '../../constants/images';
import AppButton from '../../components/AppButton';
import BrandLockup from '../../components/BrandLockup';
import MpinKeypad from '../../components/auth/MpinKeypad';
import { deferMpinSetup, getLastLoginId, setMpin } from '../../auth/mpin';
import { toUserMessage } from '../../api/client';
import { isValidMpinFormat } from '../../utils/mpinCrypto';

type Step = 'create' | 'confirm';

/**
 * Shown after password login when no MPIN is stored yet.
 * "Set up later" defers until Profile → Set MPIN.
 */
export default function MpinSetupScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('create');
  const [draft, setDraft] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onComplete = useCallback(
    async (value: string) => {
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
        setSaving(false);
      }
    },
    [draft, step],
  );

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
          <Text style={styles.title}>
            {step === 'create' ? 'Create your MPIN' : 'Confirm MPIN'}
          </Text>
          <Text style={styles.sub}>
            {step === 'create'
              ? 'Choose a 4-digit code for quick unlock next time you open the app.'
              : 'Enter the same 4 digits again to confirm.'}
          </Text>

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

          <AppButton
            label="Set up later"
            variant="ghost"
            onPress={() => void deferMpinSetup()}
            disabled={saving}
            accessibilityLabel="Set up MPIN later from Profile"
          />
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
    lineHeight: 18,
  },
});
