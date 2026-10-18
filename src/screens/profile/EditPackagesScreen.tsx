import React, { useMemo, useRef, useState } from 'react';
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
  Alert,
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
import { navigateToDashboard } from '../../utils/navigationBack';
import type { PackagesStackScreenProps } from '../../types/navigation';

const CANVAS = '#F3FAF7';
const FIELD = '#E7F6EC';

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
  const [brandCode, setBrandCode] = useState(existing?.brandCode ?? '');
  const [name, setName] = useState(existing?.packageName ?? '');
  const [items, setItems] = useState<PackageItem[]>(existing?.items ?? []);
  const [total, setTotal] = useState(existing ? String(existing.totalAmount) : '');
  const [totalEdited, setTotalEdited] = useState(!!existing);
  const [category, setCategory] = useState('');
  const [productCode, setProductCode] = useState('');
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('');
  const [sheet, setSheet] = useState<'brand' | 'category' | 'product' | null>(null);
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const brandsQuery = useQuery({
    queryKey: queryKeys.productBrands,
    queryFn: getProductBrands,
    staleTime: 10 * 60_000,
  });
  const productsQuery = useQuery({
    queryKey: queryKeys.productItems(brandCode),
    queryFn: () => getProductItems(brandCode),
    enabled: !!brandCode,
    staleTime: 10 * 60_000,
  });
  const categories = useMemo(
    () => [...new Set((productsQuery.data ?? []).map(p => p.category).filter(Boolean))].sort(),
    [productsQuery.data],
  ) as string[];
  const shownProducts = useMemo(
    () =>
      (productsQuery.data ?? [])
        .filter(
          p => (!category || p.category === category) && !items.some(i => i.itemCode === p.code),
        )
        .map(p => ({ code: p.code, label: p.label, hint: category ? undefined : p.category })),
    [productsQuery.data, category, items],
  );
  const brandLabel = brandsQuery.data?.find(b => b.code === brandCode)?.label ?? '';
  // One product master per package: it locks once items are added.
  const brandLocked = items.length > 0;

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

  const applyItems = (next: PackageItem[]) => {
    setItems(next);
    if (!totalEdited) {
      setTotal(next.length ? String(next.reduce((sum, item) => sum + item.amount, 0)) : '');
    }
  };

  const addItem = () => {
    if (!brandCode) return showBanner('Choose a product master first.');
    if (!productCode) return showBanner('Select a product to add.');
    const amount = parseAmount(price);
    if (amount == null || amount <= 0) return showBanner('Enter a price for this product.');
    if (amount > PACKAGE_MAX_AMOUNT) return showBanner('That price is too high.');
    if (items.length >= PACKAGE_MAX_ITEMS) {
      return showBanner(`A package can hold up to ${PACKAGE_MAX_ITEMS} products.`);
    }
    if (items.some(item => item.itemCode === productCode)) {
      return showBanner(`${productName} is already in this package.`);
    }
    setBanner(null);
    applyItems([...items, { itemCode: productCode, itemName: productName, amount }]);
    setProductCode('');
    setProductName('');
    setPrice('');
  };

  const handleSave = async () => {
    if (saving) return;
    const totalAmount = parseAmount(total);
    if (!brandCode) return showBanner('Choose a product master.');
    if (!name.trim()) return showBanner('Enter a package name.');
    if (!items.length) return showBanner('Add at least one product.');
    if (totalAmount == null || totalAmount <= 0) return showBanner('Enter the package total.');
    if (totalAmount > PACKAGE_MAX_AMOUNT) return showBanner('The total is too high.');
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
      Alert.alert('Package published', 'It now shows on your public profile.', [
        { text: 'OK', onPress: onDone },
      ]);
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

        <Text style={styles.label}>Product master</Text>
        <TouchableOpacity
          style={[styles.field, styles.selectField, brandLocked && styles.locked]}
          disabled={brandLocked}
          onPress={() => setSheet('brand')}
          activeOpacity={PressOpacity.default}
          accessibilityRole="button"
          accessibilityLabel="Product master"
        >
          <Text style={brandLabel ? styles.value : styles.placeholder}>
            {brandLabel || 'Select product master'}
          </Text>
          <Ionicons name="chevron-down-outline" size={IconSize.md} color={Colors.textLight} />
        </TouchableOpacity>
        {brandsQuery.data?.length === 0 ? (
          <Text style={styles.hint}>
            No product masters are available yet. They will appear here once added.
          </Text>
        ) : brandLocked ? (
          <Text style={styles.hint}>Remove all products to change the master.</Text>
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

        {categories.length > 0 ? (
          <>
            <Text style={styles.label}>Category</Text>
            <TouchableOpacity
              style={[styles.field, styles.selectField]}
              onPress={() => setSheet('category')}
              activeOpacity={PressOpacity.default}
              accessibilityRole="button"
              accessibilityLabel="Category"
            >
              <Text style={category ? styles.value : styles.placeholder} numberOfLines={1}>
                {category || 'All categories'}
              </Text>
              <Ionicons name="chevron-down-outline" size={IconSize.md} color={Colors.textLight} />
            </TouchableOpacity>
          </>
        ) : null}

        <Text style={styles.label}>Select product</Text>
        <TouchableOpacity
          style={[styles.field, styles.selectField]}
          onPress={() =>
            brandCode ? setSheet('product') : showBanner('Choose a product master first.')
          }
          activeOpacity={PressOpacity.default}
          accessibilityRole="button"
          accessibilityLabel="Select product"
        >
          <Text style={productName ? styles.value : styles.placeholder}>
            {productName || 'Choose from the product list'}
          </Text>
          <Ionicons name="chevron-down-outline" size={IconSize.md} color={Colors.textLight} />
        </TouchableOpacity>

        <Text style={styles.label}>Price</Text>
        <View style={styles.priceRow} onLayout={e => trackField('price', e)}>
          <TextInput
            onFocus={() => revealField('price')}
            style={[styles.field, styles.input, styles.priceInput]}
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

        {items.length > 0 ? (
          <View style={styles.itemsCard}>
            {items.map((item, index) => (
              <View key={`${item.itemCode}-${index}`} style={styles.itemRow}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.itemName}
                </Text>
                <Text style={styles.itemAmount}>{formatMoney(item.amount)}</Text>
                <TouchableOpacity
                  onPress={() => applyItems(items.filter((_, i) => i !== index))}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${item.itemName}`}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={IconSize.lg} color={Colors.destructive} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.label}>Total</Text>
        <TextInput
          onLayout={e => trackField('total', e)}
          onFocus={() => revealField('total')}
          style={[styles.field, styles.input]}
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
        <Text style={styles.hint}>
          Set the price clients pay. It does not have to match the sum of the products.
        </Text>

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
        visible={sheet === 'brand'}
        title="Product master"
        options={brandsQuery.data ?? []}
        selectedCode={brandCode}
        onClose={() => setSheet(null)}
        onSelect={option => {
          setBrandCode(option.code);
          setCategory('');
          setProductCode('');
          setProductName('');
          setSheet(null);
        }}
      />
      <OptionSheet
        visible={sheet === 'category'}
        title="Category"
        options={[
          { code: '', label: 'All categories' },
          ...categories.map(name => ({ code: name, label: name })),
        ]}
        selectedCode={category}
        onClose={() => setSheet(null)}
        onSelect={option => {
          setCategory(option.code);
          setProductCode('');
          setProductName('');
          setPrice('');
          setSheet(null);
        }}
      />
      <OptionSheet
        visible={sheet === 'product'}
        title="Select product"
        options={shownProducts}
        selectedCode={productCode}
        emptyMessage={
          productsQuery.isPending
            ? 'Loading products...'
            : 'No products are available for this master yet.'
        }
        onClose={() => setSheet(null)}
        onSelect={option => {
          setProductCode(option.code);
          setProductName(option.label);
          const suggested = productsQuery.data?.find(p => p.code === option.code)?.price;
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
  itemsCard: {
    marginTop: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: 18,
    paddingHorizontal: Spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  itemName: { ...Typography.body, flex: 1 },
  itemAmount: { ...Typography.bodyStrong },
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
