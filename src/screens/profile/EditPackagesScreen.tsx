import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
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
  const [productCode, setProductCode] = useState('');
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('');
  const [sheet, setSheet] = useState<'brand' | 'product' | null>(null);
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
  const brandLabel = brandsQuery.data?.find(b => b.code === brandCode)?.label ?? '';
  // One product master per package: it locks once items are added.
  const brandLocked = items.length > 0;

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
            {brandLabel || 'Select Herbalife, VeySlim...'}
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
          style={[styles.field, styles.input]}
          value={name}
          onChangeText={setName}
          maxLength={PACKAGE_NAME_MAX}
          placeholder="e.g. Starter"
          placeholderTextColor={Colors.textLight}
          accessibilityLabel="Package name"
        />

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
        <View style={styles.priceRow}>
          <TextInput
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
          setProductCode('');
          setProductName('');
          setSheet(null);
        }}
      />
      <OptionSheet
        visible={sheet === 'product'}
        title="Select product"
        options={productsQuery.data ?? []}
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
