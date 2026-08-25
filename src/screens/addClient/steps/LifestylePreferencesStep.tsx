import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../../../constants/theme';
import DropdownField from '../../../components/DropdownField';
import { useNormalizeAllParamFormValues } from '../../../hooks/useNormalizeParamFormValues';
import type { ClientProfile } from '../../../types/models';
import type { StepProps } from '../../../types/wizard';

export default function LifestylePreferencesStep({ form, update }: StepProps<ClientProfile>) {
  const {
    activityOptions,
    workTypeOptions,
    sleepOptions,
    pregnancyOptions,
    foodPrefOptions,
    cuisineOptions,
  } = useNormalizeAllParamFormValues(form, update);

  return (
    <View>
      <DropdownField
        label="Physical Activity"
        value={form.physicalActivity}
        options={activityOptions}
        onChange={v => update('physicalActivity', v)}
        placeholder="Select"
      />
      <DropdownField
        label="Work Type"
        value={form.workType}
        options={workTypeOptions}
        onChange={v => update('workType', v)}
        placeholder="Select"
      />

      <View style={styles.divider} />

      <DropdownField
        label="Sleep Duration"
        value={form.sleepDuration}
        options={sleepOptions}
        onChange={v => update('sleepDuration', v)}
        placeholder="Select"
      />
      {form.gender === 'F' && (
        <DropdownField
          label="Pregnancy / BF"
          value={form.pregnancyBf}
          options={pregnancyOptions}
          onChange={v => update('pregnancyBf', v)}
          placeholder="Select"
        />
      )}

      <View style={styles.divider} />

      <DropdownField
        label="Food Preference"
        value={form.foodPreference}
        options={foodPrefOptions}
        onChange={v => update('foodPreference', v)}
        placeholder="Select"
      />
      <DropdownField
        label="Regional Cuisine"
        value={form.regionalCuisine}
        options={cuisineOptions}
        onChange={v => update('regionalCuisine', v)}
        placeholder="Select"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  divider: { height: 1, backgroundColor: Colors.border, marginBottom: 16, marginTop: 4 },
});
