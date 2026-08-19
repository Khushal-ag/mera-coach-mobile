import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../constants/theme';
import { wizardShellStyles } from '../constants/wizardStyles';
import type { ClientProfile } from '../types/models';
import type { IoniconName, WizardScreen } from '../types/wizard';

export interface FinishButtonConfig {
  label: string;
  icon: IoniconName;
  onPress: (form: ClientProfile) => void;
}

interface PhaseWizardProps {
  screens: WizardScreen[];
  initialForm: ClientProfile;
  finishLabel?: string;
  onFinish?: (form: ClientProfile) => void;
  onExit?: () => void;
  finishButtons?: FinishButtonConfig[];
}

// A small, self-contained multi-page wizard for a single phase (e.g. Lifestyle's 2 screens,
// Diet's 3 screens) — same per-screen layout AddClientScreen uses (floating back button,
// title banner, inline Next/Finish button), just scoped to one phase and one initial form.
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

  const update = <K extends keyof ClientProfile>(key: K, val: ClientProfile[K]) =>
    setForm(f => ({ ...f, [key]: val }));

  const screen = screens[index];
  if (!screen) return null;
  const StepComponent = screen.Component;
  const isLast = index === screens.length - 1;

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

          <StepComponent form={form} update={update} {...(screen.componentProps || {})} />

          {isLast && finishButtons ? (
            <View style={styles.finishRow}>
              {finishButtons.map((btn, i) => (
                <TouchableOpacity
                  key={btn.label}
                  style={[
                    styles.finishBtn,
                    i === 0 ? styles.finishBtnPrimary : styles.finishBtnSecondary,
                  ]}
                  onPress={() => btn.onPress(form)}
                >
                  <Ionicons
                    name={btn.icon}
                    size={17}
                    color={i === 0 ? Colors.white : Colors.primary}
                  />
                  <Text style={i === 0 ? styles.finishTextPrimary : styles.finishTextSecondary}>
                    {btn.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.nextBtn}
              onPress={() => (isLast ? onFinish?.(form) : setIndex(i => i + 1))}
            >
              <Text style={styles.nextText}>{isLast ? finishLabel : 'Next'}</Text>
              <Ionicons
                name={isLast ? 'checkmark' : 'arrow-forward'}
                size={18}
                color={Colors.white}
              />
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  ...wizardShellStyles,
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
