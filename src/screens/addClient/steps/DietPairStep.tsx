import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { Colors, Radius, Shadow } from '../../../constants/theme';
import FoodItemChip from '../../../components/FoodItemChip';
import { MEAL_SLOTS, FOOD_CATALOG } from '../../../data/dietCatalog';
import type { ClientProfile, DietItem } from '../../../types/models';
import type { StepProps } from '../../../types/wizard';

interface DietPairStepProps extends StepProps<ClientProfile> {
  slotIds: string[];
}

export default function DietPairStep({ form, update, slotIds }: DietPairStepProps) {
  const [pickerSlot, setPickerSlot] = useState<string | null>(null);

  const setItems = (slotId: string, newItems: DietItem[]) =>
    update('diet', { ...form.diet, [slotId]: newItems });

  const addItem = (slotId: string, food: { name: string; kcal: number }) => {
    const items = form.diet[slotId] || [];
    setItems(slotId, [...items, { name: food.name, qty: 1, kcal: food.kcal }]);
    setPickerSlot(null);
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

      <Modal
        visible={!!pickerSlot}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerSlot(null)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setPickerSlot(null)}
        >
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.sheetTitle}>Add Food Item</Text>
            <ScrollView style={styles.optionList} showsVerticalScrollIndicator={false}>
              {FOOD_CATALOG.map(food => (
                <TouchableOpacity
                  key={food.name}
                  style={styles.option}
                  onPress={() => pickerSlot && addItem(pickerSlot, food)}
                >
                  <Text style={styles.optionText}>{food.name}</Text>
                  <Text style={styles.optionKcal}>{food.kcal} kcal</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
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
  empty: { fontSize: 13, color: Colors.border, marginBottom: 8, fontStyle: 'italic' },
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
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
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
});
