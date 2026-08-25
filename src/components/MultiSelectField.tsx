import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../constants/theme';
import FormFieldLabel from './FormFieldLabel';
import type { MasterOption } from '../api/masterApi';

export type MultiSelectOption = string | MasterOption;

function normalizeOptions(options: MultiSelectOption[]): MasterOption[] {
  return options.map(opt =>
    typeof opt === 'string' ? { code: opt, label: opt } : { code: opt.code, label: opt.label },
  );
}

function isSelected(value: string[], opt: MasterOption): boolean {
  return value.includes(opt.code) || value.includes(opt.label);
}

interface MultiSelectFieldProps {
  label: string;
  /** Stored values — typically itemCodes for PARAMLIST fields. */
  value?: string[];
  options: MultiSelectOption[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

export default function MultiSelectField({
  label,
  value = [],
  options,
  onChange,
  placeholder,
}: MultiSelectFieldProps) {
  const [open, setOpen] = useState(false);
  const normalized = useMemo(() => normalizeOptions(options), [options]);

  const selectedOptions = normalized.filter(opt => isSelected(value, opt));

  const toggle = (opt: MasterOption) => {
    if (isSelected(value, opt)) {
      onChange(value.filter(v => v !== opt.code && v !== opt.label));
    } else {
      onChange([...value.filter(v => v !== opt.label), opt.code]);
    }
  };

  const remove = (opt: MasterOption) => {
    onChange(value.filter(v => v !== opt.code && v !== opt.label));
  };

  return (
    <View style={styles.field}>
      <FormFieldLabel>{label}</FormFieldLabel>
      <TouchableOpacity style={styles.box} onPress={() => setOpen(true)}>
        <Text style={selectedOptions.length ? styles.value : styles.placeholder}>
          {selectedOptions.length ? `${selectedOptions.length} selected` : placeholder || 'Select'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={Colors.textLight} />
      </TouchableOpacity>

      {selectedOptions.length > 0 && (
        <View style={styles.chipsWrap}>
          {selectedOptions.map(opt => (
            <View key={opt.code} style={styles.chip}>
              <Text style={styles.chipText}>{opt.label}</Text>
              <TouchableOpacity onPress={() => remove(opt)}>
                <Ionicons name="close" size={14} color={Colors.secondary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <ScrollView style={styles.optionList} showsVerticalScrollIndicator={false}>
              {normalized.map(opt => {
                const active = isSelected(value, opt);
                return (
                  <TouchableOpacity
                    key={opt.code}
                    style={styles.option}
                    onPress={() => toggle(opt)}
                  >
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>
                      {opt.label}
                    </Text>
                    <View style={[styles.checkbox, active && styles.checkboxActive]}>
                      {active && <Ionicons name="checkmark" size={13} color={Colors.white} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.doneBtn} onPress={() => setOpen(false)}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 16 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 50,
  },
  value: { fontSize: 14, color: Colors.textDark },
  placeholder: { fontSize: 14, color: Colors.textLight },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: Colors.secondary },
  backdrop: { flex: 1, backgroundColor: Colors.scrim, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: 20,
    maxHeight: '65%',
    ...Shadow.lg,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: Colors.textDark, marginBottom: 12 },
  optionList: { marginBottom: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  optionText: { fontSize: 14, color: Colors.textDark },
  optionTextActive: { color: Colors.secondary, fontWeight: '700' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  doneBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  doneText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
});
