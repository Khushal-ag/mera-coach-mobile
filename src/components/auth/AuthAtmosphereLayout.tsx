import React, { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AUTH_BG_ASPECT, AUTH_PHOTO_BAND, BrandImages } from '../../constants/images';

type AuthAtmosphereLayoutProps = {
  children: ReactNode;
  /**
   * Let the content scroll when it is taller than the screen (long forms, error banners, the keyboard).
   * The content may run over the top of the photo, so on a short phone everything, including the link at
   * the bottom, is visible without scrolling. Scrolling is only the fallback.
   */
  scrollable?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

function authCoverMetrics(screenW: number, screenH: number) {
  const coverHeight = Math.max(screenH, screenW / AUTH_BG_ASPECT);
  const coverWidth = coverHeight * AUTH_BG_ASPECT;
  const photoClearance = Math.round(coverHeight * AUTH_PHOTO_BAND);
  return {
    coverWidth,
    coverHeight,
    photoClearance,
    offsetX: (screenW - coverWidth) / 2,
    offsetY: screenH - coverHeight,
  };
}

export default function AuthAtmosphereLayout({
  children,
  scrollable = false,
  contentContainerStyle,
}: AuthAtmosphereLayoutProps) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const { coverWidth, coverHeight, photoClearance, offsetX, offsetY } = useMemo(
    () => authCoverMetrics(screenW, screenH),
    [screenW, screenH],
  );
  const overlapsPhoto = scrollable && contentHeight > screenH - photoClearance;
  const atmosphereStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      width: coverWidth,
      height: coverHeight,
      left: offsetX,
      top: offsetY,
      // When the form runs over the photo (a short phone), the photo is faded so form text stays readable.
      opacity: overlapsPhoto ? 0.18 : 1,
    }),
    [coverWidth, coverHeight, offsetX, offsetY, overlapsPhoto],
  );

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
    <View style={styles.root}>
      <View pointerEvents="none" style={styles.atmosphereLayer}>
        <Image
          source={BrandImages.loginAtmosphere}
          style={atmosphereStyle}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      </View>

      <KeyboardAvoidingView
        style={styles.body}
        enabled={keyboardOpen}
        behavior={keyboardOpen && Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scrollable ? (
          // No space is reserved for the photo here: reserving it clipped the form on shorter phones and
          // hid the bottom link until the visitor scrolled. The photo is decorative and sits behind.
          <View style={styles.scrollArea}>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: styles.scrollContent.paddingBottom + insets.bottom },
                contentContainerStyle,
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {/* The scroll content stretches to the screen, so the form's own height is measured here. */}
              <View
                style={styles.measure}
                onLayout={e => setContentHeight(e.nativeEvent.layout.height)}
              >
                {children}
              </View>
            </ScrollView>
          </View>
        ) : (
          <View style={[styles.content, { paddingBottom: photoClearance }, contentContainerStyle]}>
            {children}
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  atmosphereLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
  },
  body: {
    flex: 1,
    zIndex: 1,
  },
  scrollArea: { flex: 1, width: '100%' },
  measure: { width: '100%', alignItems: 'center' },
  scroll: { flex: 1, width: '100%' },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: 'transparent',
    paddingBottom: 16,
  },
  content: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: 'transparent',
  },
});
