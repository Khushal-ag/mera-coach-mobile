import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, headingFont } from '../../constants/theme';

type Props = {
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/** Lightweight BMI gauge + leaves for explore / public BMI screens (no asset dependency). */
export default function BmiGaugeArt({ size = 96, style }: Props) {
  const dial = size * 0.72;
  const needleLen = dial * 0.38;

  return (
    <View style={[styles.wrap, { width: size, height: size }, style]} accessibilityElementsHidden>
      <Ionicons
        name="leaf"
        size={size * 0.28}
        color={Colors.secondaryLight}
        style={[styles.leaf, styles.leafLeft]}
      />
      <Ionicons
        name="leaf"
        size={size * 0.32}
        color={Colors.secondary}
        style={[styles.leaf, styles.leafRight]}
      />
      <View style={[styles.glow, { width: dial * 1.15, height: dial * 1.15 }]} />
      <View
        style={[
          styles.dial,
          {
            width: dial,
            height: dial / 2,
            borderTopLeftRadius: dial / 2,
            borderTopRightRadius: dial / 2,
          },
        ]}
      >
        <View style={[styles.seg, styles.segOrange, { width: dial }]} />
        <View style={[styles.seg, styles.segYellow, { width: dial * 0.7 }]} />
        <View style={[styles.seg, styles.segGreen, { width: dial * 0.42 }]} />
        <View
          style={[
            styles.needle,
            {
              width: 2,
              height: needleLen,
              bottom: 2,
              transform: [{ rotate: '-18deg' }],
            },
          ]}
        />
        <View style={styles.hub} />
      </View>
      <Text style={[styles.label, { fontSize: size * 0.18 }]}>BMI</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaf: {
    position: 'absolute',
    zIndex: 0,
  },
  leafLeft: {
    left: 0,
    bottom: '18%',
    transform: [{ rotate: '-35deg' }],
  },
  leafRight: {
    right: 2,
    bottom: '12%',
    transform: [{ rotate: '40deg' }, { scaleX: -1 }],
  },
  glow: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: Colors.secondaryLight,
    opacity: 0.55,
  },
  dial: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: Colors.primaryLight,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: Colors.secondary,
    zIndex: 1,
  },
  seg: {
    position: 'absolute',
    bottom: 0,
    height: '100%',
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
  },
  segOrange: {
    backgroundColor: 'rgba(244,127,30,0.35)',
  },
  segYellow: {
    backgroundColor: 'rgba(232,163,23,0.45)',
  },
  segGreen: {
    backgroundColor: 'rgba(23,134,118,0.55)',
  },
  needle: {
    position: 'absolute',
    backgroundColor: Colors.textDark,
    borderRadius: 1,
  },
  hub: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textDark,
    marginBottom: 1,
  },
  label: {
    marginTop: 2,
    fontFamily: headingFont.bold,
    color: Colors.secondary,
    zIndex: 2,
  },
});
