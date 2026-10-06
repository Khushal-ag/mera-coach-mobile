import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, IconSize, PressOpacity, Radius, Spacing } from '../../constants/theme';
import { MPIN_LENGTH } from '../../utils/mpinCrypto';

const KEY_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
] as const;

const PAD_PADDING = 12;
const KEY_GAP = 8;
const KEY_ASPECT = 70 / 44;
const PAD_RADIUS = 20;

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
        {KEY_ROWS.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {row.map((key, colIndex) => {
              if (!key) {
                return <View key={`empty-${rowIndex}-${colIndex}`} style={styles.keySlot} />;
              }
              const isBackspace = key === '⌫';
              return (
                <TouchableOpacity
                  key={key}
                  style={styles.key}
                  onPress={() => pressKey(key)}
                  disabled={disabled}
                  activeOpacity={PressOpacity.default}
                  accessibilityRole="button"
                  accessibilityLabel={isBackspace ? 'Delete' : key}
                >
                  {isBackspace ? (
                    <Ionicons name="close-outline" size={IconSize.xl} color={Colors.secondary} />
                  ) : (
                    <Text style={styles.keyLabel}>{key}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
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
    alignSelf: 'stretch',
    maxWidth: '100%',
    backgroundColor: Colors.mpinPadBg,
    borderRadius: PAD_RADIUS,
    borderWidth: 1,
    borderColor: Colors.mpinPadBorder,
    padding: PAD_PADDING,
    gap: KEY_GAP,
  },
  row: {
    flexDirection: 'row',
    gap: KEY_GAP,
    maxWidth: '100%',
  },
  keySlot: {
    flex: 1,
    minWidth: 0,
    aspectRatio: KEY_ASPECT,
  },
  key: {
    flex: 1,
    minWidth: 0,
    aspectRatio: KEY_ASPECT,
    borderRadius: Radius.pill,
    backgroundColor: Colors.mpinKeyBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyLabel: {
    fontSize: 22,
    fontFamily: FontFamily.semibold,
    color: Colors.secondary,
  },
});
