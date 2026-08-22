import React, { useMemo, useState } from 'react';
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
import { Colors, Radius } from '../constants/theme';
import { wizardShellStyles } from '../constants/wizardStyles';
import { COACH_TYPES, DEFAULT_COACH_TYPE } from '../config/coachTypes';
import { SCREEN_REGISTRY } from './addClient/screenRegistry';
import PhaseTransition from '../components/PhaseTransition';
import { createBlankProfile } from '../data/clientProfiles';
import { getErrorMessage } from '../api/client';
import { computeBmiMetrics } from '../utils/bmi';
import { validateClientPersonalProfile } from '../utils/validation';
import {
  commitPersonal,
  commitLifestyle,
  commitDiet,
  commitBmi,
  commitDietPlan,
  finishAssessment,
} from './addClient/wizardCommits';
import type { AssessmentIds } from './addClient/wizardCommits';
import type { RootScreenProps } from '../types/navigation';
import type { ClientProfile } from '../types/models';

type NavEntry =
  | { type: 'interstitial'; phaseIndex: number }
  | { type: 'screen'; screenId: string; phaseIndex: number };

export default function AddClientScreen({ navigation }: RootScreenProps<'AddClient'>) {
  const coachType = COACH_TYPES[DEFAULT_COACH_TYPE]!;

  // Flatten phases into a linear nav list, inserting a full-screen "up next" interstitial
  // before the first screen of every phase after the first.
  const flatNav = useMemo<NavEntry[]>(() => {
    const list: NavEntry[] = [];
    coachType.phases.forEach((phase, phaseIndex) => {
      if (phaseIndex > 0) list.push({ type: 'interstitial', phaseIndex });
      phase.screens.forEach(screenId => list.push({ type: 'screen', screenId, phaseIndex }));
    });
    return list;
  }, [coachType]);

  const [index, setIndex] = useState(0);
  const [form, setForm] = useState<ClientProfile>(createBlankProfile);
  const [ids, setIds] = useState<AssessmentIds>({});
  const [bmiSaved, setBmiSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = <K extends keyof ClientProfile>(key: K, val: ClientProfile[K]) =>
    setForm(f => (f[key] === val ? f : { ...f, [key]: val }));

  const entry = flatNav[index]!;
  const isLast = index === flatNav.length - 1;
  const goBack = () => (index === 0 ? navigation.goBack() : setIndex(i => i - 1));

  const goNext = async () => {
    if (entry.type === 'interstitial') {
      setIndex(i => i + 1);
      return;
    }

    const nextEntry = flatNav[index + 1];
    const leavingPhase = !nextEntry || nextEntry.type === 'interstitial';
    if (!leavingPhase) {
      setIndex(i => i + 1);
      return;
    }

    const phaseId = coachType.phases[entry.phaseIndex]!.id;

    if (phaseId === 'personal') {
      const validationError = validateClientPersonalProfile(form);
      if (validationError) return setError(validationError);
    }

    setError('');
    setSaving(true);
    try {
      if (phaseId === 'personal') {
        setIds(await commitPersonal(form, ids));
      } else if (phaseId === 'lifestyle') {
        await commitLifestyle(form, ids);
      } else if (phaseId === 'diet') {
        await commitDiet(form, ids);
      } else if (phaseId === 'bmiResult') {
        if (form.saveBmiCheckup) {
          const metrics = computeBmiMetrics(form);
          if (metrics) {
            await commitBmi(metrics, ids, 0);
            setBmiSaved(true);
          }
        }
      } else if (phaseId === 'dietPlan') {
        if (form.dietPlan) await commitDietPlan(form.dietPlan, ids);
        const metrics = form.saveBmiCheckup ? computeBmiMetrics(form) : null;
        await finishAssessment(ids, metrics, bmiSaved, 0);
        navigation.goBack();
        return;
      }
      setIndex(i => i + 1);
    } catch (err) {
      setError(getErrorMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  if (entry.type === 'interstitial') {
    const fromPhase = coachType.phases[entry.phaseIndex - 1]!;
    const toPhase = coachType.phases[entry.phaseIndex]!;
    return (
      <PhaseTransition
        fromLabel={fromPhase.label}
        toLabel={toPhase.label}
        toIcon={toPhase.icon}
        onContinue={goNext}
      />
    );
  }

  const screen = SCREEN_REGISTRY[entry.screenId]!;
  const StepComponent = screen.Component;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <TouchableOpacity style={styles.floatingBack} onPress={goBack}>
          <Ionicons name="arrow-back" size={20} color={Colors.textDark} />
        </TouchableOpacity>

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

          <TouchableOpacity
            style={[styles.nextBtn, saving && styles.nextBtnDisabled]}
            onPress={goNext}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Text style={styles.nextText}>{isLast ? 'Save Client' : 'Next'}</Text>
                <Ionicons
                  name={isLast ? 'checkmark' : 'arrow-forward'}
                  size={18}
                  color={Colors.white}
                />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  ...wizardShellStyles,
  nextBtnDisabled: { opacity: 0.7 },
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
});
