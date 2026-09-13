import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import BrandLogo from '../../components/BrandLogo';
import BrandWordmark from '../../components/BrandWordmark';
import { Colors, FontFamily, Spacing } from '../../constants/theme';

export default function SplashScreen() {
  const logoOpacity = useMemo(() => new Animated.Value(0), []);
  const logoScale = useMemo(() => new Animated.Value(0.82), []);
  const logoTranslateY = useMemo(() => new Animated.Value(24), []);
  const line1Opacity = useMemo(() => new Animated.Value(0), []);
  const line1TranslateY = useMemo(() => new Animated.Value(18), []);
  const line2Opacity = useMemo(() => new Animated.Value(0), []);
  const line2TranslateY = useMemo(() => new Animated.Value(18), []);
  const pulse = useMemo(() => new Animated.Value(1), []);

  useEffect(() => {
    const intro = Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 70,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.timing(logoTranslateY, {
          toValue: 0,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(line1Opacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(line1TranslateY, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(line2Opacity, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(line2TranslateY, {
          toValue: 0,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]);

    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.03,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    intro.start(({ finished }) => {
      if (finished) breathe.start();
    });

    return () => {
      intro.stop();
      breathe.stop();
    };
  }, [
    line1Opacity,
    line1TranslateY,
    line2Opacity,
    line2TranslateY,
    logoOpacity,
    logoScale,
    logoTranslateY,
    pulse,
  ]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoCard,
          {
            opacity: logoOpacity,
            transform: [
              { scale: Animated.multiply(logoScale, pulse) },
              { translateY: logoTranslateY },
            ],
          },
        ]}
      >
        <BrandLogo variant="mark" size={96} />
      </Animated.View>

      <Animated.Text
        style={[
          styles.line1,
          { opacity: line1Opacity, transform: [{ translateY: line1TranslateY }] },
        ]}
      >
        Grow Your Coaching Business
      </Animated.Text>

      <Animated.View
        style={{
          opacity: line2Opacity,
          transform: [{ translateY: line2TranslateY }],
        }}
      >
        <BrandWordmark prefix="with " tone="onDark" size="md" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  logoCard: {
    marginBottom: Spacing.xl,
  },
  line1: {
    fontFamily: FontFamily.extraBold,
    fontSize: 22,
    color: Colors.white,
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: Spacing.xs,
  },
});
