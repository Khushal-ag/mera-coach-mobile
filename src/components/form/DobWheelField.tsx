import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Colors,
  FontFamily,
  PressOpacity,
  Radius,
  Spacing,
  formFieldStyles,
} from '../../constants/theme';
import FormFieldLabel from '../FormFieldLabel';
import { ageFromDate, formatDob, parseDob } from '../../utils/validation';
import type { ClientProfile } from '../../types/models';
import type { StepProps } from '../../types/wizard';

/** Oldest selectable DOB — aligned with age sync upper bound (100). */
const MIN_DOB = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 100);
  d.setHours(0, 0, 0, 0);
  return d;
})();
const MAX_DOB = (() => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
})();
const DEFAULT_DOB = new Date(2000, 0, 1);

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const WHEEL_ITEM_HEIGHT = 40;
const WHEEL_VISIBLE = 5;
const WHEEL_PAD = ((WHEEL_VISIBLE - 1) / 2) * WHEEL_ITEM_HEIGHT;

function clampDate(date: Date): Date {
  const t = date.getTime();
  if (t < MIN_DOB.getTime()) return new Date(MIN_DOB);
  if (t > MAX_DOB.getTime()) return new Date(MAX_DOB);
  return date;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

interface WheelColumnProps {
  values: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

function WheelColumn({ values, selectedIndex, onSelect }: WheelColumnProps) {
  const scrollRef = useRef<ScrollView>(null);
  const settling = useRef(false);

  useEffect(() => {
    const y = selectedIndex * WHEEL_ITEM_HEIGHT;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y, animated: false });
    });
  }, [selectedIndex, values.length]);

  const settle = (offsetY: number) => {
    const index = Math.max(0, Math.min(values.length - 1, Math.round(offsetY / WHEEL_ITEM_HEIGHT)));
    settling.current = true;
    scrollRef.current?.scrollTo({ y: index * WHEEL_ITEM_HEIGHT, animated: true });
    if (index !== selectedIndex) onSelect(index);
    settling.current = false;
  };

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    settle(e.nativeEvent.contentOffset.y);
  };

  const onScrollEndDrag = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    // Android often skips momentum end when velocity is near zero.
    if (Math.abs(e.nativeEvent.velocity?.y ?? 0) < 0.05) {
      settle(e.nativeEvent.contentOffset.y);
    }
  };

  return (
    <View style={styles.wheelColumn}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_HEIGHT}
        decelerationRate="fast"
        nestedScrollEnabled
        onMomentumScrollEnd={onMomentumEnd}
        onScrollEndDrag={onScrollEndDrag}
        contentContainerStyle={{ paddingVertical: WHEEL_PAD }}
      >
        {values.map((label, i) => (
          <View key={`${label}-${i}`} style={styles.wheelItem}>
            <Text style={[styles.wheelItemText, i === selectedIndex && styles.wheelItemTextActive]}>
              {label}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

/** Scroll-wheel DOB field for the add-client wizard. */
export function DobWheelField({
  form,
  update,
  hasError,
}: StepProps<ClientProfile> & { hasError?: boolean }) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  /** Draft date — committed only on Done so Cancel / backdrop discard spins. */
  const [draft, setDraft] = useState(DEFAULT_DOB);
  const parsed = parseDob(form.dob);
  const pickerValue = parsed ?? DEFAULT_DOB;

  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = MAX_DOB.getFullYear(); y >= MIN_DOB.getFullYear(); y--) years.push(y);
    return years;
  }, []);

  const dayCount = daysInMonth(draft.getFullYear(), draft.getMonth());
  const dayOptions = useMemo(
    () => Array.from({ length: dayCount }, (_, i) => String(i + 1).padStart(2, '0')),
    [dayCount],
  );
  const monthOptions = useMemo(() => MONTH_LABELS.map(m => m.slice(0, 3)), []);
  const yearLabels = useMemo(() => yearOptions.map(String), [yearOptions]);

  const applyDob = (date: Date) => {
    const clamped = clampDate(date);
    update('dob', formatDob(clamped));
    const age = ageFromDate(clamped);
    if (age >= 5 && age <= 100) update('age', String(age));
  };

  const openPicker = () => {
    setDraft(clampDate(pickerValue));
    setOpen(true);
  };

  const closePicker = () => setOpen(false);

  const commitDraft = () => {
    applyDob(draft);
    setOpen(false);
  };

  const setYear = (index: number) => {
    const year = yearOptions[index]!;
    const month = draft.getMonth();
    const day = Math.min(draft.getDate(), daysInMonth(year, month));
    setDraft(clampDate(new Date(year, month, day)));
  };

  const setMonth = (index: number) => {
    const year = draft.getFullYear();
    const day = Math.min(draft.getDate(), daysInMonth(year, index));
    setDraft(clampDate(new Date(year, index, day)));
  };

  const setDay = (index: number) => {
    setDraft(clampDate(new Date(draft.getFullYear(), draft.getMonth(), index + 1)));
  };

  const yearIndex = Math.max(0, yearOptions.indexOf(draft.getFullYear()));
  const monthIndex = draft.getMonth();
  const dayIndex = Math.min(draft.getDate(), dayCount) - 1;

  return (
    <View style={styles.field}>
      <FormFieldLabel required>Date of Birth</FormFieldLabel>
      <View style={[styles.inputWrap, hasError && styles.inputWrapError]}>
        <TouchableOpacity
          style={styles.dobPressable}
          onPress={openPicker}
          activeOpacity={PressOpacity.strong}
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
      <Text style={styles.hint}>One of DOB or Age is required. Picking DOB auto-fills Age.</Text>

      <Modal visible={open} transparent animationType="slide" onRequestClose={closePicker}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            onPress={closePicker}
            activeOpacity={1}
          />
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 28) }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={closePicker}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Date of Birth</Text>
              <TouchableOpacity
                onPress={commitDraft}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.wheelRow}>
              <View style={styles.wheelHighlight} pointerEvents="none" />
              <WheelColumn values={dayOptions} selectedIndex={dayIndex} onSelect={setDay} />
              <WheelColumn values={monthOptions} selectedIndex={monthIndex} onSelect={setMonth} />
              <WheelColumn values={yearLabels} selectedIndex={yearIndex} onSelect={setYear} />
            </View>
            <Text style={styles.draftPreview}>{formatDob(draft)}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: Spacing.md },
  inputWrap: {
    ...formFieldStyles.wrap,
    ...formFieldStyles.wrapSurface,
  },
  inputWrapError: formFieldStyles.wrapError,
  dobPressable: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  icon: formFieldStyles.inputIcon,
  input: formFieldStyles.input,
  placeholder: { color: Colors.textLight },
  hint: { fontSize: 11, fontFamily: FontFamily.regular, color: Colors.textLight, marginTop: 6 },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Colors.scrim,
  },
  modalDismissArea: { flex: 1 },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingBottom: Spacing.xl - 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 15, fontFamily: FontFamily.bold, color: Colors.textDark },
  modalCancel: { fontSize: 16, fontFamily: FontFamily.semibold, color: Colors.textLight },
  modalDone: { fontSize: 16, fontFamily: FontFamily.bold, color: Colors.primary },
  wheelRow: {
    flexDirection: 'row',
    height: WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE,
    marginTop: Spacing.xs,
    marginHorizontal: Spacing.xs,
    position: 'relative',
  },
  wheelHighlight: {
    position: 'absolute',
    left: 4,
    right: 4,
    top: WHEEL_PAD,
    height: WHEEL_ITEM_HEIGHT,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryLight,
    zIndex: 0,
  },
  wheelColumn: { flex: 1, zIndex: 1 },
  wheelItem: {
    height: WHEEL_ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelItemText: { fontSize: 16, color: Colors.textLight, fontFamily: FontFamily.medium },
  wheelItemTextActive: { color: Colors.textDark, fontFamily: FontFamily.bold, fontSize: 17 },
  draftPreview: {
    textAlign: 'center',
    marginTop: Spacing.sm,
    fontSize: 14,
    fontFamily: FontFamily.semibold,
    color: Colors.primary,
  },
});
