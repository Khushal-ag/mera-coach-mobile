import React, { useEffect, useMemo } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Animated,
  Easing,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BrandLogo from '../../components/BrandLogo';
import {
  BrandImages,
  HOME_HERO_ASPECT,
  HOME_HERO_HEIGHT,
  HOME_RUNNER_HEAD_TOP,
  LOGO_ASPECT,
} from '../../constants/images';
import { Colors, Spacing } from '../../constants/theme';

const SPLASH_LOGO_WIDTH_FRAC = 0.58;
const SPLASH_LOGO_HEAD_GAP = 8;

function coverBottomLayout(screenW: number, screenH: number, imageAspect: number) {
  const screenAspect = screenW / screenH;
  if (screenAspect > imageAspect) {
    const width = screenW;
    const height = screenW / imageAspect;
    return { width, height, left: 0, top: screenH - height };
  }
  const height = screenH;
  const width = screenH * imageAspect;
  return { width, height, left: (screenW - width) / 2, top: 0 };
}

export default function SplashScreen() {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const layout = useMemo(
    () => coverBottomLayout(screenW, screenH, HOME_HERO_ASPECT),
    [screenW, screenH],
  );

  const targetLogoHeight = (screenW * SPLASH_LOGO_WIDTH_FRAC) / LOGO_ASPECT.full;
  const headY =
    layout.top + (HOME_RUNNER_HEAD_TOP / HOME_HERO_HEIGHT) * layout.height;
  const maxLogoHeight = Math.max(
    100,
    headY - (insets.top + Spacing.xxs) - SPLASH_LOGO_HEAD_GAP,
  );
  const logoSize = Math.min(targetLogoHeight, maxLogoHeight);

  const contentOpacity = useMemo(() => new Animated.Value(0), []);
  const contentScale = useMemo(() => new Animated.Value(0.94), []);
  const loaderOpacity = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    const intro = Animated.sequence([
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 520,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(contentScale, {
          toValue: 1,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(loaderOpacity, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    intro.start();
    return () => intro.stop();
  }, [contentOpacity, contentScale, loaderOpacity]);

  return (
    <View style={styles.container}>
      <Image
        source={BrandImages.homeHero}
        style={[styles.hero, layout]}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
      <View style={styles.scrim} />

      <Animated.View
        style={[
          styles.brand,
          {
            paddingTop: insets.top + Spacing.xxs,
            opacity: contentOpacity,
            transform: [{ scale: contentScale }],
          },
        ]}
      >
        <BrandLogo size={logoSize} />
      </Animated.View>

      <Animated.View style={[styles.loader, { opacity: loaderOpacity }]}>
        <ActivityIndicator size="small" color={Colors.onDarkBright} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.splashCanvas,
    overflow: 'hidden',
  },
  hero: {
    position: 'absolute',
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(3, 66, 47, 0.28)',
  },
  brand: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    zIndex: 1,
  },
  loader: {
    position: 'absolute',
    bottom: Spacing.xxxl + Spacing.lg,
    alignSelf: 'center',
    zIndex: 1,
  },
});
