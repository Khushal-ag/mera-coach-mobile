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
}

// Self-contained multi-page wizard for a single phase, reusing AddClientScreen's layout.
export default function PhaseWizard({
  screens,
  initialForm,
  finishLabel = 'Save',
  onFinish,
  onExit,
  finishButtons,
}: PhaseWizardProps) {
  const [index, setIndex] = useState(0);
  const [form, setForm] = useState<ClientProfile>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = <K extends keyof ClientProfile>(key: K, val: ClientProfile[K]) =>
    setForm(f => ({ ...f, [key]: val }));

  const screen = screens[index];
  if (!screen) return null;
  const StepComponent = screen.Component;
  const isLast = index === screens.length - 1;

  const runAction = async (action: (form: ClientProfile) => void | Promise<void>) => {
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        {(index > 0 || onExit) && (
          <TouchableOpacity
            style={styles.floatingBack}
            onPress={() => (index > 0 ? setIndex(i => i - 1) : onExit?.())}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.textDark} />
          </TouchableOpacity>
        )}

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
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

          {isLast && finishButtons ? (
            <View style={styles.finishRow}>
              {finishButtons.map((btn, i) => (
                <TouchableOpacity
                  key={btn.label}
                  style={[
                    styles.finishBtn,
                    i === 0 ? styles.finishBtnPrimary : styles.finishBtnSecondary,
                    saving && styles.finishBtnDisabled,
                  ]}
                  onPress={() => runAction(btn.onPress)}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color={i === 0 ? Colors.white : Colors.primary} />
                  ) : (
                    <>
                      <Ionicons
                        name={btn.icon}
                        size={17}
                        color={i === 0 ? Colors.white : Colors.primary}
                      />
                      <Text style={i === 0 ? styles.finishTextPrimary : styles.finishTextSecondary}>
                        {btn.label}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.nextBtn, saving && styles.nextBtnDisabled]}
              onPress={() =>
                isLast ? (onFinish ? runAction(onFinish) : undefined) : setIndex(i => i + 1)
              }
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Text style={styles.nextText}>{isLast ? finishLabel : 'Next'}</Text>
                  <Ionicons
                    name={isLast ? 'checkmark' : 'arrow-forward'}
                    size={18}
                    color={Colors.white}
                  />
                </>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  ...wizardShellStyles,
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
  nextBtnDisabled: { opacity: 0.7 },
  finishBtnDisabled: { opacity: 0.7 },
  finishRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  finishBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: Radius.pill,
    paddingVertical: 14,
  },
  finishBtnPrimary: { backgroundColor: Colors.primary, ...Shadow.sm },
  finishBtnSecondary: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  finishTextPrimary: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  finishTextSecondary: { color: Colors.primary, fontWeight: '700', fontSize: 13 },
});
