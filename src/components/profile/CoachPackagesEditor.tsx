import React, { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COACH_GALLERY_REF_TYPE, COACH_PACKAGE_IMAGE_DOC_TYPE } from '../../config/appConfig';
import {
  Colors,
  FontFamily,
  IconSize,
  PressOpacity,
  Radius,
  Shadow,
  Spacing,
  headingFont,
} from '../../constants/theme';
import { uploadDocument } from '../../api/documentApi';
import { getErrorMessage } from '../../api/client';
import { getDocumentSavedById } from '../../auth/session';
import OfferImageField from './OfferImageField';
import type { CoachPackage } from '../../types/models';
import { MAX_COACH_PACKAGES, createEmptyPackage } from '../../utils/coachPackages';
import { pickImageFromCameraOrLibrary } from '../../utils/imagePicker';

const FIELD_MINT = '#E7F6EC';
const ORANGE = '#F26C2C';
const ROW_LINE = '#E3EEE8';

interface Props {
  packages: CoachPackage[];
  onChange: (next: CoachPackage[]) => void;
  coachCode: string;
  focusPackageId?: string;
  reservedSlots?: number;
  initialPhotoId?: string | null;
  onError?: (message: string) => void;
}

function parseAmount(price: string): number | null {
  const trimmed = price.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/,/g, '').replace(/[^\d.]/g, '');
  if (!normalized || normalized === '.') return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function totalLabel(packages: CoachPackage[]): string {
  let sum = 0;
  let any = false;
  for (const pkg of packages) {
    const parsed = parseAmount(pkg.price);
    if (parsed == null) continue;
    any = true;
    sum += parsed;
  }
  if (!any) return '-';
  return Number.isInteger(sum) ? String(sum) : String(Math.round(sum * 100) / 100);
}

function priceToAmount(price: string): string {
  const match = price.replace(/,/g, '').match(/\d+(?:\.\d*)?/);
  return match?.[0] ?? '';
}

function amountToPrice(raw: string): string {
  let cleaned = raw.replace(/[^\d.]/g, '');
  const dot = cleaned.indexOf('.');
  if (dot !== -1) {
    cleaned = `${cleaned.slice(0, dot + 1)}${cleaned.slice(dot + 1).replace(/\./g, '')}`;
  }
  if (!cleaned || cleaned === '.') return '';
  return `Rs ${cleaned}`;
}

function CardHeading({ title }: { title: string }) {
  return (
    <View style={styles.titleBlock}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.underline} />
    </View>
  );
}

export default function CoachPackagesEditor({
  packages,
  onChange,
  coachCode,
  focusPackageId,
  reservedSlots = 0,
  initialPhotoId = null,
  onError,
}: Props) {
  const [items, setItems] = useState(packages);
  const itemsRef = useRef(packages);
  const initialFocus = focusPackageId ?? packages[0]?.id ?? null;
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [extrasId, setExtrasId] = useState<string | null>(initialPhotoId);
  const [workingId, setWorkingId] = useState<string | null>(initialFocus);
  const workingIdRef = useRef<string | null>(initialFocus);

  const working = workingId ? (items.find(pkg => pkg.id === workingId) ?? null) : null;
  const atMax = reservedSlots + items.length >= MAX_COACH_PACKAGES;
  const nameLocked = !working && atMax;

  const focusWorking = (id: string | null) => {
    workingIdRef.current = id;
    setWorkingId(id);
  };

  const commit = (next: CoachPackage[]) => {
    itemsRef.current = next;
    setItems(next);
    onChange(next);
  };

  const updateById = (id: string, patch: Partial<CoachPackage>) => {
    commit(itemsRef.current.map(pkg => (pkg.id === id ? { ...pkg, ...patch } : pkg)));
  };

  const removeById = (id: string) => {
    setExtrasId(current => (current === id ? null : current));
    if (workingIdRef.current === id) focusWorking(null);
    commit(itemsRef.current.filter(pkg => pkg.id !== id));
  };

  const addPackage = () => {
    if (reservedSlots + itemsRef.current.length >= MAX_COACH_PACKAGES) return;
    const next = createEmptyPackage();
    const hasWorking = itemsRef.current.some(pkg => pkg.id === workingIdRef.current);
    commit([...itemsRef.current, next]);
    if (!hasWorking) focusWorking(next.id);
  };

  const onNameChange = (value: string) => {
    const targetId = workingIdRef.current;
    const index = targetId ? itemsRef.current.findIndex(pkg => pkg.id === targetId) : -1;
    if (index >= 0 && targetId) {
      updateById(targetId, { name: value });
      return;
    }
    if (reservedSlots + itemsRef.current.length >= MAX_COACH_PACKAGES) return;
    const next = createEmptyPackage();
    next.name = value;
    focusWorking(next.id);
    commit([...itemsRef.current, next]);
  };

  const pickImage = async (pkgId: string) => {
    const pkg = itemsRef.current.find(item => item.id === pkgId);
    if (!pkg || !coachCode) return;

    const picked = await pickImageFromCameraOrLibrary({
      allowsEditing: true,
      aspect: [16, 10],
      quality: 0.75,
    });
    if (!picked) return;

    const previousUrl = pkg.imageUrl ?? '';
    updateById(pkgId, { imageUrl: picked.uri });
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
      if (itemsRef.current.some(item => item.id === pkgId)) updateById(pkgId, { imageUrl: url });
    } catch (err) {
      if (itemsRef.current.some(item => item.id === pkgId)) {
        updateById(pkgId, { imageUrl: previousUrl });
      }
      onError?.(getErrorMessage(err, 'Could not upload photo. Please try again.'));
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <View>
      <View style={styles.card}>
        <CardHeading title="Package Details" />
        <Text style={styles.fieldLabel}>Package Name</Text>
        <TextInput
          style={[styles.mintInput, nameLocked && styles.mintInputLocked]}
          value={working?.name ?? ''}
          onChangeText={onNameChange}
          editable={!nameLocked}
          placeholderTextColor={Colors.textLight}
          accessibilityLabel="Package Name"
          accessibilityState={{ disabled: nameLocked }}
        />
      </View>

      <View style={styles.card}>
        <CardHeading title="Package Items" />
        <View style={styles.tableHead}>
          <Text style={[styles.headText, styles.nameCol]}>Items Name</Text>
          <Text style={[styles.headText, styles.amountCol]}>Amount</Text>
          <View style={styles.pencilCol} />
        </View>

        {items.map((pkg, index) => {
          const photoOpen = extrasId === pkg.id;
          return (
            <View key={pkg.id}>
              <View style={styles.itemRow}>
                <View style={styles.nameCol}>
                  <TextInput
                    style={[styles.cellInput, styles.nameInput]}
                    value={pkg.name}
                    onChangeText={value => updateById(pkg.id, { name: value })}
                    placeholderTextColor={Colors.textLight}
                    accessibilityLabel="Item name"
                  />
                </View>
                <View style={styles.amountCol}>
                  <View style={styles.amountInline}>
                    <Text style={styles.rsPrefix}>Rs</Text>
                    <TextInput
                      style={[styles.cellInput, styles.amountInput]}
                      value={priceToAmount(pkg.price)}
                      onChangeText={value => updateById(pkg.id, { price: amountToPrice(value) })}
                      keyboardType="decimal-pad"
                      placeholderTextColor={Colors.textLight}
                      accessibilityLabel="Amount"
                    />
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.pencilBtn}
                  onPress={() => setExtrasId(current => (current === pkg.id ? null : pkg.id))}
                  activeOpacity={PressOpacity.default}
                  accessibilityRole="button"
                  accessibilityLabel={photoOpen ? 'Hide package photo' : 'Package photo'}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="pencil-outline" size={IconSize.sm} color={Colors.accentInk} />
                </TouchableOpacity>
              </View>

              <View style={styles.editBlock}>
                <Text style={styles.fieldLabel}>Duration / sessions</Text>
                <TextInput
                  style={styles.mintInput}
                  value={pkg.duration}
                  onChangeText={value => updateById(pkg.id, { duration: value })}
                  placeholderTextColor={Colors.textLight}
                  accessibilityLabel="Duration / sessions"
                />
                <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Short description</Text>
                <TextInput
                  style={[styles.mintInput, styles.mintArea]}
                  value={pkg.description}
                  onChangeText={value => updateById(pkg.id, { description: value })}
                  placeholderTextColor={Colors.textLight}
                  multiline
                  textAlignVertical="top"
                  accessibilityLabel="Short description"
                />
                {photoOpen ? (
                  <>
                    <View style={styles.photoBlock}>
                      <OfferImageField
                        imageUrl={pkg.imageUrl}
                        uploading={uploadingId === pkg.id}
                        onPick={() => void pickImage(pkg.id)}
                        onRemove={() => updateById(pkg.id, { imageUrl: '' })}
                        accessibilityLabel={`package ${index + 1} photo`}
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => removeById(pkg.id)}
                      activeOpacity={PressOpacity.default}
                      accessibilityRole="button"
                      accessibilityLabel={
                        pkg.name.trim() ? `Remove ${pkg.name.trim()}` : 'Remove package'
                      }
                    >
                      <Ionicons
                        name="trash-outline"
                        size={IconSize.sm}
                        color={Colors.destructive}
                      />
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
            </View>
          );
        })}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.addBtn, atMax && styles.addBtnDisabled]}
            onPress={addPackage}
            disabled={atMax}
            activeOpacity={PressOpacity.default}
            accessibilityRole="button"
            accessibilityLabel="Add package"
            accessibilityState={{ disabled: atMax }}
          >
            <Ionicons name="add-circle-outline" size={IconSize.sm} color={ORANGE} />
            <Text style={styles.addText}>ADD</Text>
          </TouchableOpacity>
          <View style={styles.totalPill}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{totalLabel(items)}</Text>
          </View>
        </View>

        <View style={styles.noteRow}>
          <Ionicons name="information-circle-outline" size={IconSize.sm} color={Colors.textLight} />
          <Text style={styles.noteText}>Editable- no need to match with the breakup</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  titleBlock: { marginBottom: Spacing.sm + 2 },
  cardTitle: {
    fontFamily: headingFont.bold,
    fontSize: 18,
    lineHeight: 24,
    color: Colors.textDark,
  },
  underline: {
    width: 46,
    height: 3,
    borderRadius: 2,
    backgroundColor: ORANGE,
    marginTop: 8,
  },
  fieldLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
  },
  fieldLabelSpaced: { marginTop: Spacing.md },
  mintInput: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: FIELD_MINT,
    paddingHorizontal: 14,
    paddingVertical: 0,
    fontFamily: FontFamily.medium,
    fontSize: 15,
    lineHeight: 20,
    color: Colors.accentInk,
  },
  mintInputLocked: { opacity: 0.5 },
  mintArea: {
    minHeight: 80,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FIELD_MINT,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textLight,
  },
  nameCol: { flex: 1.3, minWidth: 0, marginRight: Spacing.xs, justifyContent: 'center' },
  amountCol: { flex: 0.8, minWidth: 0, marginRight: Spacing.xs, justifyContent: 'center' },
  pencilCol: { width: 34 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ROW_LINE,
  },
  cellInput: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textDark,
    paddingVertical: 8,
    paddingHorizontal: 0,
    minHeight: 40,
  },
  nameInput: {
    width: '100%',
    minWidth: 0,
  },
  amountInline: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  amountInput: {
    flex: 1,
    minWidth: 0,
  },
  rsPrefix: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textDark,
    marginRight: 4,
  },
  pencilBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: FIELD_MINT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBlock: { paddingTop: Spacing.sm, paddingBottom: Spacing.xs },
  photoBlock: { marginTop: Spacing.md },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: Spacing.xs,
    paddingVertical: 4,
  },
  removeText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: Colors.destructive,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: Spacing.md,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: ORANGE,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    minHeight: 40,
    backgroundColor: Colors.white,
  },
  addBtnDisabled: { opacity: 0.4 },
  addText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: ORANGE,
    letterSpacing: 0.3,
  },
  totalPill: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: FIELD_MINT,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textLight,
  },
  totalValue: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    lineHeight: 24,
    color: Colors.textDark,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm + 2,
  },
  noteText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 11,
    lineHeight: 15,
    color: Colors.textLight,
  },
});
