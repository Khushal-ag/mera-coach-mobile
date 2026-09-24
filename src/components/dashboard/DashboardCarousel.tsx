import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ImageBackground,
  StyleSheet,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import {
  Colors,
  FontFamily,
  Radius,
  Shadow,
  Spacing,
  headingFont,
} from '../../constants/theme';
import { BrandImages } from '../../constants/images';

interface CarouselSlide {
  image: (typeof BrandImages)[keyof typeof BrandImages];
  headline: string;
  subline: string;
}

const SLIDE_WIDTH = Dimensions.get('window').width - Spacing.md * 2;
const SLIDE_HEIGHT = 188;
const SNAP = SLIDE_WIDTH + Spacing.sm;
const AUTO_ADVANCE_MS = 5200;

const SLIDES: CarouselSlide[] = [
  {
    image: BrandImages.dashboardSlide1,
    headline: 'Keep clients on track',
    subline: 'BMI, goals, and the next check-up.',
  },
  {
    image: BrandImages.dashboardSlide2,
    headline: 'Fuel their training',
    subline: 'Meal plans that match every assessment.',
  },
  {
    image: BrandImages.dashboardSlide3,
    headline: 'Follow up on leads',
    subline: 'Reach enquiries before they go cold.',
  },
];

export default function DashboardCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const indexRef = useRef(0);
  const userScrolling = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      if (userScrolling.current) return;
      const next = (indexRef.current + 1) % SLIDES.length;
      indexRef.current = next;
      setActiveIndex(next);
      scrollRef.current?.scrollTo({ x: next * SNAP, animated: true });
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, []);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / SNAP);
    if (index !== activeIndex && index >= 0 && index < SLIDES.length) {
      indexRef.current = index;
      setActiveIndex(index);
    }
  };

  return (
    <View style={styles.wrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled={false}
        decelerationRate="fast"
        snapToInterval={SNAP}
        snapToAlignment="start"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => {
          userScrolling.current = true;
        }}
        onMomentumScrollEnd={() => {
          userScrolling.current = false;
        }}
      >
        {SLIDES.map(slide => (
          <View key={slide.headline} style={styles.slide}>
            <ImageBackground
              source={slide.image}
              style={styles.image}
              imageStyle={styles.imageRadius}
              resizeMode="cover"
            >
              <View style={styles.scrim}>
                <Text style={styles.headline}>{slide.headline}</Text>
                <Text style={styles.subline}>{slide.subline}</Text>
              </View>
            </ImageBackground>
          </View>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {SLIDES.map((slide, i) => (
          <View key={slide.headline} style={[styles.dot, i === activeIndex && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: Spacing.xs },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  slide: {
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadow.md,
  },
  image: { flex: 1 },
  imageRadius: { borderRadius: Radius.lg },
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.xl,
    backgroundColor: Colors.heroScrim,
  },
  headline: {
    color: Colors.white,
    fontSize: 20,
    fontFamily: headingFont.bold,
    lineHeight: 26,
  },
  subline: {
    color: Colors.onDarkMuted,
    fontSize: 13,
    fontFamily: FontFamily.medium,
    marginTop: 5,
    lineHeight: 18,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
  },
  dotActive: {
    width: 20,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.secondary,
  },
});
