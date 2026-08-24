import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../constants/theme';
import { wizardShellStyles } from '../constants/wizardStyles';
import { getErrorMessage } from '../api/client';
import type { ClientProfile } from '../types/models';
import type { IoniconName, WizardScreen } from '../types/wizard';

export interface FinishButtonConfig {
  label: string;
  icon: IoniconName;
  onPress: (form: ClientProfile) => void | Promise<void>;
}

interface PhaseWizardProps {
  screens: WizardScreen[];
  initialForm: ClientProfile;
  finishLabel?: string;
  onFinish?: (form: ClientProfile) => void | Promise<void>;
  onExit?: () => void;
  finishButtons?: FinishButtonConfig[];
  /** Parent already applied top safe-area padding (e.g. a notice banner above). */
  skipTopSafeArea?: boolean;
}

// Self-contained multi-page wizard for a single phase, reusing AddClientScreen's layout.
export default function PhaseWizard({
  screens,
  initialForm,
  finishLabel = 'Save',
  onFinish,
  onExit,
  finishButtons,
  skipTopSafeArea = false,
}: PhaseWizardProps) {
  const insets = useSafeAreaInsets();
  const topInset = skipTopSafeArea ? 0 : insets.top;
  const bottomInset = Math.max(insets.bottom, 12);
  const [index, setIndex] = useState(0);
  const [form, setForm] = useState<ClientProfile>(initialForm);
  const [saving, setSaving] = useState(false);
  /** Which finishButtons entry is in-flight — only that button shows a spinner. */
  const [activeFinishIndex, setActiveFinishIndex] = useState<number | null>(null);
  const [error, setError] = useState('');

  const update = <K extends keyof ClientProfile>(key: K, val: ClientProfile[K]) =>
    setForm(f => (f[key] === val ? f : { ...f, [key]: val }));

  const screen = screens[index];
  if (!screen) return null;
  const StepComponent = screen.Component;
  const isLast = index === screens.length - 1;
  const anyFinishBusy = activeFinishIndex != null;

  const runFinishButton = async (
    action: (form: ClientProfile) => void | Promise<void>,
    finishIndex: number,
  ) => {
    if (anyFinishBusy || saving) return;
    setError('');
    setActiveFinishIndex(finishIndex);
    try {
      await action(form);
    } catch (err) {
      setError(getErrorMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      setActiveFinishIndex(null);
    }
  };

  const runSave = async (action: (form: ClientProfile) => void | Promise<void>) => {
    if (saving || anyFinishBusy) return;
    setError('');
    setSaving(true);
    try {
      await action(form);
    } catch (err) {
      setError(getErrorMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const finishCount = finishButtons?.length ?? 0;
  /** 3+ actions use a 2×2 drawer grid; 1–2 stay as a single row of pills. */
  const useFinishGrid = finishCount > 2;

  const renderFinishButton = (btn: FinishButtonConfig, i: number) => {
    const isActive = activeFinishIndex === i;
    const isIdleDisabled = anyFinishBusy && !isActive;
    const isPrimary = !useFinishGrid && i === 0;
    return (
      <TouchableOpacity
        key={btn.label}
        style={[
          useFinishGrid ? styles.finishTile : styles.finishBtn,
          useFinishGrid
            ? styles.finishTileSurface
            : isPrimary
              ? styles.finishBtnPrimary
              : styles.finishBtnSecondary,
          (isActive || isIdleDisabled) && styles.finishBtnDisabled,
        ]}
        onPress={() => runFinishButton(btn.onPress, i)}
        disabled={anyFinishBusy}
        activeOpacity={0.75}
      >
        {isActive ? (
          <ActivityIndicator color={isPrimary ? Colors.white : Colors.primary} />
        ) : (
          <>
            {useFinishGrid ? (
              <View style={[styles.finishTileIcon, { backgroundColor: Colors.primaryLight }]}>
                <Ionicons name={btn.icon} size={20} color={Colors.primary} />
              </View>
            ) : (
              <Ionicons
                name={btn.icon}
                size={17}
                color={isPrimary ? Colors.white : Colors.primary}
              />
            )}
            <Text
              style={
                useFinishGrid
                  ? styles.finishTileText
                  : isPrimary
                    ? styles.finishTextPrimary
                    : styles.finishTextSecondary
              }
              numberOfLines={1}
            >
              {btn.label}
            </Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  const footer =
    isLast && finishButtons ? (
      <View style={[styles.footer, { paddingBottom: bottomInset }]}>
        {useFinishGrid ? (
          <View style={styles.finishGrid}>
            {[0, 1].map(row => (
              <View key={row} style={styles.finishRow}>
                {finishButtons
                  .slice(row * 2, row * 2 + 2)
                  .map((btn, col) => renderFinishButton(btn, row * 2 + col))}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.finishRow}>{finishButtons.map(renderFinishButton)}</View>
        )}
      </View>
    ) : (
      <View style={[styles.footer, { paddingBottom: bottomInset }]}>
        <TouchableOpacity
          style={[styles.nextBtn, saving && styles.nextBtnDisabled]}
          onPress={() =>
            isLast ? (onFinish ? runSave(onFinish) : undefined) : setIndex(i => i + 1)
          }
          disabled={saving}
          activeOpacity={0.75}
        >
          {saving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Text style={styles.nextText}>{isLast ? finishLabel : 'Next'}</Text>
              {!isLast ? <Ionicons name="arrow-forward" size={18} color={Colors.white} /> : null}
            </>
          )}
        </TouchableOpacity>
      </View>
    );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        {(index > 0 || onExit) && (
          <TouchableOpacity
            style={[styles.floatingBack, { top: topInset + 8 }]}
            onPress={() => (index > 0 ? setIndex(i => i - 1) : onExit?.())}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.textDark} />
          </TouchableOpacity>
        )}

        <ScrollView
          style={styles.body}
          contentContainerStyle={[styles.bodyContent, { paddingTop: topInset + 56 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.stepBanner}>
            <Ionicons name={screen.icon} size={20} color={Colors.white} />
            <View style={styles.stepBannerText}>
              <Text style={styles.stepBannerTitle}>{screen.title}</Text>
              {screen.subtitle ? (
                <Text style={styles.stepBannerSubtitle}>{screen.subtitle}</Text>
              ) : null}
            </View>
          </View>

          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={Colors.primary} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <StepComponent form={form} update={update} {...(screen.componentProps || {})} />
        </ScrollView>

        {footer}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  ...wizardShellStyles,
  bodyContent: { padding: 20, paddingTop: 100, paddingBottom: 16 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.sm,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: Colors.primary, fontSize: 13, fontWeight: '600', flex: 1 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  nextBtnDisabled: { opacity: 0.7 },
  finishBtnDisabled: { opacity: 0.7 },
  finishGrid: { gap: 10 },
  finishRow: { flexDirection: 'row', gap: 10 },
  finishBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: Radius.pill,
    paddingVertical: 14,
    minHeight: 50,
  },
  finishTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: 8,
    minHeight: 78,
  },
  finishTileSurface: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  finishTileIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishTileText: {
    color: Colors.textDark,
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
  },
  finishBtnPrimary: { backgroundColor: Colors.primary, ...Shadow.sm },
  finishBtnSecondary: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  finishTextPrimary: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  finishTextSecondary: { color: Colors.primary, fontWeight: '700', fontSize: 13 },
});
