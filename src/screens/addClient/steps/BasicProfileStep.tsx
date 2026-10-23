import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { pickImagesFromCameraOrLibrary } from '../../../utils/imagePicker';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontFamily,
  HitSlop,
  IconSize,
  PressOpacity,
  Radius,
  Shadow,
  Spacing,
  TouchTarget,
  Typography,
} from '../../../constants/theme';
import { wizardPillStyles } from '../../../constants/wizardStyles';
import FormFieldLabel from '../../../components/FormFieldLabel';
import FormErrorBanner from '../../../components/FormErrorBanner';
import { DobWheelField } from '../../../components/form/DobWheelField';
import PhoneTextInput from '../../../components/PhoneTextInput';
import ProgressPhotos from '../../../components/ProgressPhotos';
import {
  cmToFeetInches,
  feetInchesToCm,
  sanitizeEmailInput,
  stripNonDigits,
} from '../../../utils/validation';
import type { ClientProfile, PendingClientPhoto } from '../../../types/models';
import type { IoniconName, StepProps, UpdateFn } from '../../../types/wizard';

type HeightUnit = 'cm' | 'ftin';

type ErrorFields = Record<string, boolean>;

const PHOTO_THUMB = 88;

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
        <Ionicons name={icon} size={IconSize.md} color={Colors.accentInk} style={styles.icon} />
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
          <Ionicons
            name="resize-outline"
            size={IconSize.md}
            color={Colors.accentInk}
            style={styles.icon}
          />
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

/** One optional client photo. It becomes the profile picture and the first progress photo. */
function ClientPhotoField({ form, update }: StepProps<ClientProfile>) {
  const photo = (form.photos ?? [])[0];
  const [photoError, setPhotoError] = useState<string | null>(null);

  const pickPhoto = async () => {
    setPhotoError(null);
    const assets = await pickImagesFromCameraOrLibrary({ quality: 0.7, selectionLimit: 1 });
    const asset = assets[0];
    if (!asset) return;
    const next: PendingClientPhoto = {
      id: newPhotoId(),
      uri: asset.uri,
      dataUrl: `data:${asset.mimeType};base64,${asset.base64}`,
    };
    update('photos', [next]);
  };

  return (
    <View style={styles.photoField}>
      <FormFieldLabel style={{ marginBottom: 6 }}>Client Photo (optional)</FormFieldLabel>
      <Text style={styles.photoHint}>
        Saved as the client&apos;s profile picture and as their first progress photo. Add more
        progress photos later from the client profile.
      </Text>
      <FormErrorBanner message={photoError} />
      {photo ? (
        <View style={styles.photoThumbWrap}>
          <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
          <TouchableOpacity
            style={styles.photoRemoveBtn}
            onPress={() => update('photos', [])}
            accessibilityRole="button"
            accessibilityLabel="Remove photo"
            activeOpacity={PressOpacity.default}
            hitSlop={HitSlop.sm}
          >
            <View style={styles.photoRemoveIcon}>
              <Ionicons name="close-outline" size={IconSize.sm} color={Colors.destructive} />
            </View>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.photoEmpty}
          onPress={pickPhoto}
          accessibilityRole="button"
          accessibilityLabel="Add client photo"
        >
          <Ionicons name="camera-outline" size={IconSize.xxl} color={Colors.accentInk} />
          <Text style={styles.photoEmptyText}>Tap to add a photo</Text>
        </TouchableOpacity>
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
    <View style={styles.card}>
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

      <DobWheelField form={form} update={update} hasError={err('dob')} />

      <Field
        label="Age"
        icon="calendar-outline"
        field="age"
        placeholder="Years"
        required
        keyboardType="numeric"
        form={form}
        update={update}
        hasError={err('age')}
        onFocus={onLowerFieldFocus}
      />

      <View style={styles.field}>
        <FormFieldLabel required>Gender</FormFieldLabel>
        <View style={styles.pickerRow}>
          {GENDER_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.pill,
                form.gender === opt.value && styles.pillActive,
                err('gender') && styles.pillError,
              ]}
              onPress={() => update('gender', opt.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: form.gender === opt.value }}
            >
              <Text style={[styles.pillText, form.gender === opt.value && styles.pillActiveText]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

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

const FIELD_MINT = '#E7F6EC';

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
    ...Shadow.sm,
  },
  field: { marginBottom: Spacing.md },
  photoField: { marginBottom: Spacing.lg - Spacing.xxs },
  photoHint: {
    ...Typography.micro,
    fontFamily: FontFamily.regular,
    lineHeight: 15,
    marginBottom: 10,
  },
  photoThumbWrap: { width: PHOTO_THUMB, position: 'relative' },
  photoThumb: {
    width: PHOTO_THUMB,
    height: PHOTO_THUMB,
    borderRadius: Radius.sm,
    backgroundColor: Colors.background,
  },
  photoEmpty: {
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: '#F6FCF8',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: '#6FCBAA',
    borderStyle: 'dashed',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  photoEmptyText: { ...Typography.label, color: Colors.textLight },
  photoRemoveBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: TouchTarget.min,
    height: TouchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: FIELD_MINT,
    paddingHorizontal: Spacing.sm,
  },
  inputWrapError: {
    borderWidth: 1.5,
    borderColor: Colors.destructive,
  },
  icon: { marginRight: Spacing.xs },
  input: {
    flex: 1,
    minWidth: 0,
    ...Typography.body,
    color: Colors.accentInk,
    paddingVertical: 0,
  },
  hint: { ...Typography.micro, fontFamily: FontFamily.regular, marginTop: 6 },
  row: { flexDirection: 'row', gap: Spacing.sm },
  half: { flex: 1, minWidth: 0 },
  pickerRow: wizardPillStyles.row,
  // The error outlines each pill instead of boxing the whole row.
  pillError: {
    borderColor: Colors.destructive,
    borderWidth: 1.5,
  },
  pill: wizardPillStyles.pill,
  pillActive: wizardPillStyles.pillActive,
  pillText: wizardPillStyles.pillText,
  pillActiveText: wizardPillStyles.pillActiveText,
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
    ...Typography.label,
    color: Colors.accentInk,
    marginLeft: Spacing.xxs,
  },
});
