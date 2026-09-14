import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COACH_GALLERY_REF_TYPE, COACH_PACKAGE_IMAGE_DOC_TYPE } from '../../config/appConfig';
import {
  Colors,
  FontFamily,
  FormControl,
  Radius,
  Shadow,
  Spacing,
  formFieldStyles,
  buttonStyles,
} from '../../constants/theme';
import { uploadDocument } from '../../api/documentApi';
import { getErrorMessage } from '../../api/client';
import { getDocumentSavedById } from '../../auth/session';
import FormFieldLabel from '../FormFieldLabel';
import OfferImageField from './OfferImageField';
import type { CoachPackage } from '../../types/models';
import { MAX_COACH_PACKAGES, createEmptyPackage } from '../../utils/coachPackages';
import { pickImageFromCameraOrLibrary } from '../../utils/imagePicker';

interface Props {
  packages: CoachPackage[];
  onChange: (next: CoachPackage[]) => void;
  coachCode: string;
}

export default function CoachPackagesEditor({ packages, onChange, coachCode }: Props) {
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const packagesRef = useRef(packages);
  useEffect(() => {
    packagesRef.current = packages;
  }, [packages]);

  const commit = (next: CoachPackage[]) => {
    packagesRef.current = next;
    onChange(next);
  };

  const updateAt = (index: number, patch: Partial<CoachPackage>) => {
    commit(packagesRef.current.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  const removeAt = (index: number) => {
    commit(packagesRef.current.filter((_, i) => i !== index));
  };

  const addPackage = () => {
    if (packagesRef.current.length >= MAX_COACH_PACKAGES) return;
    commit([...packagesRef.current, createEmptyPackage()]);
  };

  const pickImage = async (index: number) => {
    const pkg = packagesRef.current[index];
    if (!pkg || !coachCode) return;

    const picked = await pickImageFromCameraOrLibrary({
      allowsEditing: true,
      aspect: [16, 10],
      quality: 0.75,
    });
    if (!picked) return;

    const previousUrl = pkg.imageUrl ?? '';
    const pkgId = pkg.id;
    updateAt(index, { imageUrl: picked.uri });
    setUploadingId(pkgId);
    try {
      const url = await uploadDocument({
        base64DataUrl: `data:${picked.mimeType};base64,${picked.base64}`,
        coachCode,
        refCode: coachCode,
        refType: COACH_GALLERY_REF_TYPE,
        docType: COACH_PACKAGE_IMAGE_DOC_TYPE,
        savedBy: getDocumentSavedById(),
      });
      const latestIndex = packagesRef.current.findIndex(p => p.id === pkgId);
      if (latestIndex >= 0) updateAt(latestIndex, { imageUrl: url });
    } catch (err) {
      const latestIndex = packagesRef.current.findIndex(p => p.id === pkgId);
      if (latestIndex >= 0) updateAt(latestIndex, { imageUrl: previousUrl });
      Alert.alert(
        'Upload failed',
        getErrorMessage(err, 'Could not upload photo. Please try again.'),
      );
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.intro}>
        <View style={styles.introIcon}>
          <Ionicons name="pricetag-outline" size={18} color={Colors.secondary} />
        </View>
        <View style={styles.introText}>
          <Text style={styles.sectionTitle}>Product packages</Text>
          <Text style={styles.hint}>
            Offer 1 to {MAX_COACH_PACKAGES} coaching packages on your public profile. No in-app
            payment. Enquiries come via WhatsApp or the form.
          </Text>
        </View>
      </View>

      {packages.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="cube-outline" size={28} color={Colors.textLight} />
          <Text style={styles.emptyTitle}>No packages yet</Text>
          <Text style={styles.emptyMessage}>
            Add a package with a cover photo so clients know what you offer.
          </Text>
        </View>
      ) : null}

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

          <OfferImageField
            imageUrl={pkg.imageUrl}
            uploading={uploadingId === pkg.id}
            onPick={() => void pickImage(index)}
            onRemove={() => updateAt(index, { imageUrl: '' })}
            accessibilityLabel={`package ${index + 1} photo`}
          />

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
          <Ionicons name="add-circle-outline" size={18} color={Colors.white} />
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
  intro: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  introIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introText: { flex: 1 },
  sectionTitle: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    color: Colors.textDark,
    marginBottom: 4,
  },
  hint: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    lineHeight: 17,
  },
  emptyCard: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    color: Colors.textDark,
  },
  emptyMessage: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 17,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  cardTitle: { fontSize: 13, fontFamily: FontFamily.bold, color: Colors.secondary },
  field: { marginBottom: Spacing.sm },
  input: {
    ...formFieldStyles.wrap,
    ...formFieldStyles.input,
    height: FormControl.searchHeight,
  },
  textarea: { height: 72, paddingVertical: Spacing.sm - 2 },
  row: { flexDirection: 'row', gap: Spacing.sm - 2 },
  half: { flex: 1 },
  addBtn: {
    ...buttonStyles.compact,
    alignSelf: 'stretch',
    backgroundColor: Colors.secondary,
    marginTop: Spacing.xxs,
    ...Shadow.sm,
  },
  addBtnText: buttonStyles.compactText,
});
