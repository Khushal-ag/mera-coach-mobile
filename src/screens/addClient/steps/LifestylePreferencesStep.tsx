import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../../../constants/theme';
import DropdownField from '../../../components/DropdownField';
import {
  PHYSICAL_ACTIVITY_LEVELS,
  WORK_TYPES,
  SLEEP_DURATIONS,
  PREGNANCY_BF_OPTIONS,
  FOOD_PREFERENCES,
  REGIONAL_CUISINES,
} from '../../../data/lifestyleOptions';
import type { ClientProfile } from '../../../types/models';
import type { StepProps } from '../../../types/wizard';

export default function LifestylePreferencesStep({ form, update }: StepProps<ClientProfile>) {
  return (
    <View>
      <DropdownField
        label="Physical Activity"
        value={form.physicalActivity}
        options={PHYSICAL_ACTIVITY_LEVELS}
        onChange={v => update('physicalActivity', v)}
        placeholder="Select"
      />
      <DropdownField
        label="Work Type"
        value={form.workType}
        options={WORK_TYPES}
        onChange={v => update('workType', v)}
        placeholder="Select"
      />

      <View style={styles.divider} />

      <DropdownField
        label="Sleep Duration"
        value={form.sleepDuration}
        options={SLEEP_DURATIONS}
        onChange={v => update('sleepDuration', v)}
        placeholder="Select"
      />
      {form.gender === 'Female' && (
        <DropdownField
          label="Pregnancy / BF"
          value={form.pregnancyBf}
          options={PREGNANCY_BF_OPTIONS}
          onChange={v => update('pregnancyBf', v)}
          placeholder="Select"
        />
      )}

      <View style={styles.divider} />

      <DropdownField
        label="Food Preference"
        value={form.foodPreference}
        options={FOOD_PREFERENCES}
        onChange={v => update('foodPreference', v)}
        placeholder="Select"
      />
      <DropdownField
        label="Regional Cuisine"
        value={form.regionalCuisine}
        options={REGIONAL_CUISINES}
        onChange={v => update('regionalCuisine', v)}
        placeholder="Select"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  divider: { height: 1, backgroundColor: Colors.border, marginBottom: 16, marginTop: 4 },
});
