import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Colors, FontFamily, Shadow, Spacing } from '../../../constants/theme';
import DropdownField from '../../../components/DropdownField';
import FormFieldLabel from '../../../components/FormFieldLabel';
import MultiSelectField from '../../../components/MultiSelectField';
import { resolveNoneOfTheAboveCode } from '../../../data/lifestyleOptions';
import { useNormalizeHealthGoalParamFormValues } from '../../../hooks/useNormalizeParamFormValues';
import type { ClientProfile } from '../../../types/models';
import type { StepProps } from '../../../types/wizard';

const FIELD_MINT = '#E7F6EC';

export default function HealthGoalsStep({
  form,
  update,
  onLowerFieldFocus,
  errorFields = {},
}: StepProps<ClientProfile> & {
  onLowerFieldFocus?: () => void;
  errorFields?: Record<string, boolean>;
}) {
  const err = (field: string) => !!errorFields[field];
  const { medicalOptions, allergyOptions, goalOptions, timelineOptions } =
    useNormalizeHealthGoalParamFormValues(form, update);
  const medicalNoneCode = resolveNoneOfTheAboveCode(medicalOptions);
  const allergyNoneCode = resolveNoneOfTheAboveCode(allergyOptions);

  return (
    <View style={styles.card}>
      <MultiSelectField
        label="Medical Conditions"
        value={form.medicalConditions}
        options={medicalOptions}
        onChange={v => update('medicalConditions', v)}
        placeholder="Select conditions"
        required
        hasError={err('medicalConditions')}
        exclusiveNoneCode={medicalNoneCode}
        tone="mint"
      />
      <MultiSelectField
        label="Food Allergies"
        value={form.foodAllergies}
        options={allergyOptions}
        onChange={v => update('foodAllergies', v)}
        placeholder="Select allergies"
        required
        hasError={err('foodAllergies')}
        exclusiveNoneCode={allergyNoneCode}
        tone="mint"
      />
      <DropdownField
        label="Primary Goal"
        value={form.primaryGoal}
        options={goalOptions}
        onChange={v => update('primaryGoal', v)}
        placeholder="Select"
        required
        hasError={err('primaryGoal')}
        tone="mint"
      />
      <DropdownField
        label="Target Timeline"
        value={form.targetTimeline}
        options={timelineOptions}
        onChange={v => update('targetTimeline', v)}
        placeholder="Select"
        hasError={err('targetTimeline')}
        tone="mint"
      />

      <View style={styles.field}>
        <FormFieldLabel>Additional Notes</FormFieldLabel>
        <TextInput
          style={styles.textarea}
          placeholder="Any specific preferences, dislikes, meal timing constraints, etc."
          placeholderTextColor={Colors.textLight}
          multiline
          numberOfLines={4}
          value={form.notes}
          onChangeText={v => update('notes', v)}
          onFocus={onLowerFieldFocus}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
    ...Shadow.sm,
  },
  field: { marginBottom: Spacing.md },
  textarea: {
    minHeight: 96,
    borderRadius: 12,
    backgroundColor: FIELD_MINT,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.regular,
    color: Colors.accentInk,
    textAlignVertical: 'top',
  },
});
