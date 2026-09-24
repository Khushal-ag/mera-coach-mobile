import React, { useState } from 'react';
import { Image, View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Colors } from '../constants/theme';
import { BrandImages } from '../constants/images';
import { resolveMediaUrl } from '../utils/mediaUrl';

interface PersonAvatarProps {
  uri?: string | null;
  size?: number;
  width?: number;
  height?: number;
  /** Corner radius. Defaults to a circle (`size / 2`). */
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export default function PersonAvatar({
  uri,
  size = 44,
  width,
  height,
  borderRadius,
  style,
}: PersonAvatarProps) {
  const w = width ?? size;
  const h = height ?? size;
  const radius = borderRadius ?? Math.min(w, h) / 2;
  const isRoundedSquare = borderRadius != null;
  const panelBg = isRoundedSquare ? Colors.avatarPlaceholder : Colors.backgroundTan;
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
        {
          width: w,
          height: h,
          borderRadius: radius,
          backgroundColor: panelBg,
        },
        style,
      ]}
    >
      <Image
        source={showRemote ? { uri: resolved } : BrandImages.avatarDefault}
        style={{ width: w, height: h }}
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
