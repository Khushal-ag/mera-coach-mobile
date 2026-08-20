import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Colors, Radius } from '../../../constants/theme';
import DropdownField from '../../../components/DropdownField';
import MultiSelectField from '../../../components/MultiSelectField';
import { useParamOptions } from '../../../hooks/useParamOptions';
import {
  PARAM_CODES,
  MEDICAL_CONDITIONS,
  FOOD_ALLERGIES,
  PRIMARY_GOALS,
  TARGET_TIMELINES,
} from '../../../data/lifestyleOptions';
import type { ClientProfile } from '../../../types/models';
import type { StepProps } from '../../../types/wizard';

export default function HealthGoalsStep({ form, update }: StepProps<ClientProfile>) {
  const medicalOptions = useParamOptions(PARAM_CODES.medicalConditions, MEDICAL_CONDITIONS);
  const allergyOptions = useParamOptions(PARAM_CODES.foodAllergies, FOOD_ALLERGIES);
  const goalOptions = useParamOptions(PARAM_CODES.primaryGoal, PRIMARY_GOALS);
  const timelineOptions = useParamOptions(PARAM_CODES.targetTimeline, TARGET_TIMELINES);

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
        <Text style={styles.label}>Additional Notes</Text>
        <TextInput
          style={styles.textarea}
          placeholder="Any specific preferences, dislikes, meal timing constraints, etc."
          placeholderTextColor={Colors.textLight}
          multiline
          numberOfLines={4}
          value={form.notes}
          onChangeText={v => update('notes', v)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textDark, marginBottom: 6 },
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
