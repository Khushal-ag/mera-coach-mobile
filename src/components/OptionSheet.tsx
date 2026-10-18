import React from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, IconSize, PressOpacity, ScreenPad, Spacing, Typography } from '../constants/theme';

export interface SheetOption {
  code: string;
  label: string;
  /** Small second line, for example the product category. */
  hint?: string;
}

interface OptionSheetProps {
  visible: boolean;
  title: string;
  options: SheetOption[];
  selectedCode?: string;
  emptyMessage?: string;
  onSelect: (option: SheetOption) => void;
  onClose: () => void;
}

/** Bottom sheet list used for master pickers (brand, product, client). */
export default function OptionSheet({
  visible,
  title,
  options,
  selectedCode,
  emptyMessage = 'Nothing to choose from yet.',
  onSelect,
  onClose,
}: OptionSheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            activeOpacity={PressOpacity.default}
          >
            <Ionicons name="close-outline" size={IconSize.lg} color={Colors.textDark} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={options}
          keyExtractor={item => item.code || '__all__'}
          ListEmptyComponent={<Text style={styles.empty}>{emptyMessage}</Text>}
          renderItem={({ item }) => {
            const selected = item.code === selectedCode;
            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => onSelect(item)}
                activeOpacity={PressOpacity.default}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, selected && styles.rowLabelSelected]}>
                    {item.label}
                  </Text>
                  {item.hint ? <Text style={styles.rowHint}>{item.hint}</Text> : null}
                </View>
                {selected ? (
                  <Ionicons name="checkmark" size={IconSize.md} color={Colors.secondary} />
                ) : null}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    maxHeight: '65%',
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: ScreenPad.horizontal,
    paddingTop: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  title: { ...Typography.headline },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  rowText: { flex: 1, paddingVertical: Spacing.xs },
  rowLabel: { ...Typography.body },
  rowHint: { ...Typography.label, color: Colors.textLight, marginTop: 2 },
  rowLabelSelected: { ...Typography.bodyStrong, color: Colors.secondary },
  empty: { ...Typography.body, color: Colors.textLight, paddingVertical: Spacing.lg },
});
