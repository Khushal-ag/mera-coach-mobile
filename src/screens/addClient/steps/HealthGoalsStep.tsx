import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Colors, Radius } from '../../../constants/theme';
import DropdownField from '../../../components/DropdownField';
import FormFieldLabel from '../../../components/FormFieldLabel';
import MultiSelectField from '../../../components/MultiSelectField';
import { useNormalizeAllParamFormValues } from '../../../hooks/useNormalizeParamFormValues';
import type { ClientProfile } from '../../../types/models';
import type { StepProps } from '../../../types/wizard';

export default function HealthGoalsStep({
  form,
  update,
  onLowerFieldFocus,
}: StepProps<ClientProfile> & { onLowerFieldFocus?: () => void }) {
  const { medicalOptions, allergyOptions, goalOptions, timelineOptions } =
    useNormalizeAllParamFormValues(form, update);

  return (
    <View>
      <MultiSelectField
        label="Medical Conditions"
        value={form.medicalConditions}
        options={medicalOptions}
        onChange={v => update('medicalConditions', v)}
        placeholder="Select conditions"
      />
      <MultiSelectField
        label="Food Allergies"
        value={form.foodAllergies}
        options={allergyOptions}
        onChange={v => update('foodAllergies', v)}
        placeholder="Select allergies"
      />

      <View style={styles.divider} />

      <DropdownField
        label="Primary Goal"
        value={form.primaryGoal}
        options={goalOptions}
        onChange={v => update('primaryGoal', v)}
        placeholder="Select"
      />
      <DropdownField
        label="Target Timeline"
        value={form.targetTimeline}
        options={timelineOptions}
        onChange={v => update('targetTimeline', v)}
        placeholder="Select"
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
  field: { marginBottom: 16 },
  divider: { height: 1, backgroundColor: Colors.border, marginBottom: 16, marginTop: 4 },
  textarea: {
    backgroundColor: Colors.white,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 12,
    fontSize: 14,
    color: Colors.textDark,
    height: 90,
    textAlignVertical: 'top',
  },
});
