import React, { useMemo, useState } from 'react';
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
import { Colors } from '../constants/theme';
import { wizardShellStyles } from '../constants/wizardStyles';
import { COACH_TYPES, DEFAULT_COACH_TYPE } from '../config/coachTypes';
import { SCREEN_REGISTRY } from './addClient/screenRegistry';
import PhaseTransition from '../components/PhaseTransition';
import { createBlankProfile } from '../data/clientProfiles';
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

  const update = <K extends keyof ClientProfile>(key: K, val: ClientProfile[K]) =>
    setForm(f => ({ ...f, [key]: val }));

  const entry = flatNav[index]!;
  const isLast = index === flatNav.length - 1;
  const goNext = () => (isLast ? navigation.goBack() : setIndex(i => i + 1));
  const goBack = () => setIndex(i => i - 1);

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
        {index > 0 && (
          <TouchableOpacity style={styles.floatingBack} onPress={goBack}>
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

          <TouchableOpacity style={styles.nextBtn} onPress={goNext}>
            <Text style={styles.nextText}>{isLast ? 'Save Client' : 'Next'}</Text>
            <Ionicons
              name={isLast ? 'checkmark' : 'arrow-forward'}
              size={18}
              color={Colors.white}
            />
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create(wizardShellStyles);
