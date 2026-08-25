import React from 'react';
import { Text, StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { Colors } from '../constants/theme';

interface FormFieldLabelProps {
  children: string;
  required?: boolean;
  style?: StyleProp<TextStyle>;
}

export default function FormFieldLabel({ children, required, style }: FormFieldLabelProps) {
  return (
    <Text style={[styles.label, style]}>
      {children}
      {required ? <Text style={styles.required}> *</Text> : null}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: Colors.textDark, marginBottom: 6 },
  required: { color: Colors.destructive, fontWeight: '700' },
});
