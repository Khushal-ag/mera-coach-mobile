import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontFamily,
  HitSlop,
  IconSize,
  PressOpacity,
  Radius,
  Spacing,
  Typography,
} from '../../constants/theme';
import type { DietItem } from '../../types/models';

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
        activeOpacity={PressOpacity.default}
        hitSlop={HitSlop.sm}
        accessibilityRole="button"
        accessibilityLabel="Decrease quantity"
      >
        <Ionicons name="remove" size={IconSize.xs} color={Colors.white} />
      </TouchableOpacity>
      <Text style={styles.qty}>{item.qty}</Text>
      <TouchableOpacity
        style={styles.stepBtn}
        onPress={() => onQtyChange(item.qty + 1)}
        activeOpacity={PressOpacity.default}
        hitSlop={HitSlop.sm}
        accessibilityRole="button"
        accessibilityLabel="Increase quantity"
      >
        <Ionicons name="add" size={IconSize.xs} color={Colors.white} />
      </TouchableOpacity>
      <Text style={styles.kcal}>{item.kcal * item.qty} kcal</Text>
      <TouchableOpacity
        onPress={onRemove}
        activeOpacity={PressOpacity.default}
        hitSlop={HitSlop.sm}
        accessibilityRole="button"
        accessibilityLabel="Remove food"
      >
        <Ionicons name="close" size={IconSize.sm} color={Colors.textLight} />
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm - 2,
    paddingVertical: 6,
    minHeight: 32,
    marginRight: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  name: {
    ...Typography.caption,
    fontFamily: FontFamily.semibold,
    color: Colors.textDark,
    marginRight: 2,
  },
  stepBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qty: {
    ...Typography.caption,
    fontFamily: FontFamily.bold,
    color: Colors.textDark,
    minWidth: 12,
    textAlign: 'center',
  },
  kcal: { ...Typography.micro, marginLeft: 2 },
});
