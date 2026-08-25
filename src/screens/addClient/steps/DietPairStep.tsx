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
import { Colors, Radius, Shadow } from '../../../constants/theme';
import FoodItemChip from '../../../components/FoodItemChip';
import { MEAL_SLOTS } from '../../../data/dietCatalog';
import { MEAL_SLOT_TO_API_LABEL } from '../../../data/mealSlotLabels';
import { getFoodMaster, getFoodCalories, resolveMasterLabel } from '../../../api/masterApi';
import { getCoachProfile } from '../../../api/coachApi';
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

  // food-master region matches web: dropdown value (itemCode).
  const foodMasterQuery = useQuery({
    queryKey: queryKeys.foodMaster(country, form.regionalCuisine),
    queryFn: () => getFoodMaster(country, form.regionalCuisine),
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
    if (!pickerSlot || !aiQuery.trim()) return;
    setAiLoading(true);
    setAiError('');
    try {
      const cal = await getFoodCalories(aiQuery.trim(), 1);
      addItem(pickerSlot, { name: aiQuery.trim(), kcal: cal });
      closePicker();
    } catch {
      setAiError('Could not look up calories. Try again.');
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
              <Text style={styles.sectionLabel}>{slot?.label}</Text>
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
                <TouchableOpacity style={styles.moreBtn} onPress={() => setPickerSlot(slotId)}>
                  <Text style={styles.moreText}>+ Add Item</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      })}

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
              ) : (
                pickerItems.map(food => (
                  <TouchableOpacity
                    key={food.id}
                    style={styles.option}
                    onPress={() => {
                      if (pickerSlot) addItem(pickerSlot, { name: food.name, kcal: food.cal });
                      closePicker();
                    }}
                  >
                    <Text style={styles.optionText}>{food.name}</Text>
                    <Text style={styles.optionKcal}>{food.cal} kcal</Text>
                  </TouchableOpacity>
                ))
              )}
              {!foodMasterQuery.isPending && pickerItems.length === 0 ? (
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
                  <TouchableOpacity style={styles.aiBtn} onPress={askAi} disabled={aiLoading}>
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
  section: { marginBottom: 18 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  sectionTotal: { fontSize: 13, fontWeight: '700', color: Colors.secondary },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 14,
    ...Shadow.sm,
  },
  empty: { fontSize: 13, color: Colors.textLight, marginBottom: 8, fontStyle: 'italic' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  moreBtn: {
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 8,
  },
  moreText: { fontSize: 12, color: Colors.primary, fontWeight: '700' },
  note: { fontSize: 11, color: Colors.textLight, marginTop: 4, fontStyle: 'italic' },
  backdrop: { flex: 1, backgroundColor: Colors.scrim, justifyContent: 'flex-end' },
  backdropFlex: { flex: 1 },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: 20,
    maxHeight: '65%',
    ...Shadow.lg,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: Colors.textDark, marginBottom: 12 },
  optionList: { marginBottom: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  optionText: { fontSize: 14, color: Colors.textDark },
  optionKcal: { fontSize: 12, color: Colors.textLight, fontWeight: '600' },
  noFoods: { fontSize: 13, color: Colors.textLight, textAlign: 'center', paddingVertical: 16 },
  aiRow: {
    marginTop: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.background,
  },
  aiLabel: { fontSize: 13, fontWeight: '700', color: Colors.secondary, marginBottom: 8 },
  aiInputRow: { flexDirection: 'row', gap: 8 },
  aiInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: Colors.textDark,
  },
  aiBtn: {
    backgroundColor: Colors.secondary,
    borderRadius: Radius.sm,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiBtnText: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  aiError: { fontSize: 12, color: Colors.primary, marginTop: 6 },
});
