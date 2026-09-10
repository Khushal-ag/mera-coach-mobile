import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, Radius, Spacing } from '../constants/theme';
import FormFieldLabel from './FormFieldLabel';
import type { CoachPackage } from '../types/models';
import { MAX_COACH_PACKAGES, createEmptyPackage } from '../utils/coachPackages';

interface Props {
  packages: CoachPackage[];
  onChange: (next: CoachPackage[]) => void;
}

export default function CoachPackagesEditor({ packages, onChange }: Props) {
  const updateAt = (index: number, patch: Partial<CoachPackage>) => {
    onChange(packages.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  const removeAt = (index: number) => {
    onChange(packages.filter((_, i) => i !== index));
  };

  const addPackage = () => {
    if (packages.length >= MAX_COACH_PACKAGES) return;
    onChange([...packages, createEmptyPackage()]);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Product packages</Text>
      <Text style={styles.hint}>
        Offer 1 to {MAX_COACH_PACKAGES} coaching packages on your public profile. No in-app payment.
        Enquiries come via WhatsApp or the form.
      </Text>

      {packages.map((pkg, index) => (
        <View key={pkg.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Package {index + 1}</Text>
            <TouchableOpacity
              onPress={() => removeAt(index)}
              accessibilityRole="button"
              accessibilityLabel={`Remove package ${index + 1}`}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={18} color={Colors.destructive} />
            </TouchableOpacity>
          </View>
          <Field
            label="Name"
            required
            value={pkg.name}
            onChangeText={v => updateAt(index, { name: v })}
            placeholder="e.g. 12-week transformation"
          />
          <View style={styles.row}>
            <View style={styles.half}>
              <Field
                label="Price (optional)"
                value={pkg.price}
                onChangeText={v => updateAt(index, { price: v })}
                placeholder="e.g. ₹4,999"
              />
            </View>
            <View style={styles.half}>
              <Field
                label="Duration / sessions"
                value={pkg.duration}
                onChangeText={v => updateAt(index, { duration: v })}
                placeholder="e.g. 12 sessions"
              />
            </View>
          </View>
          <Field
            label="Short description"
            value={pkg.description}
            onChangeText={v => updateAt(index, { description: v })}
            placeholder="What the client gets"
            multiline
          />
        </View>
      ))}

      {packages.length < MAX_COACH_PACKAGES ? (
        <TouchableOpacity style={styles.addBtn} onPress={addPackage}>
          <Ionicons name="add-circle-outline" size={18} color={Colors.secondary} />
          <Text style={styles.addBtnText}>Add package</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  required,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <FormFieldLabel required={required}>{label}</FormFieldLabel>
      <TextInput
        style={[styles.input, multiline && styles.textarea]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textLight}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: Spacing.md },
  sectionTitle: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    color: Colors.textDark,
    marginBottom: 8,
  },
  hint: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    lineHeight: 16,
    marginBottom: Spacing.md,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  cardTitle: { fontSize: 13, fontFamily: FontFamily.bold, color: Colors.secondary },
  field: { marginBottom: 12 },
  input: {
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.textDark,
  },
  textarea: { height: 72, paddingVertical: 10 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  addBtnText: { fontSize: 13, fontFamily: FontFamily.bold, color: Colors.secondary },
});
