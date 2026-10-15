import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Shadow, Spacing } from '../../../constants/theme';
import DropdownField from '../../../components/DropdownField';
import { useNormalizeLifestyleParamFormValues } from '../../../hooks/useNormalizeParamFormValues';
import type { ClientProfile } from '../../../types/models';
import type { StepProps } from '../../../types/wizard';

export default function LifestylePreferencesStep({
  form,
  update,
  errorFields = {},
}: StepProps<ClientProfile> & { errorFields?: Record<string, boolean> }) {
  const err = (field: string) => !!errorFields[field];
  const {
    activityOptions,
    workTypeOptions,
    sleepOptions,
    pregnancyOptions,
    foodPrefOptions,
    cuisineOptions,
  } = useNormalizeLifestyleParamFormValues(form, update);

  return (
    <View style={styles.card}>
      <DropdownField
        label="Physical Activity"
        value={form.physicalActivity}
        options={activityOptions}
        onChange={v => update('physicalActivity', v)}
        placeholder="Select"
        required
        hasError={err('physicalActivity')}
        tone="mint"
      />
      <DropdownField
        label="Work Type"
        value={form.workType}
        options={workTypeOptions}
        onChange={v => update('workType', v)}
        placeholder="Select"
        required
        hasError={err('workType')}
        tone="mint"
      />
      <DropdownField
        label="Sleep Duration"
        value={form.sleepDuration}
        options={sleepOptions}
        onChange={v => update('sleepDuration', v)}
        placeholder="Select"
        required
        hasError={err('sleepDuration')}
        tone="mint"
      />
      {form.gender === 'F' && (
        <DropdownField
          label="Pregnancy / BF (optional)"
          value={form.pregnancyBf}
          options={pregnancyOptions}
          onChange={v => update('pregnancyBf', v)}
          placeholder="Select"
          tone="mint"
        />
      )}
      <DropdownField
        label="Food Preference"
        value={form.foodPreference}
        options={foodPrefOptions}
        onChange={v => update('foodPreference', v)}
        placeholder="Select"
        required
        hasError={err('foodPreference')}
        tone="mint"
      />
      <DropdownField
        label="Regional Cuisine"
        value={form.regionalCuisine}
        options={cuisineOptions}
        onChange={v => update('regionalCuisine', v)}
        placeholder="Select"
        required
        hasError={err('regionalCuisine')}
        tone="mint"
      />
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
});
