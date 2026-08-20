import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../../../constants/theme';
import { generateDietPlan } from '../../../api/masterApi';
import { getCoachProfile } from '../../../api/coachApi';
import { getErrorMessage } from '../../../api/client';
import { queryKeys } from '../../../api/queryKeys';
import { describeDietItems } from '../../../data/mealSlotLabels';
import type { ClientProfile } from '../../../types/models';
import type { StepProps } from '../../../types/wizard';

export default function DietPlanStep({ form, update }: StepProps<ClientProfile>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const coachProfileQuery = useQuery({
    queryKey: queryKeys.coachProfile,
    queryFn: getCoachProfile,
  });

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const em = describeDietItems(form.diet, 'earlyMorning');
      const bf = describeDietItems(form.diet, 'breakfast');
      const mm = describeDietItems(form.diet, 'midMorningSnack');
      const ln = describeDietItems(form.diet, 'lunch');
      const ev = describeDietItems(form.diet, 'eveningSnack');
      const dn = describeDietItems(form.diet, 'dinner');
      const plan = await generateDietPlan({
        clientName: form.name,
        gender: form.gender,
        age: parseInt(form.age, 10) || 0,
        weight: parseFloat(form.weight) || 0,
        height: parseInt(form.height, 10) || 0,
        country: coachProfileQuery.data?.country || 'India',
        foodType: form.foodPreference,
        cuisine: form.regionalCuisine,
        activity: form.physicalActivity,
        workType: form.workType,
        sleep: form.sleepDuration,
        pregnancy: form.pregnancyBf,
        medical: form.medicalConditions.join(', '),
        allergies: form.foodAllergies.join(', '),
        goal: form.primaryGoal,
        timeline: form.targetTimeline,
        notes: form.notes,
        curEM: em.text,
        curEMCal: em.cal,
        curBreakfast: bf.text,
        curBreakfastCal: bf.cal,
        curMidMorning: mm.text,
        curMidMorningCal: mm.cal,
        curLunch: ln.text,
        curLunchCal: ln.cal,
        curEvening: ev.text,
        curEveningCal: ev.cal,
        curDinner: dn.text,
        curDinnerCal: dn.cal,
      });
      update('dietPlan', plan);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to generate a plan. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const plan = form.dietPlan;

  return (
    <View>
      <Text style={styles.intro}>
        Generate an AI-suggested diet plan from the client&apos;s profile and current meals. This
        step is optional — you can finish without it.
      </Text>

      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={18} color={Colors.primary} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {!plan && (
        <TouchableOpacity style={styles.generateBtn} onPress={generate} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Ionicons name="sparkles" size={18} color={Colors.white} />
              <Text style={styles.generateText}>Generate Plan</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {plan && (
        <>
          <View style={styles.summaryCard}>
            <View>
              <Text style={styles.summaryBmi}>{plan.summary.bmi}</Text>
              <Text style={styles.summaryLabel}>{plan.summary.bmiCategory}</Text>
            </View>
            <View style={styles.summaryTarget}>
              <Ionicons name="flame" size={16} color={Colors.accent} />
              <Text style={styles.summaryTargetText}>
                {plan.summary.dailyCalTarget} kcal Daily Target
              </Text>
            </View>
          </View>

          {plan.weeklyPlan.map((meal, i) => (
            <View key={i} style={styles.mealCard}>
              <View style={styles.mealHeader}>
                <Text style={styles.mealType}>{meal.mealType}</Text>
                <Text style={styles.mealTime}>{meal.mealTime}</Text>
              </View>
              {meal.options.map((opt, j) => (
                <Text key={j} style={styles.mealOption}>
                  {j + 1}. {opt}
                </Text>
              ))}
              <Text style={styles.mealCal}>
                {meal.calMin ?? meal.caloriesMin ?? 0}–{meal.calMax ?? meal.caloriesMax ?? 0} kcal
              </Text>
              {meal.tip ? <Text style={styles.mealTip}>💡 {meal.tip}</Text> : null}
            </View>
          ))}

          <View style={styles.recsCard}>
            <Text style={styles.recsTitle}>Key Recommendations</Text>
            {plan.recommendations.waterIntake ? (
              <Text style={styles.recItem}>💧 {plan.recommendations.waterIntake}</Text>
            ) : null}
            {plan.recommendations.foodsToAvoid ? (
              <Text style={styles.recItem}>🚫 {plan.recommendations.foodsToAvoid}</Text>
            ) : null}
            {plan.recommendations.supplements ? (
              <Text style={styles.recItem}>💊 {plan.recommendations.supplements}</Text>
            ) : null}
            {plan.recommendations.healthTips ? (
              <Text style={styles.recItem}>❤️ {plan.recommendations.healthTips}</Text>
            ) : null}
          </View>

          <TouchableOpacity style={styles.regenerateBtn} onPress={generate} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <>
                <Ionicons name="refresh" size={16} color={Colors.primary} />
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
  intro: { fontSize: 13, color: Colors.textLight, marginBottom: 16, lineHeight: 19 },
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
  generateBtn: {
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
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    borderRadius: Radius.md,
    padding: 16,
    marginBottom: 14,
  },
  summaryBmi: { fontSize: 28, fontWeight: '800', color: Colors.white },
  summaryLabel: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  summaryTarget: { flexDirection: 'row', alignItems: 'center', gap: 6 },
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
  mealTip: { fontSize: 12, color: Colors.textLight, marginTop: 6, fontStyle: 'italic' },
  recsCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: 14,
    ...Shadow.sm,
  },
  recsTitle: { fontSize: 14, fontWeight: '700', color: Colors.textDark, marginBottom: 8 },
  recItem: { fontSize: 13, color: Colors.textLight, marginBottom: 6, lineHeight: 18 },
  regenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingVertical: 12,
  },
  regenerateText: { color: Colors.primary, fontSize: 14, fontWeight: '700' },
});
