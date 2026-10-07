import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, IconSize, Radius, Spacing } from '../constants/theme';
import type { IoniconName } from '../types/icons';

interface SectionTagProps {
  icon: IoniconName;
  label: string;
  style?: StyleProp<ViewStyle>;
  color?: string;
}

export default function SectionTag({
  icon,
  label,
  style,
  color = Colors.accentInk,
}: SectionTagProps) {
  return (
    <View style={[styles.tag, style]}>
      <Ionicons name={icon} size={IconSize.sm} color={color} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    marginBottom: 6,
  },
  label: {
    color: Colors.accentInk,
    fontSize: 11,
    fontFamily: FontFamily.bold,
  },
});
