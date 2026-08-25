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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';
import {
  WIZARD_BACK_TOP_GAP,
  WIZARD_CONTENT_TOP_OFFSET,
  wizardShellStyles,
} from '../../constants/wizardStyles';
import { COACH_TYPES, DEFAULT_COACH_TYPE } from '../../config/coachTypes';
import { SCREEN_REGISTRY } from './screenRegistry';
import FormErrorBanner from '../../components/FormErrorBanner';
import PhaseTransition from '../../components/PhaseTransition';
import { isDietEmpty } from '../../data/dietCatalog';
import { getErrorMessage } from '../../api/client';
import { computeBmiMetrics } from '../../utils/bmi';
import { validateClientPersonalProfile } from '../../utils/validation';
import { useFormFieldErrors } from '../../hooks/useFormFieldErrors';
import {
  commitPersonal,
  commitLifestyle,
  commitDiet,
  commitBmi,
  commitDietPlan,
  finishAssessment,
} from './wizardCommits';
import type { AssessmentIds } from './wizardCommits';
import type { ClientProfile } from '../../types/models';

type NavEntry =
  | { type: 'interstitial'; phaseIndex: number }
  | { type: 'screen'; screenId: string; phaseIndex: number };

export type AssessmentFlow = 'add' | 'checkup';

interface AssessmentWizardFlowProps {
  initialForm: ClientProfile;
  initialIds?: AssessmentIds;
  /** Add Client skips BMI result; checkup keeps the full phase list. */
  flow?: AssessmentFlow;
  finishLabel?: string;
  /** When true, skip save-meals if the coach did not enter any food items (checkup/edit). */
  skipEmptyDietCommit?: boolean;
  onExit: () => void;
  onComplete: () => void | Promise<void>;
}

export default function AssessmentWizardFlow({
  initialForm,
  initialIds = {},
  flow = 'add',
  finishLabel = 'Save Client',
  skipEmptyDietCommit = false,
  onExit,
  onComplete,
}: AssessmentWizardFlowProps) {
  const insets = useSafeAreaInsets();
  const backTop = insets.top + WIZARD_BACK_TOP_GAP;
  const contentTop = insets.top + WIZARD_CONTENT_TOP_OFFSET;
  const bottomInset = Math.max(insets.bottom, 16);
  const coachType = COACH_TYPES[DEFAULT_COACH_TYPE]!;

  const phases = useMemo(() => {
    if (flow === 'add') {
      // Product: no BMI result step on Add Client; checkup keeps full flow.
      return coachType.phases.filter(phase => phase.id !== 'bmiResult');
    }
    return coachType.phases;
  }, [coachType, flow]);

  const flatNav = useMemo<NavEntry[]>(() => {
    const list: NavEntry[] = [];
    phases.forEach((phase, phaseIndex) => {
      if (phaseIndex > 0) list.push({ type: 'interstitial', phaseIndex });
      phase.screens.forEach(screenId => list.push({ type: 'screen', screenId, phaseIndex }));
    });
    return list;
  }, [phases]);

  const [index, setIndex] = useState(0);
  const [form, setForm] = useState<ClientProfile>(initialForm);
  const [ids, setIds] = useState<AssessmentIds>(initialIds);
  const [bmiSaved, setBmiSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');
  const {
    errorFields,
    formErrorBanner,
    clearFieldError,
    clearAllErrors,
    applyValidation,
    setBanner,
  } = useFormFieldErrors();

  const update = <K extends keyof ClientProfile>(key: K, val: ClientProfile[K]) => {
    setForm(f => (f[key] === val ? f : { ...f, [key]: val }));
    // DOB/Age are an OR rule — editing either can clear both highlights.
    if (key === 'dob' || key === 'age') clearFieldError('dob', 'age');
    else clearFieldError(String(key));
  };

  const entry = flatNav[index]!;
  const isLast = index === flatNav.length - 1;
  const goBack = () => (index === 0 ? onExit() : setIndex(i => i - 1));

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

    const phaseId = phases[entry.phaseIndex]!.id;

    if (phaseId === 'personal') {
      if (applyValidation(validateClientPersonalProfile(form))) {
        setApiError('');
        return;
      }
    }

    clearAllErrors();
    setApiError('');
    setSaving(true);
    try {
      if (phaseId === 'personal') {
        setIds(await commitPersonal(form, ids));
      } else if (phaseId === 'lifestyle') {
        await commitLifestyle(form, ids);
      } else if (phaseId === 'diet') {
        if (!skipEmptyDietCommit || !isDietEmpty(form.diet)) {
          await commitDiet(form, ids);
        }
      } else if (phaseId === 'bmiResult') {
        const metrics = computeBmiMetrics(form);
        if (metrics) {
          await commitBmi(metrics, ids, 0);
          setBmiSaved(true);
        }
      } else if (phaseId === 'dietPlan') {
        if (form.dietPlan) await commitDietPlan(form.dietPlan, ids);
        const metrics = computeBmiMetrics(form);
        await finishAssessment(ids, metrics, bmiSaved, 0);
        await onComplete();
        return;
      }
      setIndex(i => i + 1);
    } catch (err) {
      setApiError(getErrorMessage(err, 'Something went wrong. Please try again.'));
      setBanner(null);
    } finally {
      setSaving(false);
    }
  };

  if (entry.type === 'interstitial') {
    const fromPhase = phases[entry.phaseIndex - 1]!;
    const toPhase = phases[entry.phaseIndex]!;
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
  const stepExtraProps =
    entry.screenId === 'basicProfile' ? { showBmiPreview: flow === 'checkup', errorFields } : {};

  const bannerMessage = formErrorBanner || apiError || null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.floatingBack, { top: backTop }]}
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color={Colors.textDark} />
        </TouchableOpacity>

        <ScrollView
          style={styles.body}
          contentContainerStyle={[
            styles.bodyContent,
            { paddingTop: contentTop, paddingBottom: bottomInset + 24 },
          ]}
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

          <FormErrorBanner message={bannerMessage} />

          <StepComponent
            form={form}
            update={update}
            {...(screen.componentProps || {})}
            {...stepExtraProps}
          />

          <TouchableOpacity
            style={[styles.nextBtn, saving && styles.nextBtnDisabled]}
            onPress={goNext}
            disabled={saving}
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
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  ...wizardShellStyles,
  nextBtnDisabled: { opacity: 0.7 },
});
