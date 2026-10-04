import React, { useMemo, useRef, useState } from 'react';
import { Alert, View, Text, ScrollView, StyleSheet } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { ScreenPad, Spacing } from '../../constants/theme';
import { wizardShellStyles } from '../../constants/wizardStyles';
import { COACH_TYPES, DEFAULT_COACH_TYPE } from '../../config/coachTypes';
import { SCREEN_REGISTRY } from './screenRegistry';
import FormErrorBanner from '../../components/FormErrorBanner';
import GreenSubmitButton from '../../components/GreenSubmitButton';
import WaveScreenHeader from '../../components/WaveScreenHeader';
import StickyFooter from '../../components/StickyFooter';
import KeyboardSafeScroll, {
  STICKY_FOOTER_KEYBOARD_PADDING,
  useScrollLowerFieldsIntoView,
} from '../../components/KeyboardSafeScroll';
import PhaseTransition from '../../components/addClient/PhaseTransition';
import { isDietEmpty } from '../../data/dietCatalog';
import { getErrorMessage } from '../../api/client';
import { queryKeys } from '../../api/queryKeys';
import { getCurrentCoachCode } from '../../auth/session';
import { computeBmiMetrics } from '../../utils/bmi';
import {
  validateClientPersonalProfile,
  validateClientLifestyleProfile,
} from '../../utils/validation';
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
import type { ClientProfile, SaveDietPlanResult } from '../../types/models';

type NavEntry =
  | { type: 'interstitial'; phaseIndex: number }
  | { type: 'screen'; screenId: string; phaseIndex: number };

type AssessmentFlow = 'add' | 'checkup';

export type AssessmentCompleteResult = {
  dietPlan?: SaveDietPlanResult;
  ids?: AssessmentIds;
};

interface AssessmentWizardFlowProps {
  initialForm: ClientProfile;
  initialIds?: AssessmentIds;
  /** Add Client skips BMI result; checkup keeps the full phase list. */
  flow?: AssessmentFlow;
  /** Jump straight to this phase's first screen (e.g. dietPlan from Client Detail). */
  initialPhaseId?: string;
  /**
   * assessment: full checkup finish (BMI + mark-complete).
   * dietPlan: only save-diet-plan when a plan exists (shortcut entry).
   */
  commitMode?: 'assessment' | 'dietPlan';
  finishLabel?: string;
  /** When true, skip save-meals if the coach did not enter any food items (checkup/edit). */
  skipEmptyDietCommit?: boolean;
  /** Stack header title (e.g. Add Client, Checkup, Diet Plan). */
  headerTitle: string;
  /** Optional trailing header control (e.g. Download PDF on diet-plan shortcut). */
  headerRight?: React.ReactNode;
  onHome?: () => void;
  onExit: () => void;
  onComplete: (result?: AssessmentCompleteResult) => void | Promise<void>;
}

export default function AssessmentWizardFlow({
  initialForm,
  initialIds = {},
  flow = 'add',
  initialPhaseId,
  commitMode = 'assessment',
  finishLabel = 'Save Client',
  skipEmptyDietCommit = false,
  headerTitle,
  headerRight,
  onHome,
  onExit,
  onComplete,
}: AssessmentWizardFlowProps) {
  const queryClient = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);
  const scrollLowerFieldsIntoView = useScrollLowerFieldsIntoView(scrollRef);
  const coachType = COACH_TYPES[DEFAULT_COACH_TYPE]!;

  const phases = useMemo(() => {
    if (commitMode === 'dietPlan') {
      return coachType.phases.filter(phase => phase.id === 'dietPlan');
    }
    if (flow === 'add') {
      // Product: Add Client excludes BMI summary and AI diet-plan wizard phase.
      return coachType.phases.filter(phase => phase.id !== 'bmiResult' && phase.id !== 'dietPlan');
    }
    // Product: Checkup excludes AI diet-plan wizard phase (separate screen button flow).
    return coachType.phases.filter(phase => phase.id !== 'dietPlan');
  }, [coachType, flow, commitMode]);

  const flatNav = useMemo<NavEntry[]>(() => {
    const list: NavEntry[] = [];
    phases.forEach((phase, phaseIndex) => {
      if (phaseIndex > 0) list.push({ type: 'interstitial', phaseIndex });
      phase.screens.forEach(screenId => list.push({ type: 'screen', screenId, phaseIndex }));
    });
    return list;
  }, [phases]);

  const startIndex = useMemo(() => {
    if (!initialPhaseId) return 0;
    const idx = flatNav.findIndex(
      e => e.type === 'screen' && phases[e.phaseIndex]?.id === initialPhaseId,
    );
    return idx >= 0 ? idx : 0;
  }, [flatNav, phases, initialPhaseId]);

  const [index, setIndex] = useState(startIndex);
  const [form, setForm] = useState<ClientProfile>(initialForm);
  const [ids, setIds] = useState<AssessmentIds>(initialIds);
  const [bmiSaved, setBmiSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [apiError, setApiError] = useState('');
  /** True after generate/regenerate; false when loaded from diet-plan-report or after save. */
  const [hasUnsavedDietPlan, setHasUnsavedDietPlan] = useState(false);
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
    if (key === 'dietPlan') setHasUnsavedDietPlan(true);
    // DOB/Age are an OR rule — editing either can clear both highlights.
    if (key === 'dob' || key === 'age') clearFieldError('dob', 'age');
    else clearFieldError(String(key));
  };

  const entry = flatNav[index]!;
  const isLast = index === flatNav.length - 1;
  // When opened mid-flow (e.g. diet plan shortcut), back from the start screen exits.
  const goBack = () => (index <= startIndex ? onExit() : setIndex(i => i - 1));

  const showApiError = (message: string) => {
    setApiError(message);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const completeAssessment = async (
    nextIds: AssessmentIds,
    metrics: ReturnType<typeof computeBmiMetrics>,
    bmiAlreadySavedNow: boolean,
  ) => {
    if (!metrics && flow === 'add') {
      showApiError('Complete height, weight, date of birth or age, and gender before finishing.');
      return;
    }
    await finishAssessment(nextIds, metrics, bmiAlreadySavedNow || bmiSaved, 0);
    await onComplete({ ids: nextIds });
  };

  const goNext = async () => {
    if (entry.type === 'interstitial') {
      setIndex(i => i + 1);
      return;
    }
    if (savingRef.current) return;

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
        scrollRef.current?.scrollTo({ y: 0, animated: true });
        return;
      }
    }

    if (phaseId === 'lifestyle') {
      if (applyValidation(validateClientLifestyleProfile(form))) {
        setApiError('');
        scrollRef.current?.scrollTo({ y: 0, animated: true });
        return;
      }
    }

    clearAllErrors();
    setApiError('');
    savingRef.current = true;
    setSaving(true);
    try {
      if (phaseId === 'personal') {
        const committed = await commitPersonal(form, ids);
        const nextIds = committed.ids;
        setIds(nextIds);
        // Avoid re-uploading the same pending photos if the coach revisits this step.
        if ((form.photos ?? []).some(p => p.dataUrl)) {
          if (nextIds.clientCode) {
            void queryClient.invalidateQueries({
              queryKey: queryKeys.progressPhotos(getCurrentCoachCode() ?? '', nextIds.clientCode),
            });
          }
          setForm(f => ({
            ...f,
            photos: (f.photos ?? []).map(p => (p.dataUrl ? { id: p.id, uri: p.uri } : p)),
          }));
        }
        if (committed.photoUploadError) {
          Alert.alert('Photo not saved', committed.photoUploadError);
        }
      } else if (phaseId === 'lifestyle') {
        await commitLifestyle(form, ids);
      } else if (phaseId === 'diet') {
        if (!skipEmptyDietCommit || !isDietEmpty(form.diet)) {
          await commitDiet(form, ids);
        }
        if (isLast && commitMode === 'assessment') {
          const metrics = computeBmiMetrics(form);
          await completeAssessment(ids, metrics, false);
          return;
        }
      } else if (phaseId === 'bmiResult') {
        const metrics = computeBmiMetrics(form);
        let savedNow = false;
        if (metrics) {
          await commitBmi(metrics, ids, 0);
          setBmiSaved(true);
          savedNow = true;
        }
        if (isLast && commitMode === 'assessment') {
          await completeAssessment(ids, metrics, savedNow);
          return;
        }
      } else if (phaseId === 'dietPlan') {
        // Diet plan only appears in the dedicated diet-plan shortcut flow.
        if (!form.dietPlan) {
          showApiError('Generate a plan before saving, or go back.');
          return;
        }
        if (!hasUnsavedDietPlan) {
          showApiError('Generate or regenerate a plan before saving.');
          return;
        }
        const dietPlan = await commitDietPlan(form.dietPlan, ids);
        if (dietPlan.clientCode || dietPlan.assessmentCode) {
          setIds(prev => ({
            clientCode: dietPlan.clientCode ?? prev.clientCode,
            assessmentCode: dietPlan.assessmentCode ?? prev.assessmentCode,
          }));
        }
        setHasUnsavedDietPlan(false);
        await onComplete({ dietPlan, ids });
        return;
      }
      setIndex(i => i + 1);
    } catch (err) {
      showApiError(getErrorMessage(err, 'Something went wrong. Please try again.'));
      setBanner(null);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (entry.type === 'interstitial') {
    const fromPhase = phases[entry.phaseIndex - 1]!;
    const toPhase = phases[entry.phaseIndex]!;
    return (
      <View style={styles.container}>
        <WaveScreenHeader title={toPhase.label} onBack={goBack} onHome={onHome} />
        <PhaseTransition
          fromLabel={fromPhase.label}
          toLabel={toPhase.label}
          toIcon={toPhase.icon}
          onContinue={goNext}
        />
      </View>
    );
  }

  const screen = SCREEN_REGISTRY[entry.screenId]!;
  const StepComponent = screen.Component;
  const stepExtraProps =
    entry.screenId === 'basicProfile'
      ? {
          errorFields,
          onLowerFieldFocus: scrollLowerFieldsIntoView,
          clientCode: ids.clientCode || undefined,
        }
      : entry.screenId === 'lifestylePreferences' || entry.screenId === 'healthGoals'
        ? { errorFields, onLowerFieldFocus: scrollLowerFieldsIntoView }
        : {};

  const bannerMessage = formErrorBanner || apiError || null;
  const dietPlanPage = commitMode === 'dietPlan';
  // dietPlan shortcut: Save Plan only after generate/regenerate (not when viewing a saved report).
  const showFinishBtn = !dietPlanPage || (!!form.dietPlan && hasUnsavedDietPlan);

  return (
    <View style={styles.container}>
      <WaveScreenHeader
        title={headerTitle}
        titleIcon={dietPlanPage ? 'people-outline' : undefined}
        onBack={goBack}
        onHome={onHome}
        rightExtra={headerRight}
        showHome={dietPlanPage || !headerRight}
      />

      <KeyboardSafeScroll
        ref={scrollRef}
        style={styles.body}
        contentContainerStyle={dietPlanPage ? styles.dietBody : styles.bodyContent}
        keyboardPadding={STICKY_FOOTER_KEYBOARD_PADDING}
      >
        {dietPlanPage ? null : (
          <View style={styles.stepHead}>
            <Text style={styles.stepTitle}>{screen.title}</Text>
            <View style={styles.stepUnderline} />
            {screen.subtitle ? <Text style={styles.stepSubtitle}>{screen.subtitle}</Text> : null}
          </View>
        )}

        <FormErrorBanner message={bannerMessage} />

        <StepComponent
          form={form}
          update={update}
          {...(screen.componentProps || {})}
          {...stepExtraProps}
        />
      </KeyboardSafeScroll>

      {showFinishBtn ? (
        <StickyFooter style={styles.footer}>
          <GreenSubmitButton
            label={isLast ? finishLabel : 'Next'}
            onPress={() => void goNext()}
            loading={saving}
          />
        </StickyFooter>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  ...wizardShellStyles,
  dietBody: {
    paddingTop: Spacing.md,
    paddingHorizontal: ScreenPad.horizontal,
  },
});
