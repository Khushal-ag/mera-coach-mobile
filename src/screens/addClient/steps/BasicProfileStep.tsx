import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '../../../constants/theme';
import PhoneTextInput from '../../../components/PhoneTextInput';
import { ageFromDate, formatDob, parseDob, sanitizeEmailInput } from '../../../utils/validation';
import type { ClientProfile } from '../../../types/models';
import type { IoniconName, StepProps, UpdateFn } from '../../../types/wizard';

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

function clampDate(date: Date): Date {
  const t = date.getTime();
  if (t < MIN_DOB.getTime()) return new Date(MIN_DOB);
  if (t > MAX_DOB.getTime()) return new Date(MAX_DOB);
  return date;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

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

function DobField({ form, update }: StepProps<ClientProfile>) {
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
      <Text style={styles.label}>Date of Birth</Text>
      <View style={styles.inputWrap}>
        <TouchableOpacity style={styles.dobPressable} onPress={openPicker} activeOpacity={0.7}>
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
      <Text style={styles.hint}>Optional if Age is filled. Picking DOB auto-fills Age.</Text>

      <Modal visible={open} transparent animationType="slide" onRequestClose={closePicker}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            onPress={closePicker}
            activeOpacity={1}
          />
          <View style={styles.modalSheet}>
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
  modalDismissArea: { flex: 1 },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingBottom: 28,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 15, fontWeight: '700', color: Colors.textDark },
  modalCancel: { fontSize: 16, fontWeight: '600', color: Colors.textLight },
  modalDone: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  wheelRow: {
    flexDirection: 'row',
    height: WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE,
    marginTop: 8,
    marginHorizontal: 8,
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
  wheelItemText: { fontSize: 16, color: Colors.textLight, fontWeight: '500' },
  wheelItemTextActive: { color: Colors.textDark, fontWeight: '700', fontSize: 17 },
  draftPreview: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
});
