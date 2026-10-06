import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, IconSize, PressOpacity, Spacing } from '../../constants/theme';
import FormFieldLabel from '../FormFieldLabel';
import { CalendarDatePicker, formatCalendarLabel } from './CalendarDatePicker';
import { ageFromDate, formatDob, parseDob } from '../../utils/validation';
import type { ClientProfile } from '../../types/models';
import type { StepProps } from '../../types/wizard';

const MIN_DOB = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 100);
  d.setHours(0, 0, 0, 0);
  return d;
})();
const MAX_DOB = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
})();
const DEFAULT_DOB = new Date(2000, 0, 1);

export function DobWheelField({
  form,
  update,
  hasError,
}: StepProps<ClientProfile> & { hasError?: boolean }) {
  const [open, setOpen] = useState(false);
  const parsed = parseDob(form.dob);
  const dobLabel = parsed ? formatCalendarLabel(parsed) : '';

  const applyDob = (date: Date) => {
    update('dob', formatDob(date));
    const age = ageFromDate(date);
    if (age >= 5 && age <= 100) update('age', String(age));
  };

  return (
    <View style={styles.field}>
      <FormFieldLabel required>Date of Birth</FormFieldLabel>
      <View style={[styles.inputWrap, hasError && styles.inputWrapError]}>
        <TouchableOpacity
          style={styles.dobPressable}
          onPress={() => setOpen(true)}
          activeOpacity={PressOpacity.strong}
          accessibilityRole="button"
          accessibilityLabel={dobLabel ? `Date of Birth: ${dobLabel}` : 'Select date of birth'}
        >
          <Ionicons
            name="calendar-outline"
            size={IconSize.md}
            color={Colors.accentInk}
            style={styles.icon}
          />
          <Text style={[styles.input, !dobLabel && styles.placeholder]}>
            {dobLabel || 'Select date'}
          </Text>
        </TouchableOpacity>
        {form.dob ? (
          <TouchableOpacity
            onPress={() => update('dob', '')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Clear date of birth"
          >
            <Ionicons name="close-circle-outline" size={IconSize.md} color={Colors.accentInk} />
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={styles.hint}>One of DOB or Age is required. Picking DOB auto-fills Age.</Text>
      <CalendarDatePicker
        visible={open}
        title="Date of Birth"
        value={parsed ?? DEFAULT_DOB}
        minimumDate={MIN_DOB}
        maximumDate={MAX_DOB}
        onConfirm={date => {
          applyDob(date);
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: Spacing.md },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#E7F6EC',
    paddingHorizontal: Spacing.sm,
  },
  inputWrapError: {
    borderWidth: 1.5,
    borderColor: Colors.destructive,
  },
  dobPressable: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: Spacing.xs },
  input: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.accentInk,
    paddingVertical: 0,
  },
  placeholder: { color: Colors.textLight },
  hint: { fontSize: 11, fontFamily: FontFamily.regular, color: Colors.textLight, marginTop: 6 },
});
