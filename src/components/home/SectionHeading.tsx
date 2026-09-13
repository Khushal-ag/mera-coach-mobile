import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily } from '../../constants/theme';

type Props = {
  title: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  style?: StyleProp<ViewStyle>;
};

/** Centered italic section label with optional flanking icons (HomeExplore language). */
export default function SectionHeading({ title, icon, style }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      {icon ? <Ionicons name={icon} size={13} color={Colors.secondary} /> : null}
      <Text style={styles.title}>{title}</Text>
      {icon ? <Ionicons name={icon} size={13} color={Colors.secondary} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
  },
  title: {
    fontFamily: FontFamily.displayItalic,
    fontSize: 16,
    color: Colors.secondary,
    textAlign: 'center',
  },
});
