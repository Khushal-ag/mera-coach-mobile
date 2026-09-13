import React from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
  type TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, IconSize, formFieldStyles } from '../constants/theme';

interface SearchFieldProps extends Omit<TextInputProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

/** Shared search chrome for list screens (clients, checkups, leads). */
export default function SearchField({
  style,
  inputStyle,
  placeholder = 'Search...',
  placeholderTextColor = Colors.textLight,
  ...rest
}: SearchFieldProps) {
  return (
    <View style={[styles.wrap, style]}>
      <Ionicons
        name="search-outline"
        size={IconSize.md}
        color={Colors.textLight}
        style={styles.icon}
      />
      <TextInput
        style={[styles.input, inputStyle]}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        returnKeyType="search"
        clearButtonMode="while-editing"
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: formFieldStyles.searchWrap,
  icon: { marginRight: 8 },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.textDark,
    paddingVertical: 0,
  },
});
