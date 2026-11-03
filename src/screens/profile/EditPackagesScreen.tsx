import React, { useMemo, useRef, useState } from 'react';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  type LayoutChangeEvent,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontFamily,
  IconSize,
  PressOpacity,
  Radius,
  ScreenPad,
  Spacing,
  Typography,
} from '../../constants/theme';
import FormErrorBanner from '../../components/FormErrorBanner';
import KeyboardSafeScroll from '../../components/KeyboardSafeScroll';
import OptionSheet from '../../components/OptionSheet';
import ReloadState from '../../components/ReloadState';
import WaveScreenHeader from '../../components/WaveScreenHeader';
import { getErrorMessage } from '../../api/client';
import { queryKeys } from '../../api/queryKeys';
import { getCoachProfileFull } from '../../api/coachApi';
import {
  getMyPackages,
  getProductBrands,
  getProductItems,
  savePackage,
  PACKAGE_MAX_AMOUNT,
  PACKAGE_MAX_ITEMS,
  PACKAGE_NAME_MAX,
  type PackageItem,
  type ShowcasePackage,
} from '../../api/showcaseApi';
import { formatMoney, parseAmount } from '../../utils/formatMoney';
import {
  firstItemOverMrp,
  itemAmountOverMrp,
  packageTotalOverMrp,
  sumItemMrp,
} from '../../utils/packageValidation';
import { navigateToDashboard } from '../../utils/navigationBack';
import type { PackagesStackScreenProps } from '../../types/navigation';
import { appAlert } from '../../utils/appDialog';

const CANVAS = '#F3FAF7';
const FIELD = '#E7F6EC';
/** Blank category on a product. Not an extra API level. */
const UNSPECIFIED = '\u241e';

function levelKey(value: string | undefined): string {
  const trimmed = value?.trim() ?? '';
  return trimmed || UNSPECIFIED;
}

function levelLabel(value: string): string {
  return value === UNSPECIFIED ? 'Not specified' : value;
}

function uniqueLevels(values: (string | undefined)[]): string[] {
  const keys = [...new Set(values.map(levelKey))];
  keys.sort((a, b) => {
    if (a === UNSPECIFIED) return 1;
    if (b === UNSPECIFIED) return -1;
    return a.localeCompare(b);
  });
  return keys;
}

export default function EditPackagesScreen({
  navigation,
  route,
}: PackagesStackScreenProps<'EditPackages'>) {
  const packageId = route.params?.packageId;
  const packagesQuery = useQuery({ queryKey: queryKeys.myPackages, queryFn: getMyPackages });
  const existing = packageId
    ? (packagesQuery.data ?? []).find(pkg => pkg.packageId === packageId)
    : undefined;
  const errorMessage =
    packagesQuery.isError && !packagesQuery.data
      ? getErrorMessage(packagesQuery.error, 'Could not load your packages.')
      : null;

  return (
    <View style={styles.container}>
      <WaveScreenHeader
        title="Package Creation"
        onBack={() => navigation.goBack()}
        onHome={() => navigateToDashboard(navigation)}
      />
      {packageId && packagesQuery.isPending ? (
        <ActivityIndicator color={Colors.secondary} style={styles.pending} />
      ) : errorMessage ? (
        <ReloadState
          title="Could not load packages"
          message={errorMessage}
          onRetry={() => void packagesQuery.refetch()}
          loading={packagesQuery.isFetching}
          showPullHint={false}
        />
      ) : packageId && !existing ? (
        <ReloadState
          title="Package not found"
          message="This package is no longer on your list."
          onRetry={() => navigation.goBack()}
          retryLabel="Back to packages"
          showPullHint={false}
        />
      ) : (
        <PackageForm
          key={packageId ?? 'new'}
          existing={existing}
          onDone={() => navigation.goBack()}
        />
      )}
    </View>
  );
}

function PackageForm({ existing, onDone }: { existing?: ShowcasePackage; onDone: () => void }) {
  const queryClient = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);
  const profileQuery = useQuery({
    queryKey: queryKeys.coachProfileFull,
    queryFn: getCoachProfileFull,
    staleTime: 10 * 60_000,
    refetchOnMount: 'always',
  });
  const brandCode =
    profileQuery.data?.brandCode?.trim() ?? existing?.brandCode?.trim() ?? '';
  const productBrandsQuery = useQuery({
    queryKey: queryKeys.productBrands,
    queryFn: getProductBrands,
    staleTime: 10 * 60_000,
  });
  const brandDisplayName = useMemo(() => {
    if (!brandCode) return '';
    const fromProfile = profileQuery.data?.brandName?.trim();
    if (fromProfile) return fromProfile;
    const fromPackage = existing?.brandName?.trim();
    if (fromPackage) return fromPackage;
    return (
      productBrandsQuery.data?.find(brand => brand.code === brandCode)?.label.trim() ??
      brandCode
    );
  }, [
    brandCode,
    profileQuery.data?.brandName,
    existing?.brandName,
    productBrandsQuery.data,
  ]);
  const [name, setName] = useState(existing?.packageName ?? '');
  const [items, setItems] = useState<PackageItem[]>(existing?.items ?? []);
  const [total, setTotal] = useState(existing ? String(existing.totalAmount) : '');
  const [totalEdited, setTotalEdited] = useState(!!existing);
  const [category, setCategory] = useState('');
  const [productCode, setProductCode] = useState('');
  const [price, setPrice] = useState('');
  const [sheet, setSheet] = useState<'category' | 'product' | null>(null);
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const leaveSaved = useUnsavedChangesGuard(
    name !== (existing?.packageName ?? '') ||
      total !== (existing ? String(existing.totalAmount) : '') ||
      items.length !== (existing?.items.length ?? 0),
  );

  const productsQuery = useQuery({
    queryKey: queryKeys.productItems(brandCode),
    queryFn: () => getProductItems(brandCode),
    enabled: !!brandCode,
    staleTime: 10 * 60_000,
  });
  const available = useMemo(
    () =>
      (productsQuery.data ?? []).filter(
        product => !items.some(item => item.itemCode === product.code),
      ),
    [productsQuery.data, items],
  );
  const categories = useMemo(
    () => uniqueLevels(available.map(product => product.category)),
    [available],
  );
  const categoryValue = categories.includes(category) ? category : '';
  const shownProducts = useMemo(() => {
    if (!categoryValue) return [];
    return available
      .filter(product => levelKey(product.category) === categoryValue)
      .map(product => ({ code: product.code, label: product.label }));
  }, [available, categoryValue]);
  const selectedProduct = shownProducts.find(product => product.code === productCode) ?? null;
  const mrpByItemCode = useMemo(() => {
    const map = new Map<string, number>();
    for (const product of productsQuery.data ?? []) {
      map.set(product.code, product.price ?? 0);
    }
    return map;
  }, [productsQuery.data]);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState('');

  const selectedMaster = useMemo(
    () =>
      productsQuery.data?.find(product => product.code === selectedProduct?.code),
    [productsQuery.data, selectedProduct?.code],
  );

  const addPriceMrpError = useMemo(() => {
    const amount = parseAmount(price);
    if (amount == null || !selectedMaster) return null;
    const mrp = selectedMaster.price ?? 0;
    if (itemAmountOverMrp(amount, mrp)) {
      return `Price cannot be higher than the product MRP (${formatMoney(mrp)}).`;
    }
    return null;
  }, [price, selectedMaster]);

  const editAmountMrpError = useMemo(() => {
    if (editingIndex == null) return null;
    const amount = parseAmount(editAmount);
    if (amount == null) return null;
    const code = items[editingIndex]?.itemCode?.trim();
    const mrp = code ? mrpByItemCode.get(code) : undefined;
    if (mrp != null && itemAmountOverMrp(amount, mrp)) {
      return `Price cannot be higher than the product MRP (${formatMoney(mrp)}).`;
    }
    return null;
  }, [editAmount, editingIndex, items, mrpByItemCode]);

  const totalMrpError = useMemo(() => {
    const totalAmount = parseAmount(total);
    if (totalAmount == null || !items.length) return null;
    const mrpSum = sumItemMrp(items, mrpByItemCode);
    if (packageTotalOverMrp(totalAmount, mrpSum)) {
      return `Package total cannot be higher than the combined MRP (${formatMoney(mrpSum)}).`;
    }
    return null;
  }, [total, items, mrpByItemCode]);

  // Where each input sits in the scroll content, so the focused one can be lifted above the keyboard.
  const fieldY = useRef<Record<string, number>>({});
  const trackField = (key: string, e: LayoutChangeEvent) => {
    fieldY.current[key] = e.nativeEvent.layout.y;
  };
  const revealField = (key: string) => {
    // Wait for the keyboard to finish opening, then bring the field (and its label) near the top.
    setTimeout(() => {
      const y = fieldY.current[key];
      if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, y - 110), animated: true });
    }, 280);
  };

  const showBanner = (message: string) => {
    setBanner(message);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditAmount(String(items[index].amount));
  };
  const commitEdit = (index: number) => {
    const amount = parseAmount(editAmount);
    if (amount == null || amount <= 0) return showBanner('Enter a valid amount.');
    if (amount > PACKAGE_MAX_AMOUNT) return showBanner('That price is too high.');
    const code = items[index].itemCode?.trim();
    const mrp = code ? mrpByItemCode.get(code) : undefined;
    if (mrp != null && itemAmountOverMrp(amount, mrp)) {
      return showBanner(
        `Price cannot be higher than the product MRP (${formatMoney(mrp)}).`,
      );
    }
    setBanner(null);
    setEditingIndex(null);
    applyItems(items.map((item, i) => (i === index ? { ...item, amount } : item)));
  };

  const applyItems = (next: PackageItem[]) => {
    setItems(next);
    if (!totalEdited) {
      setTotal(next.length ? String(next.reduce((sum, item) => sum + item.amount, 0)) : '');
    }
  };

  const addItem = () => {
    if (!brandCode) {
      return showBanner('Set a product brand on your profile before adding products.');
    }
    if (!categoryValue) return showBanner('Select a category.');
    if (!selectedProduct) return showBanner('Select a product to add.');
    const amount = parseAmount(price);
    if (amount == null || amount <= 0) return showBanner('Enter a price for this product.');
    if (amount > PACKAGE_MAX_AMOUNT) return showBanner('That price is too high.');
    const master = productsQuery.data?.find(
      product => product.code === selectedProduct.code,
    );
    const mrp = master?.price ?? 0;
    if (itemAmountOverMrp(amount, mrp)) {
      return showBanner(
        `Price cannot be higher than the product MRP (${formatMoney(mrp)}).`,
      );
    }
    if (items.length >= PACKAGE_MAX_ITEMS) {
      return showBanner(`A package can hold up to ${PACKAGE_MAX_ITEMS} products.`);
    }
    if (items.some(item => item.itemCode === selectedProduct.code)) {
      return showBanner(`${selectedProduct.label} is already in this package.`);
    }
    setBanner(null);
    applyItems([
      ...items,
      { itemCode: selectedProduct.code, itemName: selectedProduct.label, amount },
    ]);
    setProductCode('');
    setPrice('');
  };

  const handleSave = async () => {
    if (saving) return;
    const totalAmount = parseAmount(total);
    if (!brandCode) {
      return showBanner('Set a product brand on your profile before saving packages.');
    }
    if (!name.trim()) return showBanner('Enter a package name.');
    if (!items.length) return showBanner('Add at least one product.');
    if (totalAmount == null || totalAmount <= 0) return showBanner('Enter the package total.');
    if (totalAmount > PACKAGE_MAX_AMOUNT) return showBanner('The total is too high.');
    const overItem = firstItemOverMrp(items, mrpByItemCode);
    if (overItem) {
      return showBanner(
        `${overItem.itemName} cannot be priced above its MRP (${formatMoney(overItem.mrp)}).`,
      );
    }
    const mrpSum = sumItemMrp(items, mrpByItemCode);
    if (packageTotalOverMrp(totalAmount, mrpSum)) {
      return showBanner(
        `Package total cannot be higher than the combined MRP (${formatMoney(mrpSum)}).`,
      );
    }
    setBanner(null);
    setSaving(true);
    try {
      await savePackage({
        packageId: existing?.packageId ?? 0,
        brandCode,
        packageName: name.trim(),
        totalAmount,
        isActive,
        items,
      });
      void queryClient.invalidateQueries({ queryKey: ['showcase'] });
      appAlert(
        'Package published',
        'It now shows on your public profile.',
        [{ text: 'OK', onPress: leaveSaved(onDone) }],
        { tone: 'success' },
      );
    } catch (err) {
      showBanner(getErrorMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.formRoot}>
      <KeyboardSafeScroll
        ref={scrollRef}
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardPadding={Spacing.xl}
      >
        <FormErrorBanner message={banner} />

        {brandCode && brandDisplayName ? (
          <Text style={styles.brandMeta} accessibilityRole="text">
            Product brand:{' '}
            <Text style={styles.brandMetaValue}>{brandDisplayName}</Text>
          </Text>
        ) : !brandCode && !profileQuery.isPending ? (
          <Text style={styles.hint}>
            Choose a product brand under Edit profile → Professional details before you add
            products.
          </Text>
        ) : null}

        <Text style={styles.label}>Package name</Text>
        <TextInput
          onLayout={e => trackField('name', e)}
          onFocus={() => revealField('name')}
          style={[styles.field, styles.input]}
          value={name}
          onChangeText={setName}
          maxLength={PACKAGE_NAME_MAX}
          placeholder="e.g. Starter"
          placeholderTextColor={Colors.textLight}
          accessibilityLabel="Package name"
        />

        <Text style={styles.label}>Category</Text>
        <TouchableOpacity
          style={[styles.field, styles.selectField, !categoryValue && styles.locked]}
          disabled={
            !brandCode ||
            productsQuery.isPending ||
            productsQuery.isError ||
            categories.length === 0
          }
          onPress={() => setSheet('category')}
          activeOpacity={PressOpacity.default}
          accessibilityRole="button"
          accessibilityLabel="Category"
        >
          <Text style={categoryValue ? styles.value : styles.placeholder} numberOfLines={1}>
            {categoryValue
              ? levelLabel(categoryValue)
              : productsQuery.isPending
                ? 'Loading...'
                : 'Select a category'}
          </Text>
          <Ionicons name="chevron-down-outline" size={IconSize.md} color={Colors.textLight} />
        </TouchableOpacity>
        {brandCode && productsQuery.isError ? (
          <Text style={styles.hint}>Could not load products.</Text>
        ) : brandCode && !productsQuery.isPending && (productsQuery.data?.length ?? 0) === 0 ? (
          <Text style={styles.hint}>No products are available for this brand yet.</Text>
        ) : brandCode && !productsQuery.isPending && available.length === 0 ? (
          <Text style={styles.hint}>Every product from this brand is already in the package.</Text>
        ) : null}

        <Text style={styles.label}>Product</Text>
        <TouchableOpacity
          style={[styles.field, styles.selectField, !selectedProduct && styles.locked]}
          disabled={!categoryValue || shownProducts.length === 0}
          onPress={() => setSheet('product')}
          activeOpacity={PressOpacity.default}
          accessibilityRole="button"
          accessibilityLabel="Product"
        >
          <Text style={selectedProduct ? styles.value : styles.placeholder} numberOfLines={1}>
            {selectedProduct?.label ||
              (categoryValue ? 'Select a product' : 'Select a category first')}
          </Text>
          <Ionicons name="chevron-down-outline" size={IconSize.md} color={Colors.textLight} />
        </TouchableOpacity>
        <Text style={styles.label}>Price</Text>
        <View onLayout={e => trackField('price', e)}>
          <View style={styles.priceRow}>
            <TextInput
              onFocus={() => revealField('price')}
              style={[
                styles.field,
                styles.input,
                styles.priceInput,
                addPriceMrpError && styles.fieldErrorBorder,
              ]}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={Colors.textLight}
              accessibilityLabel="Price"
            />
            <TouchableOpacity
              style={styles.addBtn}
              onPress={addItem}
              activeOpacity={PressOpacity.default}
              accessibilityRole="button"
              accessibilityLabel="Add product"
            >
              <Ionicons name="add" size={IconSize.md} color={Colors.white} />
              <Text style={styles.addLabel}>ADD</Text>
            </TouchableOpacity>
          </View>
          {addPriceMrpError ? (
            <Text style={styles.fieldError}>{addPriceMrpError}</Text>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Package Items</Text>
        <View style={styles.sectionUnderline} />
        <View style={styles.itemsCard}>
          <View style={styles.tableHead}>
            <Text style={[styles.headText, styles.colName]}>Items Name</Text>
            <Text style={[styles.headText, styles.colAmount]}>Amount</Text>
            <View style={styles.colActions} />
          </View>
          {items.length === 0 ? (
            <Text style={styles.emptyItems}>No products added yet.</Text>
          ) : null}
          {items.map((item, index) => {
            const editing = editingIndex === index;
            return (
              <View key={`${item.itemCode}-${index}`} style={styles.itemRow}>
                <Text style={[styles.itemName, styles.colName]} numberOfLines={3}>
                  {item.itemName}
                </Text>
                {editing ? (
                  <View style={styles.colAmount}>
                    <TextInput
                      style={[
                        styles.itemAmount,
                        styles.itemAmountInput,
                        editAmountMrpError && styles.fieldErrorBorder,
                      ]}
                      value={editAmount}
                      onChangeText={setEditAmount}
                      keyboardType="decimal-pad"
                      autoFocus
                      accessibilityLabel={`Amount for ${item.itemName}`}
                    />
                    {editAmountMrpError ? (
                      <Text style={styles.itemFieldError}>{editAmountMrpError}</Text>
                    ) : null}
                  </View>
                ) : (
                  <Text style={[styles.itemAmount, styles.colAmount]}>{item.amount}</Text>
                )}
                <View style={styles.colActions}>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => (editing ? commitEdit(index) : startEdit(index))}
                    accessibilityRole="button"
                    accessibilityLabel={editing ? 'Save amount' : `Edit ${item.itemName}`}
                  >
                    <Ionicons
                      name={editing ? 'checkmark' : 'pencil-outline'}
                      size={IconSize.md}
                      color={Colors.secondary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingIndex(null);
                      applyItems(items.filter((_, i) => i !== index));
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${item.itemName}`}
                    hitSlop={8}
                  >
                    <Ionicons name="close-circle" size={IconSize.lg} color={Colors.destructive} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
          <View style={styles.totalRow}>
            <View style={styles.totalBlock} onLayout={e => trackField('total', e)}>
              <View
                style={[styles.totalPill, totalMrpError && styles.fieldErrorBorder]}
              >
                <Text style={styles.totalLabel}>Total</Text>
                <TextInput
                  onFocus={() => revealField('total')}
                  style={styles.totalInput}
                  value={total}
                  onChangeText={value => {
                    setTotal(value);
                    setTotalEdited(true);
                  }}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={Colors.textLight}
                  accessibilityLabel="Total"
                />
              </View>
              {totalMrpError ? (
                <Text style={styles.fieldError}>{totalMrpError}</Text>
              ) : null}
            </View>
          </View>
          <View style={styles.noteRow}>
            <Ionicons name="information-circle-outline" size={14} color={Colors.textLight} />
            <Text style={styles.noteText}>Editable- no need to match with the breakup</Text>
          </View>
        </View>

        <View style={styles.activeRow}>
          <View style={styles.activeCopy}>
            <Text style={styles.activeTitle}>{isActive ? 'Active' : 'Inactive'}</Text>
            <Text style={styles.hint}>
              {isActive
                ? 'Shown on your public profile.'
                : 'Hidden from your public profile. You can switch it on any time.'}
            </Text>
          </View>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            trackColor={{ false: '#C9C2BB', true: Colors.secondary }}
            thumbColor={Colors.white}
            accessibilityLabel="Show this package on your public profile"
          />
        </View>

        <TouchableOpacity
          style={[styles.publishBtn, saving && styles.publishDisabled]}
          onPress={() => void handleSave()}
          disabled={saving}
          activeOpacity={PressOpacity.default}
          accessibilityRole="button"
          accessibilityLabel="Publish"
          accessibilityState={{ disabled: saving, busy: saving }}
        >
          {saving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.publishLabel}>PUBLISH</Text>
          )}
        </TouchableOpacity>
      </KeyboardSafeScroll>

      <OptionSheet
        visible={sheet === 'category'}
        title="Category"
        options={categories.map(key => ({ code: key, label: levelLabel(key) }))}
        selectedCode={categoryValue}
        onClose={() => setSheet(null)}
        onSelect={option => {
          if (option.code === category) {
            setSheet(null);
            return;
          }
          setCategory(option.code);
          setProductCode('');
          setPrice('');
          setSheet(null);
        }}
      />
      <OptionSheet
        visible={sheet === 'product'}
        title="Product"
        options={shownProducts}
        selectedCode={selectedProduct?.code}
        emptyMessage="No products are left in this category."
        onClose={() => setSheet(null)}
        onSelect={option => {
          setProductCode(option.code);
          const suggested = productsQuery.data?.find(
            product => product.code === option.code,
          )?.price;
          setPrice(suggested ? String(suggested) : '');
          setSheet(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CANVAS },
  pending: { marginTop: 60 },
  formRoot: { flex: 1 },
  body: { flex: 1, backgroundColor: CANVAS },
  bodyContent: { paddingHorizontal: ScreenPad.horizontal, paddingTop: Spacing.md },
  label: { ...Typography.bodyStrong, marginTop: Spacing.md, marginBottom: Spacing.xs },
  field: {
    minHeight: 52,
    borderRadius: Radius.pill,
    backgroundColor: FIELD,
    paddingHorizontal: 20,
  },
  input: { ...Typography.body, color: Colors.textDark },
  selectField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  locked: { opacity: 0.6 },
  value: { ...Typography.body, flex: 1, color: Colors.textDark },
  placeholder: { ...Typography.body, flex: 1, color: Colors.textLight },
  hint: { ...Typography.label, color: Colors.textLight, marginTop: Spacing.xs },
  brandMeta: { ...Typography.label, color: Colors.textLight, marginBottom: Spacing.sm },
  brandMetaValue: { color: Colors.textDark, fontFamily: FontFamily.semibold },
  fieldError: { ...Typography.label, color: Colors.destructive, marginTop: Spacing.xs },
  fieldErrorBorder: { borderWidth: 1, borderColor: Colors.destructive },
  itemFieldError: {
    ...Typography.label,
    color: Colors.destructive,
    fontSize: 10,
    marginTop: 2,
  },
  priceRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  priceInput: { flex: 1 },
  addBtn: {
    minHeight: 52,
    paddingHorizontal: 20,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addLabel: { color: Colors.white, fontFamily: FontFamily.semibold, fontSize: 15 },
  sectionTitle: { ...Typography.bodyStrong, marginTop: Spacing.lg },
  sectionUnderline: {
    width: 44,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    marginTop: 4,
    marginBottom: Spacing.sm,
  },
  itemsCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: FIELD,
    paddingHorizontal: Spacing.md,
    minHeight: 40,
  },
  headText: { ...Typography.label, color: Colors.textLight },
  colName: { flex: 1 },
  colAmount: { width: 72 },
  colActions: {
    width: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  emptyItems: { ...Typography.label, color: Colors.textLight, padding: Spacing.md },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 52,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  itemName: { ...Typography.body, paddingVertical: Spacing.sm },
  itemAmount: { ...Typography.body },
  itemAmountInput: { padding: 0, borderBottomWidth: 1, borderBottomColor: Colors.secondary },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: FIELD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  totalBlock: { flex: 1, maxWidth: 220, alignItems: 'stretch' },
  totalPill: {
    flex: 1,
    maxWidth: 220,
    minHeight: 48,
    borderRadius: Radius.pill,
    backgroundColor: FIELD,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  totalLabel: { ...Typography.bodyStrong, lineHeight: 24 },
  totalInput: {
    ...Typography.bodyStrong,
    color: Colors.secondary,
    fontSize: 18,
    lineHeight: 24,
    height: 24,
    minWidth: 60,
    textAlign: 'right',
    textAlignVertical: 'center',
    includeFontPadding: false,
    padding: 0,
  },

  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  noteText: { ...Typography.label, color: Colors.textLight },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: Spacing.md,
  },
  activeCopy: { flex: 1 },
  activeTitle: { ...Typography.bodyStrong },
  publishBtn: {
    marginTop: Spacing.lg,
    minHeight: 56,
    borderRadius: Radius.pill,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishDisabled: { opacity: 0.6 },
  publishLabel: { color: Colors.white, fontFamily: FontFamily.semibold, fontSize: 18 },
});
