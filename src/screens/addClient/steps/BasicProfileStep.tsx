import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Image,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { pickImagesFromCameraOrLibrary } from '../../../utils/imagePicker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Colors,
  FontFamily,
  IconSize,
  PressOpacity,
  Radius,
  Spacing,
  formFieldStyles,
} from '../../../constants/theme';
import { wizardPillStyles } from '../../../constants/wizardStyles';
import FormFieldLabel from '../../../components/FormFieldLabel';
import PhoneTextInput from '../../../components/PhoneTextInput';
import ProgressPhotos from '../../../components/ProgressPhotos';
import {
  ageFromDate,
  cmToFeetInches,
  feetInchesToCm,
  formatDob,
  parseDob,
  sanitizeEmailInput,
  stripNonDigits,
} from '../../../utils/validation';
import type { ClientProfile, PendingClientPhoto } from '../../../types/models';
import type { IoniconName, StepProps, UpdateFn } from '../../../types/wizard';

type HeightUnit = 'cm' | 'ftin';

type ErrorFields = Record<string, boolean>;

/** Cap local picks before personal commit (matches ProgressPhotos multi-select spirit). */
const MAX_CLIENT_PHOTOS = 10;
const PHOTO_THUMB = 88;

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
  onFocus?: () => void;
}

// Stored as 'M'/'F' — save-client-detail, generate-diet-plan, and BMI formulas expect codes.
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
  onFocus,
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
    onFocus,
  };

  return (
    <View style={styles.field}>
      <FormFieldLabel required={required}>{label}</FormFieldLabel>
      <View style={[styles.inputWrap, hasError && styles.inputWrapError]}>
        <Ionicons name={icon} size={IconSize.md} color={Colors.textLight} style={styles.icon} />
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

function HeightField({
  form,
  update,
  hasError,
  onLowerFieldFocus,
}: StepProps<ClientProfile> & { hasError?: boolean; onLowerFieldFocus?: () => void }) {
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
            onFocus={onLowerFieldFocus}
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
              onFocus={onLowerFieldFocus}
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
              onFocus={onLowerFieldFocus}
            />
            <Text style={styles.unitSuffix}>in</Text>
          </View>
        </View>
      )}
      <Text style={styles.hint}>Saved as centimetres for BMI and reports.</Text>
    </View>
  );
}

function newPhotoId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function ClientPhotoField({ form, update }: StepProps<ClientProfile>) {
  const photos = form.photos ?? [];
  const remaining = MAX_CLIENT_PHOTOS - photos.length;
  const canAdd = remaining > 0;

  const setPhotos = (next: PendingClientPhoto[]) => {
    update('photos', next);
  };

  const pickPhotos = async () => {
    if (!canAdd) {
      Alert.alert('Limit reached', `You can add up to ${MAX_CLIENT_PHOTOS} photos.`);
      return;
    }
    const assets = await pickImagesFromCameraOrLibrary({
      quality: 0.7,
      selectionLimit: remaining,
    });
    if (!assets.length) return;

    const added: PendingClientPhoto[] = [];
    for (const asset of assets) {
      if (added.length >= remaining) break;
      added.push({
        id: newPhotoId(),
        uri: asset.uri,
        dataUrl: `data:${asset.mimeType};base64,${asset.base64}`,
      });
    }
    if (!added.length) return;
    setPhotos([...photos, ...added]);
  };

  const removePhoto = (id: string) => {
    setPhotos(photos.filter(p => p.id !== id));
  };

  return (
    <View style={styles.photoField}>
      <View style={styles.photoHeader}>
        <FormFieldLabel style={{ marginBottom: 0 }}>Client Photos (optional)</FormFieldLabel>
        {canAdd ? (
          <TouchableOpacity
            style={styles.photoActionBtn}
            onPress={pickPhotos}
            activeOpacity={PressOpacity.strong}
            accessibilityRole="button"
            accessibilityLabel="Add client photos"
          >
            <Ionicons name="camera-outline" size={14} color={Colors.primary} />
            <Text style={styles.photoActionText}>{photos.length ? 'Add more' : 'Add photos'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={styles.photoHint}>
        Uploaded after client details are saved. Up to {MAX_CLIENT_PHOTOS} photos.
      </Text>

      {photos.length === 0 ? (
        <TouchableOpacity
          style={styles.photoEmpty}
          onPress={pickPhotos}
          accessibilityRole="button"
          accessibilityLabel="Add client photos"
        >
          <Ionicons name="images-outline" size={28} color={Colors.textLight} />
          <Text style={styles.photoEmptyText}>Tap to select photos</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.photoGrid}>
          {photos.map(photo => (
            <View key={photo.id} style={styles.photoThumbWrap}>
              <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
              <TouchableOpacity
                style={styles.photoRemoveBtn}
                onPress={() => removePhoto(photo.id)}
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
              >
                <Ionicons name="close" size={14} color={Colors.destructive} />
              </TouchableOpacity>
            </View>
          ))}
          {canAdd ? (
            <TouchableOpacity
              style={styles.photoAddTile}
              onPress={pickPhotos}
              accessibilityRole="button"
              accessibilityLabel="Add more photos"
            >
              <Ionicons name="add" size={28} color={Colors.textLight} />
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </View>
  );
}

interface BasicProfileStepProps extends StepProps<ClientProfile> {
  /** Fields that failed the last aggregate validation pass. */
  errorFields?: ErrorFields;
  /** Scroll parent so lower fields clear the keyboard. */
  onLowerFieldFocus?: () => void;
  /**
   * When set (checkup / after first personal save), use live Document API photos
   * like web AddClient?clientCode=. New Add Client uses pending local picks instead.
   */
  clientCode?: string;
}

export default function BasicProfileStep({
  form,
  update,
  errorFields = {},
  onLowerFieldFocus,
  clientCode,
}: BasicProfileStepProps) {
  const err = (field: string) => !!errorFields[field];

  return (
    <View>
      {clientCode ? (
        <ProgressPhotos clientCode={clientCode} />
      ) : (
        <ClientPhotoField form={form} update={update} />
      )}
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
            placeholder="Years (or use DOB)"
            keyboardType="numeric"
            form={form}
            update={update}
            hasError={err('age')}
            onFocus={onLowerFieldFocus}
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

      <HeightField
        form={form}
        update={update}
        hasError={err('height')}
        onLowerFieldFocus={onLowerFieldFocus}
      />

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
        onFocus={onLowerFieldFocus}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: Spacing.md },
  photoField: { marginBottom: Spacing.lg - 4 },
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  photoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
  },
  photoActionText: { fontSize: 12, fontFamily: FontFamily.bold, color: Colors.primary },
  photoHint: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    lineHeight: 15,
    marginBottom: 10,
  },
  photoEmpty: {
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  photoEmptyText: { fontSize: 13, fontFamily: FontFamily.semibold, color: Colors.textLight },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoThumbWrap: { width: PHOTO_THUMB, position: 'relative' },
  photoThumb: {
    width: PHOTO_THUMB,
    height: PHOTO_THUMB,
    borderRadius: Radius.sm,
    backgroundColor: Colors.background,
  },
  photoAddTile: {
    width: PHOTO_THUMB,
    height: PHOTO_THUMB,
    borderRadius: Radius.sm,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.white,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
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
  row: { flexDirection: 'row', gap: Spacing.sm },
  half: { flex: 1 },
  pickerRow: wizardPillStyles.row,
  pickerRowError: {
    borderWidth: 1.5,
    borderColor: Colors.destructive,
    borderRadius: Radius.sm,
    padding: 4,
  },
  pill: wizardPillStyles.pill,
  pillActive: wizardPillStyles.pillActive,
  pillText: wizardPillStyles.pillText,
  pillActiveText: wizardPillStyles.pillActiveText,
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginBottom: Spacing.md,
    marginTop: 4,
  },
  heightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  unitToggle: { flexDirection: 'row', gap: 6 },
  unitPill: wizardPillStyles.unitPill,
  unitPillActive: wizardPillStyles.unitPillActive,
  unitPillText: wizardPillStyles.unitPillText,
  unitPillTextActive: wizardPillStyles.unitPillTextActive,
  unitSuffix: {
    fontSize: 13,
    fontFamily: FontFamily.semibold,
    color: Colors.textLight,
    marginLeft: 4,
  },
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
