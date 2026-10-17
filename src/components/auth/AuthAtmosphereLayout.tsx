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
import { AUTH_BG_ASPECT, AUTH_PHOTO_BAND, BrandImages } from '../../constants/images';

type AuthAtmosphereLayoutProps = {
  children: ReactNode;
  /** Scroll the content above the photo band when it is taller than the screen (long forms, error banners). */
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
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const { coverWidth, coverHeight, photoClearance, offsetX, offsetY } = useMemo(
    () => authCoverMetrics(screenW, screenH),
    [screenW, screenH],
  );
  const atmosphereStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      width: coverWidth,
      height: coverHeight,
      left: offsetX,
      top: offsetY,
    }),
    [coverWidth, coverHeight, offsetX, offsetY],
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
          // The photo band is reserved below the scroll area, so a long form (for example with an error banner)
          // scrolls above the photo instead of running over it.
          <View style={[styles.scrollArea, { paddingBottom: photoClearance }]}>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {children}
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
  scroll: { flex: 1, width: '100%' },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: 'transparent',
  },
});
