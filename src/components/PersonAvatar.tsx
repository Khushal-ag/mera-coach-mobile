import React, { useState } from 'react';
import { Image, View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Colors } from '../constants/theme';
import { BrandImages } from '../constants/images';
import { resolveMediaUrl } from '../utils/mediaUrl';

interface PersonAvatarProps {
  uri?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export default function PersonAvatar({ uri, size = 44, style }: PersonAvatarProps) {
  const radius = size / 2;
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
        { width: size, height: size, borderRadius: radius, backgroundColor: Colors.backgroundTan },
        style,
      ]}
    >
      <Image
        source={showRemote ? { uri: resolved } : BrandImages.avatarDefault}
        style={{ width: size, height: size }}
        onError={() => setFailed(true)}
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
