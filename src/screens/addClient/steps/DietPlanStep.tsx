import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../../../constants/theme';
import { generateDietPlan, resolveMasterLabel } from '../../../api/masterApi';
import { getCoachProfile } from '../../../api/coachApi';
import { getErrorMessage } from '../../../api/client';
import { queryKeys } from '../../../api/queryKeys';
import { useParamMasterOptions } from '../../../hooks/useParamOptions';
import { PARAM_CODES, REGIONAL_CUISINES } from '../../../data/lifestyleOptions';
import { buildGenerateDietPlanBody } from '../../../utils/generateDietPlanBody';
import { getBmi, getBmiCategory } from '../../../utils/bmi';
import type { ClientProfile } from '../../../types/models';
import type { IoniconName, StepProps } from '../../../types/wizard';

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

export default function DietPlanStep({ form, update }: StepProps<ClientProfile>) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const cuisineOptions = useParamMasterOptions(PARAM_CODES.regionalCuisine, REGIONAL_CUISINES);
  const coachProfileQuery = useQuery({
    queryKey: queryKeys.coachProfile,
    queryFn: getCoachProfile,
  });

  const generate = async () => {
    setGenerating(true);
    setError('');
    try {
      // itemCodes for most fields; cuisine = option text; country = country code.
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
  // Prefer API summary; fall back to height/weight from the checkup/assessment form.
  // normalizeGeneratedDietPlan defaults missing numbers to 0 — treat 0 as absent.
  const apiBmi = plan?.summary?.bmi;
  const profileBmi = getBmi(form.height, form.weight);
  const bmi = typeof apiBmi === 'number' && apiBmi > 0 ? apiBmi : profileBmi;
  const hasBmi = typeof bmi === 'number' && bmi > 0;
  const bmiCategory = plan?.summary?.bmiCategory?.trim() || getBmiCategory(bmi)?.label || '';
  const dailyCalTarget = plan?.summary?.dailyCalTarget;
  const hasDailyCal = typeof dailyCalTarget === 'number' && dailyCalTarget > 0;
  const showSummary = hasBmi || hasDailyCal;
  const summaryBoth = hasBmi && hasDailyCal;

  return (
    <View>
      <View style={styles.optionalBanner}>
        <Ionicons name="sparkles-outline" size={18} color={Colors.secondary} />
        <View style={styles.optionalCopy}>
          <Text style={styles.optionalTitle}>Optional step</Text>
          <Text style={styles.intro}>
            Generate an AI-suggested weekly plan from this client&apos;s profile and current meals.
            You can leave without generating. Save Plan appears only after you generate or
            regenerate.
          </Text>
        </View>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={18} color={Colors.primary} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {!plan ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="restaurant-outline" size={28} color={Colors.secondary} />
          </View>
          <Text style={styles.emptyTitle}>No plan yet</Text>
          <Text style={styles.emptyMessage}>
            Generate a meal plan based on this client&apos;s goals, preferences, and activity.
          </Text>
          <TouchableOpacity
            style={styles.generateBtn}
            onPress={generate}
            disabled={generating}
            activeOpacity={0.75}
          >
            {generating ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Ionicons name="sparkles" size={18} color={Colors.white} />
                <Text style={styles.generateText}>Generate Plan</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      {plan ? (
        <>
          {showSummary ? (
            <View
              style={[
                styles.summaryCard,
                summaryBoth ? styles.summaryCardBoth : styles.summaryCardSingle,
              ]}
            >
              {hasBmi ? (
                <View>
                  <Text style={styles.summaryCaption}>BMI</Text>
                  <Text style={styles.summaryBmi}>{bmi!.toFixed(1)}</Text>
                  {bmiCategory ? <Text style={styles.summaryLabel}>{bmiCategory}</Text> : null}
                </View>
              ) : null}
              {hasDailyCal ? (
                <View style={styles.summaryTarget}>
                  <Ionicons name="flame" size={16} color={Colors.accent} />
                  <Text style={styles.summaryTargetText}>{dailyCalTarget} kcal / day</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {(plan.weeklyPlan || []).map((meal, i) => (
            <View key={i} style={styles.mealCard}>
              <View style={styles.mealHeader}>
                <Text style={styles.mealType}>{meal.mealType}</Text>
                <Text style={styles.mealTime}>{meal.mealTime}</Text>
              </View>
              {(meal.options || []).map((opt, j) => (
                <Text key={j} style={styles.mealOption}>
                  {j + 1}. {opt}
                </Text>
              ))}
              <Text style={styles.mealCal}>
                {meal.calMin}-{meal.calMax} kcal
              </Text>
              {meal.tip ? (
                <View style={styles.mealTipRow}>
                  <Ionicons name="bulb-outline" size={14} color={Colors.accent} />
                  <Text style={styles.mealTip}>{meal.tip}</Text>
                </View>
              ) : null}
            </View>
          ))}

          {REC_ITEMS.some(item => plan.recommendations?.[item.key]) ? (
            <View style={styles.recsCard}>
              <Text style={styles.recsTitle}>Key Recommendations</Text>
              {REC_ITEMS.map(item => {
                const value = plan.recommendations?.[item.key];
                if (!value) return null;
                return (
                  <View key={item.key} style={styles.recRow}>
                    <View style={styles.recIconWrap}>
                      <Ionicons name={item.icon} size={14} color={Colors.secondary} />
                    </View>
                    <View style={styles.recCopy}>
                      <Text style={styles.recLabel}>{item.label}</Text>
                      <Text style={styles.recItem}>{value}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.regenerateBtn}
            onPress={generate}
            disabled={generating}
            activeOpacity={0.75}
          >
            {generating ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <>
                <Ionicons name="refresh" size={16} color={Colors.primary} />
                <Text style={styles.regenerateText}>Regenerate</Text>
              </>
            )}
          </TouchableOpacity>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  optionalBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: 16,
  },
  optionalCopy: { flex: 1 },
  optionalTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.secondary,
    marginBottom: 4,
  },
  intro: { fontSize: 13, color: Colors.textLight, lineHeight: 19 },
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
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 24,
    alignItems: 'center',
    ...Shadow.sm,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: Colors.textDark },
  emptyMessage: {
    fontSize: 13,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 18,
  },
  generateBtn: {
    alignSelf: 'stretch',
    backgroundColor: Colors.secondary,
    borderRadius: Radius.pill,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Shadow.md,
  },
  generateText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  summaryCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.secondary,
    borderRadius: Radius.md,
    padding: 16,
    marginBottom: 14,
  },
  summaryCardBoth: { justifyContent: 'space-between' },
  summaryCardSingle: { justifyContent: 'center' },
  summaryCaption: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
  },
  summaryBmi: { fontSize: 28, fontWeight: '800', color: Colors.white, marginTop: 2 },
  summaryLabel: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  summaryTarget: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  summaryTargetText: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  mealCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: 10,
    ...Shadow.sm,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  mealType: { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  mealTime: { fontSize: 12, color: Colors.textLight },
  mealOption: { fontSize: 13, color: Colors.textDark, marginBottom: 3 },
  mealCal: { fontSize: 12, color: Colors.secondary, fontWeight: '700', marginTop: 4 },
  mealTipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
  },
  mealTip: { flex: 1, fontSize: 12, color: Colors.textLight, fontStyle: 'italic', lineHeight: 17 },
  recsCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: 14,
    ...Shadow.sm,
  },
  recsTitle: { fontSize: 14, fontWeight: '700', color: Colors.textDark, marginBottom: 10 },
  recRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  recIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recCopy: { flex: 1 },
  recLabel: { fontSize: 11, fontWeight: '700', color: Colors.secondary, marginBottom: 2 },
  recItem: { fontSize: 13, color: Colors.textLight, lineHeight: 18 },
  regenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
    paddingVertical: 12,
    minHeight: 48,
  },
  regenerateText: { color: Colors.primary, fontSize: 14, fontWeight: '700' },
});
