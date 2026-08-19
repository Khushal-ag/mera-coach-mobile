import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '../constants/theme';
import type { DietItem } from '../types/models';

interface FoodItemChipProps {
  item: DietItem;
  onQtyChange: (qty: number) => void;
  onRemove: () => void;
}

export default function FoodItemChip({ item, onQtyChange, onRemove }: FoodItemChipProps) {
  return (
    <View style={styles.chip}>
      <Text style={styles.name}>{item.name}</Text>
      <TouchableOpacity
        style={styles.stepBtn}
        onPress={() => onQtyChange(Math.max(1, item.qty - 1))}
      >
        <Ionicons name="remove" size={12} color={Colors.white} />
      </TouchableOpacity>
      <Text style={styles.qty}>{item.qty}</Text>
      <TouchableOpacity style={styles.stepBtn} onPress={() => onQtyChange(item.qty + 1)}>
        <Ionicons name="add" size={12} color={Colors.white} />
      </TouchableOpacity>
      <Text style={styles.kcal}>{item.kcal * item.qty} kcal</Text>
      <TouchableOpacity onPress={onRemove}>
        <Ionicons name="close" size={14} color={Colors.textLight} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.background,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  name: { fontSize: 12, color: Colors.textDark, fontWeight: '600', marginRight: 2 },
  stepBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qty: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textDark,
    minWidth: 12,
    textAlign: 'center',
  },
  kcal: { fontSize: 11, color: Colors.textLight, marginLeft: 2 },
});
