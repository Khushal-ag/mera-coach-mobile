import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../../../constants/theme';
import DropdownField from '../../../components/DropdownField';
import { useParamOptions } from '../../../hooks/useParamOptions';
import {
  PARAM_CODES,
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
  const activityOptions = useParamOptions(PARAM_CODES.physicalActivity, PHYSICAL_ACTIVITY_LEVELS);
  const workTypeOptions = useParamOptions(PARAM_CODES.workType, WORK_TYPES);
  const sleepOptions = useParamOptions(PARAM_CODES.sleepDuration, SLEEP_DURATIONS);
  const pregnancyOptions = useParamOptions(PARAM_CODES.pregnancy, PREGNANCY_BF_OPTIONS);
  const foodPrefOptions = useParamOptions(PARAM_CODES.foodPreference, FOOD_PREFERENCES);
  const cuisineOptions = useParamOptions(PARAM_CODES.regionalCuisine, REGIONAL_CUISINES);

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
