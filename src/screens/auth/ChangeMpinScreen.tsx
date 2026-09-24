import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import {
  Colors,
  FontFamily,
  Radius,
  Shadow,
  Spacing,
  headingFont,
} from '../../constants/theme';
import AppButton from '../../components/AppButton';
import FormErrorBanner from '../../components/FormErrorBanner';
import KeyboardSafeScroll from '../../components/KeyboardSafeScroll';
import WaveScreenHeader from '../../components/WaveScreenHeader';
import MpinKeypad from '../../components/auth/MpinKeypad';
import {
  clearMpin,
  deferMpinSetup,
  getLastLoginId,
  isMpinConfigured,
  setMpin,
  verifyStoredMpin,
} from '../../auth/mpin';
import { isValidMpinFormat } from '../../utils/mpinCrypto';
import { toUserMessage } from '../../api/client';
import type { ProfileStackScreenProps } from '../../types/navigation';

type Step = 'current' | 'create' | 'confirm';

export default function ChangeMpinScreen({ navigation }: ProfileStackScreenProps<'ChangeMpin'>) {
  const hasExisting = isMpinConfigured();
  const [step, setStep] = useState<Step>(hasExisting ? 'current' : 'create');
  const [pin, setPin] = useState('');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const title =
    step === 'current' ? 'Current MPIN' : step === 'create' ? 'New MPIN' : 'Confirm new MPIN';

  const subtitle =
    step === 'current'
      ? 'Enter your current 4-digit MPIN to continue.'
      : step === 'create'
        ? hasExisting
          ? 'Choose a new 4-digit MPIN.'
          : 'Choose a 4-digit MPIN for quick unlock.'
        : 'Enter the same 4 digits again.';

  const onComplete = useCallback(
    async (value: string) => {
      if (busy) return;
      if (!isValidMpinFormat(value)) {
        setError('Enter a 4-digit MPIN.');
        setPin('');
        return;
      }

      if (step === 'current') {
        setBusy(true);
        try {
          const ok = await verifyStoredMpin(value);
          if (!ok) {
            setError('Incorrect MPIN.');
            setPin('');
            return;
          }
          setPin('');
          setError(null);
          setStep('create');
        } finally {
          setBusy(false);
        }
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
        setDraft('');
        setStep('create');
        return;
      }

      setBusy(true);
      setError(null);
      try {
        await setMpin(value, getLastLoginId() ?? undefined);
        Alert.alert('MPIN updated', 'Your MPIN has been saved.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } catch (err) {
        setError(toUserMessage(err, 'Could not save MPIN. Please try again.'));
        setPin('');
        setStep(hasExisting ? 'current' : 'create');
        setDraft('');
      } finally {
        setBusy(false);
      }
    },
    [busy, draft, hasExisting, navigation, step],
  );

  const onRemove = () => {
    Alert.alert('Remove MPIN?', 'You will use your password to sign in after the next logout.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await clearMpin();
            await deferMpinSetup();
            navigation.goBack();
          })();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <WaveScreenHeader
        title={hasExisting ? 'Change MPIN' : 'Set MPIN'}
        onBack={() => navigation.goBack()}
      />

      <KeyboardSafeScroll style={styles.scroll}>
        <View style={styles.card}>
          <FormErrorBanner message={error} />
          <Text style={styles.stepTitle}>{title}</Text>
          <Text style={styles.stepSub}>{subtitle}</Text>

          <MpinKeypad
            value={pin}
            onChange={v => {
              setPin(v);
              setError(null);
            }}
            onComplete={value => void onComplete(value)}
            disabled={busy}
          />

          {hasExisting ? (
            <AppButton
              label="Remove MPIN"
              variant="ghost"
              onPress={onRemove}
              disabled={busy}
              style={styles.removeBtn}
            />
          ) : null}
        </View>
      </KeyboardSafeScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  card: {
    backgroundColor: Colors.white,
    margin: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadow.md,
  },
  stepTitle: {
    fontSize: 18,
    fontFamily: headingFont.bold,
    color: Colors.textDark,
    textAlign: 'center',
    marginBottom: 4,
  },
  stepSub: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  removeBtn: { marginTop: Spacing.sm },
});
