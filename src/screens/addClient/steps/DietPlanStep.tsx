import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  IconSize,
  PressOpacity,
  Radius,
  Shadow,
  Spacing,
  Typography,
  headingFont,
} from '../../../constants/theme';
import GreenSubmitButton from '../../../components/GreenSubmitButton';
import { generateDietPlan, resolveMasterLabel } from '../../../api/masterApi';
import { getCoachProfile } from '../../../api/coachApi';
import { getErrorMessage } from '../../../api/client';
import { queryKeys } from '../../../api/queryKeys';
import { useParamMasterOptions } from '../../../hooks/useParamOptions';
import { PARAM_CODES, REGIONAL_CUISINES } from '../../../data/lifestyleOptions';
import { buildGenerateDietPlanBody } from '../../../utils/generateDietPlanBody';
import { getBmi, getBmiCategory } from '../../../utils/bmi';
import type { ClientProfile, GeneratedDietPlanMeal } from '../../../types/models';
import type { IoniconName, StepProps } from '../../../types/wizard';

const Tone = {
  underline: '#F26C2C',
  rowMint: '#E7F6EF',
  rowYellow: '#FFF3C9',
  gold: '#E09628',
  goldDeep: '#D5891D',
} as const;

const REC_ITEMS: {
  key: 'waterIntake' | 'foodsToAvoid' | 'supplements' | 'healthTips';
  icon: IoniconName;
  label: string;
}[] = [
  { key: 'waterIntake', icon: 'water-outline', label: 'Water' },
  { key: 'foodsToAvoid', icon: 'ban-outline', label: 'Avoid' },
  { key: 'supplements', icon: 'medical-outline', label: 'Supplements' },
  { key: 'healthTips', icon: 'heart-outline', label: 'Tips' },
];

function textOrDash(value: string | undefined | null): string {
  const text = value?.trim();
  return text ? text : '-';
}

function calorieLabel(min: number, max: number): string {
  const lo = min > 0 ? min : 0;
  const hi = max > 0 ? max : 0;
  if (!lo && !hi) return '-';
  if (lo && hi) return `${lo}-${hi} kcal`;
  return `${lo || hi} kcal`;
}

function SectionTitle({ children }: { children: string }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{children}</Text>
      <View style={styles.sectionUnderline} />
    </View>
  );
}

function MetricBar({
  icon,
  label,
  value,
  tone,
}: {
  icon: IoniconName;
  label: string;
  value: string;
  tone: 'yellow' | 'mint';
}) {
  const yellow = tone === 'yellow';
  return (
    <View style={[styles.bar, yellow ? styles.barYellow : styles.barMint]}>
      <Ionicons name={icon} size={IconSize.sm} color={yellow ? Tone.goldDeep : Colors.accentInk} />
      <Text
        style={[styles.barLabel, yellow ? styles.barLabelGold : styles.barLabelMint]}
        numberOfLines={2}
      >
        {label}
      </Text>
      <Text style={[styles.barValue, yellow ? styles.barValueGold : styles.barValueMint]}>
        {value}
      </Text>
    </View>
  );
}

function MealCard({ meal }: { meal: GeneratedDietPlanMeal }) {
  return (
    <View style={styles.card}>
      <Text style={styles.mealTitle}>{textOrDash(meal.mealType)}</Text>
      <MetricBar icon="time-outline" label="Time" value={textOrDash(meal.mealTime)} tone="mint" />
      <View style={styles.optionBlock}>
        <View style={styles.optionHead}>
          <Ionicons name="restaurant-outline" size={IconSize.sm} color={Colors.accentInk} />
          <Text style={styles.optionLabel}>Options</Text>
        </View>
        {meal.options.length > 0 ? (
          meal.options.map((opt, index) => (
            <Text key={`${opt}-${index}`} style={styles.optionLine}>
              {index + 1}. {opt}
            </Text>
          ))
        ) : (
          <Text style={styles.optionLine}>-</Text>
        )}
      </View>
      <MetricBar
        icon="flame-outline"
        label="Calories"
        value={calorieLabel(meal.calMin, meal.calMax)}
        tone="mint"
      />
      <MetricBar icon="bulb-outline" label="Tip" value={textOrDash(meal.tip)} tone="mint" />
    </View>
  );
}

export default function DietPlanStep({ form, update }: StepProps<ClientProfile>) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const cuisineOptions = useParamMasterOptions(PARAM_CODES.regionalCuisine, REGIONAL_CUISINES);
  const coachProfileQuery = useQuery({
    queryKey: queryKeys.coachProfile,
    queryFn: getCoachProfile,
  });

  const generate = async () => {
    if (generating) return;
    setGenerating(true);
    setError('');
    try {
      const plan = await generateDietPlan(
        buildGenerateDietPlanBody(form, {
          countryCd: coachProfileQuery.data?.country,
          cuisineLabel: resolveMasterLabel(form.regionalCuisine, cuisineOptions),
        }),
      );
      update('dietPlan', plan);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to generate a plan. Please try again.'));
    } finally {
      setGenerating(false);
    }
  };

  const plan = form.dietPlan;
  const apiBmi = plan?.summary?.bmi;
  const profileBmi = getBmi(form.height, form.weight);
  const bmi = typeof apiBmi === 'number' && apiBmi > 0 ? apiBmi : profileBmi;
  const hasBmi = typeof bmi === 'number' && bmi > 0;
  const category =
    plan?.summary?.bmiCategory?.trim() || (hasBmi ? getBmiCategory(bmi)?.label : '') || '';
  const dailyCalTarget = plan?.summary?.dailyCalTarget;
  const meals = plan?.weeklyPlan ?? [];

  return (
    <View>
      <View style={styles.noteCard}>
        <Ionicons name="sparkles-outline" size={IconSize.md} color={Colors.accentInk} />
        <View style={styles.noteCopy}>
          <Text style={styles.noteTitle}>Optional step</Text>
          <Text style={styles.noteBody}>
            Generate an AI-suggested weekly plan from this client&apos;s profile and current meals.
            You can leave without generating. Save Plan appears only after you generate or
            regenerate.
          </Text>
        </View>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={IconSize.md} color={Colors.primary} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {!plan ? (
        <View style={styles.emptyCard}>
          <Ionicons name="restaurant-outline" size={IconSize.xxl} color={Colors.accentInk} />
          <Text style={styles.emptyTitle}>No plan yet</Text>
          <Text style={styles.emptyMessage}>
            Generate a meal plan based on this client&apos;s goals, preferences, and activity.
          </Text>
          <GreenSubmitButton
            label="Generate Plan"
            onPress={generate}
            loading={generating}
            style={styles.generateBtn}
          />
        </View>
      ) : (
        <>
          <View style={styles.section}>
            <SectionTitle>Summary</SectionTitle>
            <View style={styles.card}>
              <MetricBar
                icon="fitness-outline"
                label="BMI"
                value={hasBmi ? bmi!.toFixed(1) : '-'}
                tone="yellow"
              />
              <MetricBar
                icon="ribbon-outline"
                label="Category"
                value={textOrDash(category)}
                tone="mint"
              />
              <MetricBar
                icon="flame-outline"
                label="Daily calories"
                value={
                  typeof dailyCalTarget === 'number' && dailyCalTarget > 0
                    ? `${dailyCalTarget} kcal`
                    : '-'
                }
                tone="mint"
              />
            </View>
          </View>

          {meals.length > 0 ? (
            <View style={styles.section}>
              <SectionTitle>Weekly Plan</SectionTitle>
              <View style={styles.mealList}>
                {meals.map((meal, index) => (
                  <MealCard key={`${meal.mealType}-${meal.mealTime}-${index}`} meal={meal} />
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <SectionTitle>Key Recommendations</SectionTitle>
            <View style={styles.card}>
              {REC_ITEMS.map(item => (
                <MetricBar
                  key={item.key}
                  icon={item.icon}
                  label={item.label}
                  value={textOrDash(plan.recommendations?.[item.key])}
                  tone="mint"
                />
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.regenerateBtn, generating && styles.regenerateDisabled]}
            onPress={generate}
            disabled={generating}
            activeOpacity={PressOpacity.default}
            accessibilityRole="button"
            accessibilityLabel="Regenerate"
            accessibilityState={{ disabled: generating, busy: generating }}
          >
            {generating ? (
              <ActivityIndicator color={Colors.accentInk} />
            ) : (
              <>
                <Ionicons name="refresh-outline" size={IconSize.md} color={Colors.accentInk} />
                <Text style={styles.regenerateText}>Regenerate</Text>
              </>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  noteCopy: { flex: 1, minWidth: 0 },
  noteTitle: {
    ...Typography.headline,
    color: Colors.accentInk,
  },
  noteBody: {
    ...Typography.body,
    color: Colors.accentInk,
    marginTop: 4,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginTop: Spacing.md,
  },
  errorText: {
    ...Typography.label,
    color: Colors.primary,
    flex: 1,
  },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    ...Shadow.sm,
  },
  emptyTitle: {
    ...Typography.headline,
    color: Colors.accentInk,
  },
  emptyMessage: {
    ...Typography.body,
    color: Colors.accentInk,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: Spacing.md,
  },
  generateBtn: { alignSelf: 'stretch' },
  section: { marginTop: Spacing.lg },
  sectionHead: { alignItems: 'flex-start', marginBottom: Spacing.sm },
  sectionTitle: {
    ...Typography.title,
    color: Colors.accentInk,
  },
  sectionUnderline: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Tone.underline,
    marginTop: 2,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
    ...Shadow.sm,
  },
  mealList: { gap: Spacing.sm },
  mealTitle: {
    ...Typography.headline,
    color: Colors.accentInk,
    marginBottom: 2,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: Spacing.sm,
  },
  barYellow: { backgroundColor: Tone.rowYellow },
  barMint: { backgroundColor: Tone.rowMint },
  barLabel: {
    width: 118,
    ...Typography.label,
  },
  barLabelGold: { color: Tone.goldDeep },
  barLabelMint: { color: Colors.accentInk },
  barValue: {
    flex: 1,
    minWidth: 0,
    textAlign: 'right',
    fontFamily: headingFont.bold,
    fontSize: Typography.tileValue.fontSize,
    lineHeight: 22,
  },
  barValueGold: { color: Tone.gold },
  barValueMint: { color: Colors.accentInk },
  optionBlock: {
    backgroundColor: Tone.rowMint,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 4,
  },
  optionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  optionLabel: {
    ...Typography.label,
    color: Colors.accentInk,
  },
  optionLine: {
    ...Typography.body,
    color: Colors.accentInk,
    marginLeft: IconSize.sm + Spacing.sm,
  },
  regenerateBtn: {
    marginTop: Spacing.lg,
    minHeight: 48,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.accentInk,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  regenerateDisabled: { opacity: 0.55 },
  regenerateText: {
    ...Typography.bodyStrong,
    color: Colors.accentInk,
  },
});
