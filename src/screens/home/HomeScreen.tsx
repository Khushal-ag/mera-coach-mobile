import React, { useMemo } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BrandLogo from '../../components/BrandLogo';
import {
  BrandImages,
  HOME_HERO_ASPECT,
  HOME_HERO_HEIGHT,
  HOME_RUNNER_HEAD_TOP,
  LOGO_ASPECT,
} from '../../constants/images';
import {
  Colors,
  FontFamily,
  IconSize,
  PressOpacity,
  Radius,
  Spacing,
  headingFont,
} from '../../constants/theme';
import { useAuthState } from '../../auth/useAuthState';
import type { RootScreenProps } from '../../types/navigation';

const HOME_LOGO_WIDTH_FRAC = 0.6;
const HOME_LOGO_HEAD_GAP = 6;

function coverTopBiasLayout(screenW: number, screenH: number, imageAspect: number) {
  const screenAspect = screenW / screenH;
  if (screenAspect > imageAspect) {
    const width = screenW;
    const height = screenW / imageAspect;
    return { width, height, left: 0, top: (screenH - height) * 0.2 };
  }
  const height = screenH;
  const width = screenH * imageAspect;
  return { width, height, left: (screenW - width) / 2, top: 0 };
}

export default function HomeScreen({ navigation }: RootScreenProps<'Home'>) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const signedIn = useAuthState() === 'signedIn';
  const layout = useMemo(
    () => coverTopBiasLayout(screenW, screenH, HOME_HERO_ASPECT),
    [screenW, screenH],
  );

  const targetLogoHeight = (screenW * HOME_LOGO_WIDTH_FRAC) / LOGO_ASPECT.full;
  const headY =
    layout.top + (HOME_RUNNER_HEAD_TOP / HOME_HERO_HEIGHT) * layout.height;
  const maxLogoHeight = Math.max(
    120,
    headY - (insets.top + Spacing.xxs) - HOME_LOGO_HEAD_GAP,
  );
  const homeLogoSize = Math.min(targetLogoHeight, maxLogoHeight);

  const onGetStarted = () => {
    if (signedIn) {
      navigation.navigate('Main');
      return;
    }
    navigation.navigate('Register');
  };

  return (
    <View style={styles.container}>
      <Image
        source={BrandImages.homeHero}
        style={[styles.hero, layout]}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />

      <View style={[styles.topBrand, { paddingTop: insets.top + Spacing.xxs }]}>
        <BrandLogo size={homeLogoSize} />
      </View>

      <View
        style={[
          styles.bottomBlock,
          { paddingBottom: Math.max(insets.bottom, Spacing.sm) + Spacing.md },
        ]}
      >
        <View style={styles.headline}>
          <Text style={styles.lineWhite}>Grow Your</Text>
          <Text style={styles.lineOrange}>Coaching</Text>
          <Text style={styles.lineWhite}>Business with</Text>
          <View style={styles.brandLine}>
            <Text style={styles.mera}>mera</Text>
            <View style={styles.coachWrap}>
              <Text style={styles.coach}> coach</Text>
              <View style={styles.coachUnderline} />
            </View>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.ctaPrimary, pressed && styles.ctaPressed]}
          onPress={onGetStarted}
          accessibilityRole="button"
          accessibilityLabel={signedIn ? 'Go to Dashboard' : 'Get Started as a coach'}
        >
          <View style={styles.leadingIconCircle}>
            <Ionicons name="person" size={IconSize.md} color={Colors.white} />
          </View>
          <View style={styles.ctaDivider} />
          <View style={styles.ctaLabelStack}>
            <Text style={styles.ctaPrimaryTitle}>Get Started</Text>
            <Text style={styles.ctaPrimarySub}>as a coach</Text>
          </View>
          <View style={styles.arrowCircle}>
            <Ionicons name="arrow-forward" size={IconSize.sm} color={Colors.brandCoach} />
          </View>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.ctaSecondary, pressed && styles.ctaPressed]}
          onPress={() => navigation.navigate('CoachList')}
          accessibilityRole="button"
          accessibilityLabel="Find a Coach"
        >
          <Ionicons name="search" size={IconSize.lg} color={Colors.white} />
          <View style={[styles.ctaDivider, styles.ctaDividerMuted]} />
          <Text style={styles.ctaSecondaryLabel}>Find a Coach</Text>
          <View style={styles.arrowCircle}>
            <Ionicons name="arrow-forward" size={IconSize.sm} color={Colors.secondary} />
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.homeCanvas,
    overflow: 'hidden',
  },
  hero: {
    position: 'absolute',
  },
  topBrand: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  bottomBlock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  headline: {
    marginBottom: Spacing.sm,
  },
  lineWhite: {
    fontFamily: headingFont.extraBold,
    fontSize: 34,
    lineHeight: 38,
    color: Colors.white,
  },
  lineOrange: {
    fontFamily: headingFont.extraBold,
    fontSize: 34,
    lineHeight: 38,
    color: Colors.brandCoach,
  },
  brandLine: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  mera: {
    fontFamily: headingFont.extraBold,
    fontSize: 34,
    lineHeight: 38,
    color: Colors.white,
  },
  coachWrap: {
    alignItems: 'flex-start',
  },
  coach: {
    fontFamily: headingFont.extraBold,
    fontSize: 34,
    lineHeight: 38,
    color: Colors.brandCoach,
  },
  coachUnderline: {
    alignSelf: 'stretch',
    height: 4,
    borderRadius: 3,
    backgroundColor: Colors.brandCoach,
    marginTop: 1,
    marginLeft: Spacing.xs,
    transform: [{ rotate: '-2deg' }],
  },
  ctaPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    borderRadius: Radius.pill,
    backgroundColor: Colors.brandCoach,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  ctaSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.white,
    backgroundColor: 'transparent',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  ctaPressed: {
    opacity: PressOpacity.default,
  },
  leadingIconCircle: {
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDivider: {
    width: StyleSheet.hairlineWidth * 2,
    alignSelf: 'stretch',
    marginVertical: Spacing.sm,
    backgroundColor: Colors.onDarkBorderStrong,
  },
  ctaDividerMuted: {
    backgroundColor: Colors.onDarkBorderMid,
  },
  ctaLabelStack: {
    flex: 1,
  },
  ctaPrimaryTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.white,
    lineHeight: 20,
  },
  ctaPrimarySub: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.onDarkNearWhite,
    lineHeight: 16,
  },
  ctaSecondaryLabel: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.white,
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
