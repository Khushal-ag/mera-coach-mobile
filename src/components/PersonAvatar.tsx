import React, { useMemo, useState } from 'react';
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
  const imageSource = useMemo(
    () => (showRemote && resolved ? { uri: resolved } : BrandImages.avatarDefault),
    [showRemote, resolved],
  );
  const imageStyle = useMemo(() => ({ width: w, height: h }), [w, h]);
  const wrapSizeStyle = useMemo(
    () => ({ width: w, height: h, borderRadius: radius, backgroundColor: panelBg }),
    [w, h, radius, panelBg],
  );

  return (
    <View style={[styles.wrap, wrapSizeStyle, style]}>
      <Image
        source={imageSource}
        style={imageStyle}
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
