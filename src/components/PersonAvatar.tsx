import React from 'react';
import { Image, View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Colors } from '../constants/theme';
import { BrandImages } from '../constants/images';

interface PersonAvatarProps {
  uri?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export default function PersonAvatar({ uri, size = 44, style }: PersonAvatarProps) {
  const radius = size / 2;
  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: radius, backgroundColor: Colors.backgroundTan },
        style,
      ]}
    >
      <Image
        source={uri ? { uri } : BrandImages.avatarDefault}
        style={{ width: size, height: size }}
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
