import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BrandLogo from '../../components/BrandLogo';
import HomeExplorePage from './HomeExplorePage';
import { BrandImages, HOME_HERO_ASPECT, LOGO_ASPECT } from '../../constants/images';
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

const HOME_LOGO_WIDTH_FRAC = 0.48;

function MarketingPage({
  width,
  height,
  navigation,
  onGoExplore,
}: {
  width: number;
  height: number;
  navigation: RootScreenProps<'Home'>['navigation'];
  onGoExplore: () => void;
}) {
  const insets = useSafeAreaInsets();
  const signedIn = useAuthState() === 'signedIn';
  const homeLogoSize = (width * HOME_LOGO_WIDTH_FRAC) / LOGO_ASPECT.full;
  const naturalHeroHeight = width / HOME_HERO_ASPECT;
  const heroFit = naturalHeroHeight > height ? height / naturalHeroHeight : 1;
  const heroWidth = width * heroFit;
  const heroHeight = naturalHeroHeight * heroFit;

  const onGetStarted = () => {
    if (signedIn) {
      navigation.navigate('Main');
      return;
    }
    navigation.navigate('Register');
  };

  return (
    <View style={[styles.marketingPage, { width, height }]}>
      <Image
        source={BrandImages.homeHero}
        style={{
          position: 'absolute',
          left: (width - heroWidth) / 2,
          top: height - heroHeight,
          width: heroWidth,
          height: heroHeight,
        }}
        resizeMode="stretch"
        accessibilityIgnoresInvertColors
      />

      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onGoExplore}
        accessibilityRole="button"
        accessibilityLabel="Explore home"
      />

      <View pointerEvents="none" style={[styles.topBrand, { paddingTop: insets.top + Spacing.sm }]}>
        <BrandLogo size={homeLogoSize} />
      </View>

      <View
        pointerEvents="box-none"
        style={[
          styles.bottomBlock,
          { paddingBottom: Math.max(insets.bottom, Spacing.sm) + Spacing.md },
        ]}
      >
        <View pointerEvents="none" style={styles.headline}>
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

export default function HomeScreen({ navigation, route }: RootScreenProps<'Home'>) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const pagerRef = useRef<ScrollView>(null);

  const scrollToPage = useCallback(
    (index: number, animated = true) => {
      const next = Math.max(0, Math.min(1, index));
      pagerRef.current?.scrollTo({ x: screenW * next, animated });
    },
    [screenW],
  );

  useEffect(() => {
    const page = route.params?.page;
    if (page == null) return;
    scrollToPage(page, false);
    navigation.setParams({ page: undefined });
  }, [navigation, route.params?.page, scrollToPage]);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        style={styles.pager}
      >
        <MarketingPage
          width={screenW}
          height={screenH}
          navigation={navigation}
          onGoExplore={() => scrollToPage(1, true)}
        />
        <HomeExplorePage
          width={screenW}
          height={screenH}
          navigation={navigation}
          onGoHome={() => scrollToPage(0, true)}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.homeCanvas,
  },
  pager: {
    flex: 1,
  },
  marketingPage: {
    backgroundColor: Colors.homeCanvas,
    overflow: 'hidden',
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
    fontFamily: headingFont.bold,
    fontSize: 22,
    lineHeight: 28,
    color: Colors.white,
  },
  lineOrange: {
    fontFamily: headingFont.bold,
    fontSize: 22,
    lineHeight: 28,
    color: Colors.brandCoach,
  },
  brandLine: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    maxWidth: '100%',
  },
  mera: {
    fontFamily: headingFont.bold,
    fontSize: 22,
    lineHeight: 28,
    color: Colors.white,
  },
  coachWrap: {
    alignItems: 'flex-start',
    flexShrink: 1,
  },
  coach: {
    fontFamily: headingFont.bold,
    fontSize: 22,
    lineHeight: 28,
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
    flexShrink: 0,
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
    minWidth: 0,
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
    minWidth: 0,
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
    flexShrink: 0,
  },
});
