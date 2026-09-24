import React, { useState } from 'react';
import { Image, View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Colors } from '../constants/theme';
import { BrandImages } from '../constants/images';
import { resolveMediaUrl } from '../utils/mediaUrl';

interface PersonAvatarProps {
  uri?: string | null;
  size?: number;
  /**
   * Corner radius. Defaults to a circle (`size / 2`).
   * Ignored when `fillHeight` (card clips the photo).
   */
  borderRadius?: number;
  /**
   * Stretch to the full height of the list card; `size` is used as width only.
   */
  fillHeight?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function PersonAvatar({
  uri,
  size = 44,
  borderRadius,
  fillHeight = false,
  style,
}: PersonAvatarProps) {
  const radius = fillHeight ? 0 : (borderRadius ?? size / 2);
  const resolved = resolveMediaUrl(uri);
  const [failed, setFailed] = useState(false);
  const [trackedUri, setTrackedUri] = useState(uri);

  if (uri !== trackedUri) {
    setTrackedUri(uri);
    setFailed(false);
  }

  const showRemote = Boolean(resolved) && !failed;

  return (
    <View
      style={[
        styles.wrap,
        fillHeight
          ? {
              width: size,
              alignSelf: 'stretch',
              borderRadius: 0,
              backgroundColor: Colors.backgroundTan,
            }
          : {
              width: size,
              height: size,
              borderRadius: radius,
              backgroundColor: Colors.backgroundTan,
            },
        style,
      ]}
    >
      <Image
        source={showRemote ? { uri: resolved } : BrandImages.avatarDefault}
        style={fillHeight ? StyleSheet.absoluteFill : { width: size, height: size }}
        resizeMode="cover"
        onError={() => setFailed(true)}
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
