import React from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { sanitizePhoneInput } from '../utils/validation';

type PhoneTextInputProps = Omit<TextInputProps, 'keyboardType' | 'onChangeText'> & {
  value: string;
  onChangeText: (value: string) => void;
};

/** Digits-only phone input — skips no-op updates to avoid TextInput flicker. */
export default function PhoneTextInput({ value, onChangeText, ...rest }: PhoneTextInputProps) {
  const handleChange = (text: string) => {
    const next = sanitizePhoneInput(text);
    if (next !== value) onChangeText(next);
  };

  return (
    <TextInput
      value={value}
      onChangeText={handleChange}
      keyboardType="number-pad"
      inputMode="numeric"
      autoComplete="tel"
      textContentType="telephoneNumber"
      {...rest}
    />
  );
}
