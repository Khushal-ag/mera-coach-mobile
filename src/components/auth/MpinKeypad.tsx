import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontFamily,
  IconSize,
  PressOpacity,
  Radius,
  Spacing,
  TouchTarget,
} from '../../constants/theme';
import { MPIN_LENGTH } from '../../utils/mpinCrypto';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'] as const;

interface MpinKeypadProps {
  value: string;
  onChange: (next: string) => void;
  /** Fires once when length reaches 4 (caller should clear or advance). */
  onComplete?: (mpin: string) => void;
  disabled?: boolean;
  error?: string | null;
  style?: ViewStyle;
}

export default function MpinKeypad({
  value,
  onChange,
  onComplete,
  disabled = false,
  error,
  style,
}: MpinKeypadProps) {
  const completingRef = useRef(false);

  useEffect(() => {
    if (value.length !== MPIN_LENGTH || !onComplete || completingRef.current) return;
    completingRef.current = true;
    onComplete(value);
  }, [value, onComplete]);

  useEffect(() => {
    if (value.length < MPIN_LENGTH) completingRef.current = false;
  }, [value]);

  const pressKey = (key: string) => {
    if (disabled || !key) return;
    if (key === '⌫') {
      onChange(value.slice(0, -1));
      return;
    }
    if (value.length >= MPIN_LENGTH) return;
    onChange(value + key);
  };

  return (
    <View style={style}>
      <View
        style={styles.dots}
        accessibilityLabel={`MPIN entered ${value.length} of ${MPIN_LENGTH}`}
      >
        {Array.from({ length: MPIN_LENGTH }, (_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < value.length && styles.dotFilled,
              error ? styles.dotError : null,
            ]}
          />
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : <View style={styles.errorSpacer} />}

      <View style={styles.pad}>
        {KEYS.map((key, index) => {
          if (!key) {
            return <View key={`empty-${index}`} style={styles.keySlot} />;
          }
          const isBackspace = key === '⌫';
          return (
            <View key={key} style={styles.keySlot}>
              <TouchableOpacity
                style={styles.key}
                onPress={() => pressKey(key)}
                disabled={disabled}
                activeOpacity={PressOpacity.default}
                accessibilityRole="button"
                accessibilityLabel={isBackspace ? 'Delete' : key}
              >
                {isBackspace ? (
                  <Ionicons name="close" size={IconSize.xl} color={Colors.secondary} />
                ) : (
                  <Text style={styles.keyLabel}>{key}</Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.secondary,
    backgroundColor: Colors.white,
  },
  dotFilled: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  dotError: {
    borderColor: Colors.destructive,
  },
  error: {
    minHeight: 20,
    textAlign: 'center',
    fontSize: 13,
    fontFamily: FontFamily.medium,
    color: Colors.destructive,
    marginBottom: Spacing.md,
  },
  errorSpacer: { height: 20 + Spacing.md },
  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 300,
    backgroundColor: Colors.secondaryLight,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.sm,
  },
  keySlot: {
    width: '30%',
    maxWidth: 84,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  key: {
    width: 52,
    height: 52,
    borderRadius: Radius.pill,
    backgroundColor: Colors.onDarkWash,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: TouchTarget.min,
  },
  keyLabel: {
    fontSize: 22,
    fontFamily: FontFamily.semibold,
    color: Colors.secondary,
  },
});
