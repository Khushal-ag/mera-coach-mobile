import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, Modal } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '../../../constants/theme';
import PhoneTextInput from '../../../components/PhoneTextInput';
import { ageFromDate, formatDob, parseDob, sanitizeEmailInput } from '../../../utils/validation';
import type { ClientProfile } from '../../../types/models';
import type { IoniconName, StepProps, UpdateFn } from '../../../types/wizard';

interface FieldProps {
  label: string;
  icon: IoniconName;
  field: keyof ClientProfile;
  placeholder: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  inputMode?: 'phone' | 'email';
  form: ClientProfile;
  update: UpdateFn<ClientProfile>;
}

// Stored as 'M'/'F' — the backend's gender field (save-client-detail, generate-diet-plan) and
// this app's own BMI formulas (utils/bmi.ts) both expect these codes, not the display words.
const GENDER_OPTIONS = [
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
];

function Field({
  label,
  icon,
  field,
  placeholder,
  keyboardType,
  inputMode,
  form,
  update,
}: FieldProps) {
  const handleChange = (v: string) => {
    if (inputMode === 'email') {
      const current = String(form[field] ?? '');
      const next = sanitizeEmailInput(v);
      if (next === current) return;
      update(field, next as ClientProfile[typeof field]);
    } else {
      update(field, v as ClientProfile[typeof field]);
    }
  };

  const inputProps = {
    style: styles.input,
    placeholder,
    placeholderTextColor: Colors.textLight,
    keyboardType: keyboardType || 'default',
    value: String(form[field] ?? ''),
    onChangeText: handleChange,
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <Ionicons name={icon} size={17} color={Colors.textLight} style={styles.icon} />
        {inputMode === 'phone' ? (
          <PhoneTextInput
            {...inputProps}
            value={String(form[field] ?? '')}
            onChangeText={next => update(field, next as ClientProfile[typeof field])}
          />
        ) : (
          <TextInput
            {...inputProps}
            autoCapitalize={inputMode === 'email' ? 'none' : 'sentences'}
            autoCorrect={inputMode === 'email' ? false : undefined}
          />
        )}
      </View>
    </View>
  );
}

function DobField({ form, update }: StepProps<ClientProfile>) {
  const [open, setOpen] = useState(false);
  const parsed = parseDob(form.dob);
  const pickerValue = parsed ?? new Date(2000, 0, 1);

  const applyDob = (date: Date) => {
    update('dob', formatDob(date));
    const age = ageFromDate(date);
    if (age >= 5 && age <= 100) update('age', String(age));
  };

  const onChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setOpen(false);
    if (event.type === 'dismissed' || !date) return;
    applyDob(date);
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>Date of Birth</Text>
      <View style={styles.inputWrap}>
        <TouchableOpacity
          style={styles.dobPressable}
          onPress={() => setOpen(true)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="calendar-outline"
            size={17}
            color={Colors.textLight}
            style={styles.icon}
          />
          <Text style={[styles.input, !form.dob && styles.placeholder]}>
            {form.dob || 'DD/MM/YYYY'}
          </Text>
        </TouchableOpacity>
        {form.dob ? (
          <TouchableOpacity
            onPress={() => update('dob', '')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={18} color={Colors.textLight} />
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={styles.hint}>Optional if Age is filled — picking DOB auto-fills Age</Text>

      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          value={pickerValue}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={onChange}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={open} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setOpen(false)}>
                  <Text style={styles.modalDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pickerValue}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={onChange}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

export default function BasicProfileStep({ form, update }: StepProps<ClientProfile>) {
  return (
    <View>
      <Field
        label="Full Name"
        icon="person-outline"
        field="name"
        placeholder="Client's full name"
        form={form}
        update={update}
      />
      <Field
        label="Mobile Number"
        icon="call-outline"
        field="phone"
        placeholder="10-digit mobile number"
        keyboardType="phone-pad"
        inputMode="phone"
        form={form}
        update={update}
      />
      <Field
        label="Email (optional)"
        icon="mail-outline"
        field="email"
        placeholder="client@email.com"
        keyboardType="email-address"
        inputMode="email"
        form={form}
        update={update}
      />
      <Field
        label="Alternate Mobile (optional)"
        icon="call-outline"
        field="alternateMobile"
        placeholder="10-digit mobile number"
        keyboardType="phone-pad"
        inputMode="phone"
        form={form}
        update={update}
      />
      <Field
        label="Location"
        icon="location-outline"
        field="location"
        placeholder="City / Area"
        form={form}
        update={update}
      />

      <DobField form={form} update={update} />

      <View style={styles.row}>
        <View style={styles.half}>
          <Field
            label="Age"
            icon="calendar-outline"
            field="age"
            placeholder="Years"
            keyboardType="numeric"
            form={form}
            update={update}
          />
        </View>
        <View style={styles.half}>
          <Text style={styles.label}>Gender</Text>
          <View style={styles.pickerRow}>
            {GENDER_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.pill, form.gender === opt.value && styles.pillActive]}
                onPress={() => update('gender', opt.value)}
              >
                <Text style={[styles.pillText, form.gender === opt.value && styles.pillActiveText]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <View style={styles.half}>
          <Field
            label="Height (cm)"
            icon="resize-outline"
            field="height"
            placeholder="e.g. 165"
            keyboardType="numeric"
            form={form}
            update={update}
          />
        </View>
        <View style={styles.half}>
          <Field
            label="Weight (kg)"
            icon="scale-outline"
            field="weight"
            placeholder="e.g. 70"
            keyboardType="numeric"
            form={form}
            update={update}
          />
        </View>
      </View>

      {form.height && form.weight ? (
        <View style={styles.bmiCard}>
          <Text style={styles.bmiLabel}>Calculated BMI</Text>
          <Text style={styles.bmiValue}>
            {(Number(form.weight) / (Number(form.height) / 100) ** 2).toFixed(1)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textDark, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 50,
  },
  dobPressable: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14, color: Colors.textDark, paddingVertical: 0 },
  placeholder: { color: Colors.textLight },
  hint: { fontSize: 11, color: Colors.textLight, marginTop: 6 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  pillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pillText: { fontSize: 13, color: Colors.textLight, fontWeight: '600' },
  pillActiveText: { color: Colors.white },
  divider: { height: 1, backgroundColor: Colors.border, marginBottom: 16, marginTop: 4 },
  bmiCard: {
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.md,
    padding: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  bmiLabel: { fontSize: 12, color: Colors.secondary },
  bmiValue: { fontSize: 32, fontWeight: '800', color: Colors.secondary },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingBottom: 24,
  },
  modalHeader: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalDone: { fontSize: 16, fontWeight: '700', color: Colors.primary },
});
