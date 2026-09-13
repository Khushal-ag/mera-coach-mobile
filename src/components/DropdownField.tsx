import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontFamily,
  FormControl,
  Radius,
  Shadow,
  Spacing,
  formFieldStyles,
} from '../constants/theme';
import FormFieldLabel from './FormFieldLabel';
import type { MasterOption } from '../api/masterApi';

type DropdownOption = string | MasterOption;

function normalizeOptions(options: DropdownOption[]): MasterOption[] {
  return options.map(opt =>
    typeof opt === 'string' ? { code: opt, label: opt } : { code: opt.code, label: opt.label },
  );
}

interface DropdownFieldProps {
  label?: string;
  /** Stored value — typically itemCode for PARAMLIST fields, or the option string itself. */
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  hasError?: boolean;
  /** Inline toolbar style — hides label and shrinks the trigger. */
  compact?: boolean;
}

export default function DropdownField({
  label,
  value,
  options,
  onChange,
  placeholder,
  required,
  hasError,
  compact,
}: DropdownFieldProps) {
  const [open, setOpen] = useState(false);
  const normalized = useMemo(() => normalizeOptions(options), [options]);
  const selected = normalized.find(o => o.code === value || o.label === value);
  // Avoid flashing raw item codes (e.g. PC001) before labels arrive.
  const display = selected?.label ?? '';

  return (
    <View style={[styles.field, compact && styles.fieldCompact]}>
      {label ? <FormFieldLabel required={required}>{label}</FormFieldLabel> : null}
      <TouchableOpacity
        style={[styles.box, compact && styles.boxCompact, hasError && styles.boxError]}
        onPress={() => setOpen(true)}
      >
        <Text
          style={[display ? styles.value : styles.placeholder, compact && styles.valueCompact]}
          numberOfLines={1}
        >
          {display || placeholder || 'Select'}
        </Text>
        <Ionicons name="chevron-down" size={compact ? 14 : 16} color={Colors.textLight} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            {label ? <Text style={styles.sheetTitle}>{label}</Text> : null}
            <ScrollView style={styles.optionList} showsVerticalScrollIndicator={false}>
              {normalized.map(opt => {
                const active = opt.code === value || opt.label === value;
                return (
                  <TouchableOpacity
                    key={opt.code}
                    style={styles.option}
                    onPress={() => {
                      onChange(opt.code);
                      setOpen(false);
                    }}
                  >
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>
                      {opt.label}
                    </Text>
                    {active && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: Spacing.md },
  fieldCompact: { marginBottom: 0, flexShrink: 1, maxWidth: '52%' },
  box: {
    ...formFieldStyles.wrap,
    ...formFieldStyles.wrapSurface,
    justifyContent: 'space-between',
  },
  boxCompact: {
    height: FormControl.compactHeight,
    paddingHorizontal: Spacing.sm - 2,
    borderWidth: 1,
  },
  boxError: formFieldStyles.wrapError,
  value: { fontSize: 14, fontFamily: FontFamily.regular, color: Colors.textDark, flex: 1 },
  valueCompact: { fontSize: 12, flex: 1 },
  placeholder: { fontSize: 14, fontFamily: FontFamily.regular, color: Colors.textLight, flex: 1 },
  backdrop: { flex: 1, backgroundColor: Colors.scrim, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.lg,
    maxHeight: '60%',
    ...Shadow.lg,
  },
  sheetTitle: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    color: Colors.textDark,
    marginBottom: Spacing.sm,
  },
  optionList: { marginBottom: Spacing.xs },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  optionText: {
    flex: 1,
    marginRight: Spacing.sm,
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.textDark,
    textAlign: 'left',
  },
  optionTextActive: { color: Colors.primary, fontFamily: FontFamily.bold },
});
