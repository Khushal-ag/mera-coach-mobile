import React, { useMemo, useState } from 'react';
import { Image, Text, View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Colors, headingFont } from '../constants/theme';
import { BrandImages } from '../constants/images';
import { isDegenerateImageSize, resolveMediaUrl } from '../utils/mediaUrl';

interface PersonAvatarProps {
  uri?: string | null;
  /** When set, a missing or unusable photo shows initials instead of the stock silhouette. */
  name?: string | null;
  size?: number;
  width?: number;
  height?: number;
  /** Corner radius. Defaults to a circle (`size / 2`). */
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

function initialsFromName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .map(part => part.replace(/^[^0-9A-Za-z]+|[^0-9A-Za-z]+$/g, ''))
    .filter(Boolean);
  if (!parts.length) return '';
  const first = parts[0].charAt(0);
  const second = parts.length > 1 ? parts[parts.length - 1].charAt(0) : parts[0].charAt(1);
  return `${first}${second}`.toUpperCase();
}

export default function PersonAvatar({
  uri,
  name,
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
  const resolved = resolveMediaUrl(uri);
  const initials = name ? initialsFromName(name) : '';
  const [failed, setFailed] = useState(false);
  const [trackedUri, setTrackedUri] = useState(uri);

  if (uri !== trackedUri) {
    setTrackedUri(uri);
    setFailed(false);
  }

  const showRemote = Boolean(resolved) && !failed;
  const showInitials = !showRemote && initials.length > 0;
  const panelBg = showInitials
    ? Colors.secondary
    : isRoundedSquare
      ? Colors.avatarPlaceholder
      : Colors.backgroundTan;
  const imageSource = useMemo(
    () => (showRemote && resolved ? { uri: resolved } : BrandImages.avatarDefault),
    [showRemote, resolved],
  );
  const imageStyle = useMemo(() => ({ width: w, height: h }), [w, h]);
  const wrapSizeStyle = useMemo(
    () => ({ width: w, height: h, borderRadius: radius, backgroundColor: panelBg }),
    [w, h, radius, panelBg],
  );
  const initialsStyle = useMemo(
    () => ({
      color: Colors.white,
      fontFamily: headingFont.extraBold,
      fontSize: Math.round(Math.min(w, h) * 0.34),
    }),
    [w, h],
  );

  const markUnusable = () => setFailed(true);

  return (
    <View
      style={[styles.wrap, wrapSizeStyle, style]}
      accessibilityRole="image"
      accessibilityLabel={name?.trim() || undefined}
    >
      {showRemote ? (
        <Image
          source={imageSource}
          style={imageStyle}
          resizeMode="cover"
          onError={markUnusable}
          onLoad={e => {
            const { width: sourceWidth, height: sourceHeight } = e.nativeEvent.source;
            // A 1×1 upload decodes, then cover-resize paints it as a solid circle.
            if (isDegenerateImageSize(sourceWidth, sourceHeight)) markUnusable();
          }}
          accessibilityIgnoresInvertColors
        />
      ) : null}
      {showInitials ? <Text style={initialsStyle}>{initials}</Text> : null}
      {!showRemote && !showInitials ? (
        <Image
          source={BrandImages.avatarDefault}
          style={imageStyle}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
