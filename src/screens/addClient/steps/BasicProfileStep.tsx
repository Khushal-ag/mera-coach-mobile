import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '../../../constants/theme';
import type { ClientProfile } from '../../../types/models';
import type { IoniconName, StepProps, UpdateFn } from '../../../types/wizard';

interface FieldProps {
  label: string;
  icon: IoniconName;
  field: keyof ClientProfile;
  placeholder: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  form: ClientProfile;
  update: UpdateFn<ClientProfile>;
}

// Stored as 'M'/'F' — the backend's gender field (save-client-detail, generate-diet-plan) and
// this app's own BMI formulas (utils/bmi.ts) both expect these codes, not the display words.
const GENDER_OPTIONS = [
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
];

function Field({ label, icon, field, placeholder, keyboardType, form, update }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <Ionicons name={icon} size={17} color={Colors.textLight} style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.textLight}
          keyboardType={keyboardType || 'default'}
          value={String(form[field] ?? '')}
          onChangeText={v => update(field, v as ClientProfile[typeof field])}
        />
      </View>
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
        label="Phone Number"
        icon="call-outline"
        field="phone"
        placeholder="+91 XXXXX XXXXX"
        keyboardType="phone-pad"
        form={form}
        update={update}
      />
      <Field
        label="Email"
        icon="mail-outline"
        field="email"
        placeholder="client@email.com"
        keyboardType="email-address"
        form={form}
        update={update}
      />

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
  icon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14, color: Colors.textDark },
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
});
