import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Colors,
  FontFamily,
  Radius,
  Shadow,
  Spacing,
  formFieldStyles,
  ChipControl,
  buttonStyles,
  headingFont,
} from '../constants/theme';
import { isNoneOfTheAboveValue } from '../data/lifestyleOptions';
import FormFieldLabel from './FormFieldLabel';
import type { MasterOption } from '../api/masterApi';

type MultiSelectOption = string | MasterOption;

function normalizeOptions(options: MultiSelectOption[]): MasterOption[] {
  return options.map(opt =>
    typeof opt === 'string' ? { code: opt, label: opt } : { code: opt.code, label: opt.label },
  );
}

/** Keep exclusive "none" sentinel last so it stays at the bottom of the sheet. */
function pinExclusiveNoneLast(options: MasterOption[], exclusiveNoneCode?: string): MasterOption[] {
  if (!exclusiveNoneCode) return options;
  if (options[options.length - 1]?.code === exclusiveNoneCode) return options;
  const none = options.find(o => o.code === exclusiveNoneCode);
  if (!none) return options;
  return [...options.filter(o => o.code !== exclusiveNoneCode), none];
}

function isSelected(value: string[], opt: MasterOption, exclusiveNoneCode?: string): boolean {
  if (value.includes(opt.code) || value.includes(opt.label)) return true;
  // Legacy "None of the below" (and synthetic code) should light up the exclusive-none row.
  return !!exclusiveNoneCode && opt.code === exclusiveNoneCode && value.some(isNoneOfTheAboveValue);
}

interface MultiSelectFieldProps {
  label: string;
  /** Stored values — typically itemCodes for PARAMLIST fields. */
  value?: string[];
  options: MultiSelectOption[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  required?: boolean;
  hasError?: boolean;
  labelStyle?: StyleProp<TextStyle>;
  /**
   * When set, selecting this option clears all others; selecting any other option
   * clears this one (e.g. "None of the above"). Always rendered last in the list.
   */
  exclusiveNoneCode?: string;
}

export default function MultiSelectField({
  label,
  value = [],
  options,
  onChange,
  placeholder,
  required,
  hasError,
  labelStyle,
  exclusiveNoneCode,
}: MultiSelectFieldProps) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const normalized = useMemo(
    () => pinExclusiveNoneLast(normalizeOptions(options), exclusiveNoneCode),
    [options, exclusiveNoneCode],
  );

  const selectedOptions = normalized.filter(opt => isSelected(value, opt, exclusiveNoneCode));

  const exclusiveNone = exclusiveNoneCode
    ? normalized.find(o => o.code === exclusiveNoneCode)
    : undefined;

  const withoutExclusiveNone = (vals: string[]) => {
    if (!exclusiveNoneCode) return vals;
    return vals.filter(
      v => v !== exclusiveNoneCode && v !== exclusiveNone?.label && !isNoneOfTheAboveValue(v),
    );
  };

  const toggle = (opt: MasterOption) => {
    if (isSelected(value, opt, exclusiveNoneCode)) {
      if (exclusiveNoneCode && opt.code === exclusiveNoneCode) {
        onChange(withoutExclusiveNone(value));
        return;
      }
      onChange(value.filter(v => v !== opt.code && v !== opt.label));
      return;
    }
    if (exclusiveNoneCode && opt.code === exclusiveNoneCode) {
      onChange([opt.code]);
      return;
    }
    onChange([...withoutExclusiveNone(value).filter(v => v !== opt.label), opt.code]);
  };

  const remove = (opt: MasterOption) => {
    if (exclusiveNoneCode && opt.code === exclusiveNoneCode) {
      onChange(withoutExclusiveNone(value));
      return;
    }
    onChange(value.filter(v => v !== opt.code && v !== opt.label));
  };

  return (
    <View style={styles.field}>
      <FormFieldLabel required={required} style={labelStyle}>
        {label}
      </FormFieldLabel>
      <TouchableOpacity
        style={[styles.box, hasError && styles.boxError]}
        onPress={() => setOpen(true)}
      >
        <Text
          style={[selectedOptions.length ? styles.value : styles.placeholder, styles.triggerText]}
          numberOfLines={1}
        >
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
          <View
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>{label}</Text>
            <ScrollView
              style={styles.optionList}
              contentContainerStyle={styles.optionListContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {normalized.map((opt, index) => {
                const active = isSelected(value, opt, exclusiveNoneCode);
                const isExclusiveNone = !!exclusiveNoneCode && opt.code === exclusiveNoneCode;
                const isLast = index === normalized.length - 1;
                return (
                  <TouchableOpacity
                    key={opt.code}
                    style={[
                      styles.option,
                      isExclusiveNone && styles.optionExclusive,
                      isLast && styles.optionLast,
                    ]}
                    onPress={() => toggle(opt)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        active && styles.optionTextActive,
                        isExclusiveNone && styles.optionTextExclusive,
                      ]}
                    >
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
  field: { marginBottom: Spacing.md },
  box: {
    ...formFieldStyles.wrap,
    ...formFieldStyles.wrapSurface,
    justifyContent: 'space-between',
  },
  boxError: formFieldStyles.wrapError,
  triggerText: { flex: 1, marginRight: Spacing.xs, textAlign: 'left' },
  value: { fontSize: 14, fontFamily: FontFamily.regular, color: Colors.textDark },
  placeholder: { fontSize: 14, fontFamily: FontFamily.regular, color: Colors.textLight },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.sm - 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.secondaryLight,
    borderRadius: ChipControl.radius,
    paddingHorizontal: ChipControl.paddingHorizontal,
    paddingVertical: ChipControl.paddingVertical,
    minHeight: ChipControl.minHeight,
  },
  chipText: { fontSize: 12, fontFamily: FontFamily.semibold, color: Colors.secondary },
  backdrop: { flex: 1, backgroundColor: Colors.scrim, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    maxHeight: '70%',
    ...Shadow.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  sheetTitle: {
    fontSize: 16,
    fontFamily: headingFont.bold,
    color: Colors.textDark,
    marginBottom: Spacing.sm,
  },
  optionList: { maxHeight: 320, marginBottom: Spacing.xs },
  optionListContent: { paddingBottom: 4 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  optionExclusive: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 16,
  },
  optionLast: { borderBottomWidth: 0 },
  optionText: {
    flex: 1,
    marginRight: 12,
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.textDark,
    textAlign: 'left',
  },
  optionTextActive: { color: Colors.secondary, fontFamily: FontFamily.bold },
  optionTextExclusive: { fontFamily: FontFamily.medium },
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
    ...buttonStyles.primary,
    marginTop: Spacing.xs,
    minHeight: 48,
  },
  doneText: buttonStyles.primaryText,
});
