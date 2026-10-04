import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import {
  Colors,
  FontFamily,
  FormControl,
  PressOpacity,
  Radius,
  Shadow,
  Spacing,
  buttonStyles,
  headingFont,
} from '../../../constants/theme';
import FoodItemChip from '../../../components/addClient/FoodItemChip';
import { MEAL_SLOTS } from '../../../data/dietCatalog';
import { MEAL_SLOT_TO_API_LABEL } from '../../../data/mealSlotLabels';
import { getFoodMaster, getFoodCalories, resolveMasterLabel } from '../../../api/masterApi';
import { getErrorMessage } from '../../../api/client';
import { getCoachProfile } from '../../../api/coachApi';
import { MASTER_STALE_MS } from '../../../api/queryClient';
import { queryKeys } from '../../../api/queryKeys';
import { useParamMasterOptions } from '../../../hooks/useParamOptions';
import { FOOD_PREFERENCES, PARAM_CODES } from '../../../data/lifestyleOptions';
import type { ClientProfile, DietItem } from '../../../types/models';
import type { StepProps } from '../../../types/wizard';
import type { FoodMasterItem } from '../../../api/masterApi';

interface DietPairStepProps extends StepProps<ClientProfile> {
  slotIds: string[];
}

function passesFoodTypeFilter(cat: FoodMasterItem['cat'], foodTypeLabel: string): boolean {
  if (!foodTypeLabel) return true;
  if (foodTypeLabel === 'Vegetarian') return cat === 'veg' || cat === 'vegan';
  if (foodTypeLabel === 'Vegan') return cat === 'vegan';
  if (foodTypeLabel === 'Eggetarian') return cat !== 'nonveg';
  return true;
}

export default function DietPairStep({ form, update, slotIds }: DietPairStepProps) {
  const insets = useSafeAreaInsets();
  const [pickerSlot, setPickerSlot] = useState<string | null>(null);
  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const foodPrefOptions = useParamMasterOptions(PARAM_CODES.foodPreference, FOOD_PREFERENCES);
  const foodTypeLabel = resolveMasterLabel(form.foodPreference, foodPrefOptions);

  const coachProfileQuery = useQuery({
    queryKey: queryKeys.coachProfile,
    queryFn: getCoachProfile,
  });
  const country = coachProfileQuery.data?.country || 'India';

  // Wait for coach so food-master key does not flip (default India → real country).
  const foodMasterQuery = useQuery({
    queryKey: queryKeys.foodMaster(country, form.regionalCuisine),
    queryFn: () => getFoodMaster(country, form.regionalCuisine),
    enabled: !coachProfileQuery.isPending,
    staleTime: MASTER_STALE_MS,
  });

  const setItems = (slotId: string, newItems: DietItem[]) =>
    update('diet', { ...form.diet, [slotId]: newItems });

  const addItem = (slotId: string, food: { name: string; kcal: number }) => {
    const items = form.diet[slotId] || [];
    setItems(slotId, [...items, { name: food.name, qty: 1, kcal: food.kcal }]);
  };

  const updateQty = (slotId: string, index: number, qty: number) => {
    const items = [...(form.diet[slotId] || [])];
    const current = items[index];
    if (!current) return;
    items[index] = { ...current, qty };
    setItems(slotId, items);
  };

  const removeItem = (slotId: string, index: number) => {
    const items = [...(form.diet[slotId] || [])];
    items.splice(index, 1);
    setItems(slotId, items);
  };

  const closePicker = () => {
    setPickerSlot(null);
    setAiQuery('');
    setAiError('');
  };

  const askAi = async () => {
    if (!pickerSlot || aiLoading) return;
    if (!aiQuery.trim()) {
      setAiError('Enter a food name to look up calories.');
      return;
    }
    setAiLoading(true);
    setAiError('');
    try {
      const cal = await getFoodCalories(aiQuery.trim(), 1);
      addItem(pickerSlot, { name: aiQuery.trim(), kcal: cal });
      closePicker();
    } catch (err) {
      setAiError(getErrorMessage(err, 'Could not look up calories. Try again.'));
    } finally {
      setAiLoading(false);
    }
  };

  const pickerItems = pickerSlot
    ? (foodMasterQuery.data?.[MEAL_SLOT_TO_API_LABEL[pickerSlot] ?? ''] || []).filter(item =>
        passesFoodTypeFilter(item.cat, foodTypeLabel),
      )
    : [];

  return (
    <View>
      {slotIds.map(slotId => {
        const slot = MEAL_SLOTS.find(s => s.id === slotId);
        const items = form.diet[slotId] || [];
        const total = items.reduce((sum, it) => sum + it.kcal * it.qty, 0);

        return (
          <View key={slotId} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleBlock}>
                <Text style={styles.sectionLabel}>{slot?.label}</Text>
                <View style={styles.underline} />
              </View>
              <Text style={styles.sectionTotal}>~{total} kcal</Text>
            </View>
            <View style={styles.card}>
              {items.length === 0 && <Text style={styles.empty}>No items added yet</Text>}
              <View style={styles.chipsWrap}>
                {items.map((item, i) => (
                  <FoodItemChip
                    key={`${slotId}-${i}`}
                    item={item}
                    onQtyChange={q => updateQty(slotId, i, q)}
                    onRemove={() => removeItem(slotId, i)}
                  />
                ))}
                <TouchableOpacity
                  style={styles.moreBtn}
                  onPress={() => setPickerSlot(slotId)}
                  activeOpacity={PressOpacity.default}
                >
                  <Text style={styles.moreText}>+ Add Item</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      })}

      {foodMasterQuery.isError ? (
        <View style={styles.foodError}>
          <Text style={styles.aiError}>
            {getErrorMessage(foodMasterQuery.error, 'Could not load foods. Please try again.')}
          </Text>
          <TouchableOpacity
            onPress={() => void foodMasterQuery.refetch()}
            disabled={foodMasterQuery.isFetching}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <Text style={styles.retryLink}>
              {foodMasterQuery.isFetching ? 'Trying again…' : 'Try again'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Text style={styles.note}>* Calories are approximate. Leave blank if unknown.</Text>

      <Modal visible={!!pickerSlot} transparent animationType="fade" onRequestClose={closePicker}>
        <KeyboardAvoidingView
          style={styles.backdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity style={styles.backdropFlex} activeOpacity={1} onPress={closePicker} />
          <View
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.sheetTitle}>Add Food Item</Text>
            <ScrollView
              style={styles.optionList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              automaticallyAdjustKeyboardInsets
            >
              {foodMasterQuery.isPending ? (
                <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
              ) : foodMasterQuery.isError ? (
                <View style={styles.foodError}>
                  <Text style={styles.noFoods}>
                    {getErrorMessage(
                      foodMasterQuery.error,
                      'Could not load foods. Please try again.',
                    )}
                  </Text>
                  <TouchableOpacity
                    onPress={() => void foodMasterQuery.refetch()}
                    disabled={foodMasterQuery.isFetching}
                    accessibilityRole="button"
                    accessibilityLabel="Try again"
                  >
                    <Text style={styles.retryLink}>
                      {foodMasterQuery.isFetching ? 'Trying again…' : 'Try again'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                pickerItems.map(food => (
                  <TouchableOpacity
                    key={food.id}
                    style={styles.option}
                    onPress={() => {
                      if (pickerSlot) addItem(pickerSlot, { name: food.name, kcal: food.cal });
                      closePicker();
                    }}
                    activeOpacity={PressOpacity.default}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${food.name}`}
                  >
                    <Text style={styles.optionText}>{food.name}</Text>
                    <Text style={styles.optionKcal}>{food.cal} kcal</Text>
                  </TouchableOpacity>
                ))
              )}
              {!foodMasterQuery.isPending &&
              !foodMasterQuery.isError &&
              pickerItems.length === 0 ? (
                <Text style={styles.noFoods}>No foods available for this filter.</Text>
              ) : null}

              <View style={styles.aiRow}>
                <Text style={styles.aiLabel}>✨ Ask AI about calories</Text>
                <View style={styles.aiInputRow}>
                  <TextInput
                    style={styles.aiInput}
                    placeholder="e.g. Grilled chicken sandwich"
                    placeholderTextColor={Colors.textLight}
                    value={aiQuery}
                    onChangeText={setAiQuery}
                  />
                  <TouchableOpacity
                    style={styles.aiBtn}
                    onPress={askAi}
                    disabled={aiLoading}
                    activeOpacity={PressOpacity.default}
                    accessibilityRole="button"
                    accessibilityLabel="Add food with AI calorie estimate"
                  >
                    {aiLoading ? (
                      <ActivityIndicator color={Colors.white} size="small" />
                    ) : (
                      <Text style={styles.aiBtnText}>Add</Text>
                    )}
                  </TouchableOpacity>
                </View>
                {aiError ? <Text style={styles.aiError}>{aiError}</Text> : null}
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: Spacing.md + 2 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  sectionTitleBlock: { flex: 1, marginRight: Spacing.sm },
  sectionLabel: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: headingFont.bold,
    color: Colors.textDark,
  },
  underline: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#F08A2C',
    marginTop: 4,
  },
  sectionTotal: { fontSize: 13, fontFamily: FontFamily.semibold, color: Colors.accentInk },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 14,
    ...Shadow.sm,
  },
  empty: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
    fontStyle: 'italic',
  },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  moreBtn: {
    ...buttonStyles.compactGhost,
    borderWidth: 1,
    borderColor: '#F08A2C',
    borderStyle: 'dashed',
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  moreText: { ...buttonStyles.compactGhostText, fontSize: 12, color: '#F08A2C' },
  note: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    marginTop: 4,
    fontStyle: 'italic',
  },
  backdrop: { flex: 1, backgroundColor: Colors.scrim, justifyContent: 'flex-end' },
  backdropFlex: { flex: 1 },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.lg - 4,
    maxHeight: '65%',
    ...Shadow.lg,
  },
  sheetTitle: {
    fontSize: 16,
    fontFamily: headingFont.bold,
    color: Colors.textDark,
    marginBottom: Spacing.sm,
  },
  optionList: { marginBottom: Spacing.xs },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.background,
  },
  optionText: { fontSize: 14, fontFamily: FontFamily.regular, color: Colors.textDark },
  optionKcal: { fontSize: 12, color: Colors.textLight, fontFamily: FontFamily.semibold },
  noFoods: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.textLight,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  aiRow: {
    marginTop: Spacing.sm,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.background,
  },
  aiLabel: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    color: Colors.secondary,
    marginBottom: Spacing.xs,
  },
  aiInputRow: { flexDirection: 'row', gap: Spacing.xs },
  aiInput: {
    flex: 1,
    minWidth: 0,
    minHeight: FormControl.compactHeight + 8,
    borderRadius: 12,
    backgroundColor: '#E7F6EC',
    paddingHorizontal: Spacing.sm,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.accentInk,
  },
  aiBtn: {
    ...buttonStyles.compact,
    backgroundColor: '#F08A2C',
    borderRadius: Radius.sm,
    minWidth: 64,
    paddingHorizontal: Spacing.md,
  },
  aiBtnText: buttonStyles.compactText,
  aiError: { fontSize: 12, fontFamily: FontFamily.regular, color: Colors.primary, marginTop: 6 },
  foodError: { marginBottom: Spacing.sm },
  retryLink: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: FontFamily.semibold,
    color: Colors.accentInk,
  },
});
