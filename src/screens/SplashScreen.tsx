import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import BrandLogo from '../components/BrandLogo';
import { Colors, FontFamily, Spacing } from '../constants/theme';

export default function SplashScreen() {
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [scaleAnim] = useState(() => new Animated.Value(0.8));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
      >
        <BrandLogo size={96} variant="onDark" style={styles.logo} />
        <Text style={styles.title}>Mera Coach</Text>
        <Text style={styles.subtitle}>Health & wellness coaching</Text>
      </Animated.View>
      <Animated.Text style={[styles.tagline, { opacity: fadeAnim }]}>
        Health & wellness coaching
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { alignItems: 'center' },
  logo: { marginBottom: Spacing.lg },
  title: {
    fontFamily: FontFamily.extraBold,
    fontSize: 36,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 14,
    color: Colors.onDarkMuted,
    marginTop: 4,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  tagline: {
    position: 'absolute',
    bottom: 50,
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
  },
});
