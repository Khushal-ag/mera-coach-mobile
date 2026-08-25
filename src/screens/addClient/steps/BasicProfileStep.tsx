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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius } from '../../../constants/theme';
import FormFieldLabel from '../../../components/FormFieldLabel';
import PhoneTextInput from '../../../components/PhoneTextInput';
import {
  ageFromDate,
  cmToFeetInches,
  feetInchesToCm,
  formatDob,
  parseDob,
  sanitizeEmailInput,
  stripNonDigits,
} from '../../../utils/validation';
import type { ClientProfile } from '../../../types/models';
import type { IoniconName, StepProps, UpdateFn } from '../../../types/wizard';

type HeightUnit = 'cm' | 'ftin';

type ErrorFields = Record<string, boolean>;

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
  required?: boolean;
  hasError?: boolean;
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
  required,
  hasError,
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
      <FormFieldLabel required={required}>{label}</FormFieldLabel>
      <View style={[styles.inputWrap, hasError && styles.inputWrapError]}>
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

function DobField({ form, update, hasError }: StepProps<ClientProfile> & { hasError?: boolean }) {
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

function HeightField({
  form,
  update,
  hasError,
}: StepProps<ClientProfile> & { hasError?: boolean }) {
  const [unit, setUnit] = useState<HeightUnit>('cm');
  const [feetText, setFeetText] = useState(() => {
    const cm = form.height.trim() ? parseFloat(form.height) : NaN;
    if (!Number.isFinite(cm) || cm <= 0) return '';
    return String(cmToFeetInches(cm).feet);
  });
  const [inchesText, setInchesText] = useState(() => {
    const cm = form.height.trim() ? parseFloat(form.height) : NaN;
    if (!Number.isFinite(cm) || cm <= 0) return '';
    return String(cmToFeetInches(cm).inches);
  });

  const persistCm = (cm: number | null) => {
    const next = cm == null || !Number.isFinite(cm) ? '' : String(Math.round(cm * 10) / 10);
    update('height', next);
  };

  const onFeetChange = (raw: string) => {
    const digits = stripNonDigits(raw).slice(0, 1);
    setFeetText(digits);
    const feet = digits ? parseInt(digits, 10) : 0;
    const inches = inchesText ? parseInt(inchesText, 10) : 0;
    if (!digits && !inchesText) {
      persistCm(null);
      return;
    }
    persistCm(feetInchesToCm(feet, Math.min(inches, 11)));
  };

  const onInchesChange = (raw: string) => {
    const digits = stripNonDigits(raw).slice(0, 2);
    const asNum = digits ? parseInt(digits, 10) : 0;
    const clamped = digits && asNum > 11 ? '11' : digits;
    setInchesText(clamped);
    const feet = feetText ? parseInt(feetText, 10) : 0;
    const inches = clamped ? parseInt(clamped, 10) : 0;
    if (!feetText && !clamped) {
      persistCm(null);
      return;
    }
    persistCm(feetInchesToCm(feet, inches));
  };

  const onCmChange = (raw: string) => {
    update('height', raw.replace(/[^\d.]/g, ''));
  };

  const switchUnit = (next: HeightUnit) => {
    if (next === unit) return;
    if (next === 'ftin') {
      const cm = form.height.trim() ? parseFloat(form.height) : NaN;
      if (Number.isFinite(cm) && cm > 0) {
        const converted = cmToFeetInches(cm);
        setFeetText(String(converted.feet));
        setInchesText(String(converted.inches));
      } else {
        setFeetText('');
        setInchesText('');
      }
    }
    setUnit(next);
  };

  return (
    <View style={styles.field}>
      <View style={styles.heightHeader}>
        <FormFieldLabel required style={{ marginBottom: 0 }}>
          Height
        </FormFieldLabel>
        <View style={styles.unitToggle}>
          {(['cm', 'ftin'] as const).map(opt => (
            <TouchableOpacity
              key={opt}
              style={[styles.unitPill, unit === opt && styles.unitPillActive]}
              onPress={() => switchUnit(opt)}
              accessibilityRole="button"
              accessibilityState={{ selected: unit === opt }}
            >
              <Text style={[styles.unitPillText, unit === opt && styles.unitPillTextActive]}>
                {opt === 'cm' ? 'cm' : 'ft/in'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {unit === 'cm' ? (
        <View style={[styles.inputWrap, hasError && styles.inputWrapError]}>
          <Ionicons name="resize-outline" size={17} color={Colors.textLight} style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="e.g. 165"
            placeholderTextColor={Colors.textLight}
            keyboardType="numeric"
            value={form.height}
            onChangeText={onCmChange}
          />
        </View>
      ) : (
        <View style={styles.row}>
          <View style={[styles.inputWrap, styles.half, hasError && styles.inputWrapError]}>
            <TextInput
              style={styles.input}
              placeholder="ft"
              placeholderTextColor={Colors.textLight}
              keyboardType="number-pad"
              value={feetText}
              onChangeText={onFeetChange}
            />
            <Text style={styles.unitSuffix}>ft</Text>
          </View>
          <View style={[styles.inputWrap, styles.half, hasError && styles.inputWrapError]}>
            <TextInput
              style={styles.input}
              placeholder="in"
              placeholderTextColor={Colors.textLight}
              keyboardType="number-pad"
              value={inchesText}
              onChangeText={onInchesChange}
            />
            <Text style={styles.unitSuffix}>in</Text>
          </View>
        </View>
      )}
      <Text style={styles.hint}>Saved as centimetres for BMI and reports.</Text>
    </View>
  );
}

interface BasicProfileStepProps extends StepProps<ClientProfile> {
  /** Inline BMI preview — checkup only; Add Client skips BMI UI. */
  showBmiPreview?: boolean;
  /** Fields that failed the last aggregate validation pass. */
  errorFields?: ErrorFields;
}

export default function BasicProfileStep({
  form,
  update,
  showBmiPreview = false,
  errorFields = {},
}: BasicProfileStepProps) {
  const err = (field: string) => !!errorFields[field];

  return (
    <View>
      <Field
        label="Full Name"
        icon="person-outline"
        field="name"
        placeholder="Client's full name"
        form={form}
        update={update}
        required
        hasError={err('name')}
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
        required
        hasError={err('phone')}
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
        hasError={err('email')}
      />
      <Field
        label="Location"
        icon="location-outline"
        field="location"
        placeholder="City / Area"
        form={form}
        update={update}
        required
        hasError={err('location')}
      />

      <DobField form={form} update={update} hasError={err('dob')} />

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
            required
            hasError={err('age')}
          />
        </View>
        <View style={styles.half}>
          <FormFieldLabel required>Gender</FormFieldLabel>
          <View style={[styles.pickerRow, err('gender') && styles.pickerRowError]}>
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

      <HeightField form={form} update={update} hasError={err('height')} />

      <Field
        label="Weight (kg)"
        icon="scale-outline"
        field="weight"
        placeholder="e.g. 70"
        keyboardType="numeric"
        form={form}
        update={update}
        required
        hasError={err('weight')}
      />

      {showBmiPreview && form.height && form.weight ? (
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
  inputWrapError: { borderColor: Colors.destructive },
  dobPressable: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14, color: Colors.textDark, paddingVertical: 0 },
  placeholder: { color: Colors.textLight },
  hint: { fontSize: 11, color: Colors.textLight, marginTop: 6 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerRowError: {
    borderWidth: 1.5,
    borderColor: Colors.destructive,
    borderRadius: Radius.sm,
    padding: 4,
  },
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
  heightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  unitToggle: { flexDirection: 'row', gap: 6 },
  unitPill: {
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  unitPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  unitPillText: { fontSize: 12, color: Colors.textLight, fontWeight: '600' },
  unitPillTextActive: { color: Colors.white },
  unitSuffix: { fontSize: 13, fontWeight: '600', color: Colors.textLight, marginLeft: 4 },
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
