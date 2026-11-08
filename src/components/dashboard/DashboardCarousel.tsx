import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  View,
  Text,
  Image,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  PixelRatio,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  IconSize,
  PressOpacity,
  Radius,
  ScreenPad,
  Shadow,
  Spacing,
  Typography,
} from '../../constants/theme';
import { youTubeThumbnailCandidates } from '../../utils/youtube';
import {
  fetchChannelVideos,
  youtubeCarouselEnabled,
  type DashboardVideo,
} from '../../utils/youtubeFeed';
import TipBanner, { type TipBannerProps } from './TipBanner';
import VideoPlayerModal from './VideoPlayerModal';
import { THUMB_ASPECT, carouselCardWidth, carouselThumbHeight } from './carouselLayout';

export { THUMB_ASPECT, carouselCardWidth, carouselThumbHeight };

// At least the screen padding, so the neighbouring cards stay fully off screen.
const CARD_GAP = ScreenPad.horizontal;
const VIDEO_COUNT = 4;
const AUTO_ADVANCE_MS = 5000;
// Longer than a programmatic scroll animation, used to settle if the platform sends no scroll-end event for it.
const SETTLE_FALLBACK_MS = 700;

interface Slide {
  key: string;
  video: DashboardVideo;
}

function VideoThumbnail({
  videoId,
  isShort,
  feedThumbnailUrl,
}: {
  videoId: string;
  isShort?: boolean;
  feedThumbnailUrl?: string;
}) {
  const candidates = React.useMemo(
    () =>
      youTubeThumbnailCandidates(videoId, {
        short: isShort,
        prepend: feedThumbnailUrl ? [feedThumbnailUrl] : undefined,
      }),
    [videoId, isShort, feedThumbnailUrl],
  );
  const [index, setIndex] = useState(0);
  const [exhausted, setExhausted] = useState(false);
  const attemptRef = useRef(0);

  const uri = candidates[index];

  const onLoadError = () => {
    const next = attemptRef.current + 1;
    if (next >= candidates.length) {
      if (__DEV__) {
        console.warn('[VideoThumbnail] All thumbnail URLs failed', {
          videoId,
          isShort,
          candidates,
        });
      }
      setExhausted(true);
      return;
    }
    attemptRef.current = next;
    setIndex(next);
  };

  if (exhausted || !uri) {
    return (
      <View style={styles.thumbPlaceholder} accessibilityLabel="Video thumbnail unavailable">
        <Ionicons name="videocam-outline" size={IconSize.lg} color={Colors.textLight} />
      </View>
    );
  }

  return <Image source={{ uri }} style={styles.thumb} resizeMode="cover" onError={onLoadError} />;
}

/** Pulsing placeholder shown while the latest videos load, sized like a real card. */
function SkeletonCard({ width, thumbHeight }: { width: number; thumbHeight: number }) {
  const [pulse] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View style={[styles.card, { width, opacity: pulse }]}>
      <View style={[styles.thumbWrap, { height: thumbHeight }]} />
      <View style={styles.skeletonTitle}>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
      </View>
    </Animated.View>
  );
}

/**
 * Dashboard carousel of the channel's latest YouTube videos; tapping a thumbnail plays it in the app. Shows the tip banner
 * instead when no channel is configured or its videos cannot be loaded.
 */
export default function DashboardCarousel(bannerProps: TipBannerProps) {
  const [videos, setVideos] = useState<DashboardVideo[]>([]);
  const [loading, setLoading] = useState(youtubeCarouselEnabled());
  const [playing, setPlaying] = useState<DashboardVideo | null>(null);
  // Position in `slides`, which for more than one video is [last, ...videos, first] so the row can loop both ways.
  const [pos, setPos] = useState(1);
  const [dragging, setDragging] = useState(false);
  const listRef = useRef<FlatList<Slide>>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!youtubeCarouselEnabled()) return;
    let active = true;
    fetchChannelVideos(VIDEO_COUNT)
      .then(latest => active && setVideos(latest))
      .catch(() => {
        // Offline or YouTube unreachable: fall back to the tip banner.
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  // Sized from the live window so rotation, split-screen and foldables do not leave a stale card. The next card peeks in.
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = carouselCardWidth(screenWidth);
  const thumbHeight = carouselThumbHeight(cardWidth);
  const dpr = PixelRatio.get();
  const snapToDevicePixel = (value: number) => Math.round(value * dpr) / dpr;
  const step = cardWidth + CARD_GAP;

  // The first and last videos are repeated at the opposite ends, so moving past the last card slides on to the first and
  // swiping back from the first reaches the last. Once a repeat is on screen, jump (unseen) to the real card.
  const looped = videos.length > 1;
  const slides: Slide[] = looped
    ? [videos[videos.length - 1], ...videos, videos[0]].map((video, index) => ({
        key: `${index}-${video.id}`,
        video,
      }))
    : videos.map(video => ({ key: video.id, video }));
  const last = videos.length;
  const page = looped ? (pos - 1 + last) % last : 0;

  const settle = (index: number) => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    if (!looped) return;
    if (index <= 0 || index >= last + 1) {
      const real = index <= 0 ? last : 1;
      listRef.current?.scrollToOffset({ offset: real * step, animated: false });
      setPos(real);
    } else {
      setPos(index);
    }
  };

  // One video at a time: slide to the next every few seconds, unless the person is swiping or a video is playing.
  useEffect(() => {
    if (!looped || playing || dragging) return;
    const timer = setTimeout(() => {
      const next = pos + 1;
      listRef.current?.scrollToOffset({ offset: next * step, animated: true });
      setPos(next);
      settleTimer.current = setTimeout(() => settle(next), SETTLE_FALLBACK_MS);
    }, AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [looped, playing, dragging, pos, step]);

  useEffect(
    () => () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
    },
    [],
  );

  if (videos.length === 0 && !loading) return <TipBanner {...bannerProps} />;

  const header = (
    <View style={styles.header}>
      <View style={styles.bulbWrap}>
        <Ionicons name="play" size={IconSize.xs} color={Colors.white} />
      </View>
      <View style={styles.headerCopy}>
        <Text style={styles.headerTitle}>Watch and learn</Text>
        <Text style={styles.headerSub}>Quick app tutorials and tips</Text>
      </View>
    </View>
  );

  // Same heading as the loaded carousel, with a pulsing placeholder card where the videos will appear.
  if (loading) {
    return (
      <View accessibilityRole="progressbar" accessibilityLabel="Loading videos">
        {header}
        <View style={styles.list}>
          <SkeletonCard width={cardWidth} thumbHeight={snapToDevicePixel(thumbHeight)} />
        </View>
      </View>
    );
  }

  return (
    <View>
      {header}

      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={slide => slide.key}
        initialScrollIndex={looped ? 1 : 0}
        getItemLayout={(_, index) => ({ length: step, offset: step * index, index })}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
        onScrollBeginDrag={() => setDragging(true)}
        onScrollEndDrag={() => setDragging(false)}
        onMomentumScrollEnd={event => settle(Math.round(event.nativeEvent.contentOffset.x / step))}
        renderItem={({ item: { video: item } }) => (
          <TouchableOpacity
            style={[styles.card, { width: cardWidth }]}
            onPress={() => setPlaying(item)}
            activeOpacity={PressOpacity.default}
            accessibilityRole="button"
            accessibilityLabel={`Play video: ${item.title}`}
          >
            <View style={[styles.thumbWrap, { height: snapToDevicePixel(thumbHeight) }]}>
              <VideoThumbnail
                videoId={item.id}
                isShort={item.isShort}
                feedThumbnailUrl={item.thumbnailUrl}
              />
              <View style={styles.watchPill} pointerEvents="none">
                <Ionicons name="play" size={IconSize.xs} color={Colors.white} />
                <Text style={styles.watchPillText}>Watch</Text>
              </View>
            </View>
            <Text style={styles.videoTitle} numberOfLines={2}>
              {item.title}
            </Text>
          </TouchableOpacity>
        )}
      />

      {looped ? (
        <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no">
          {videos.map((video, index) => (
            <View key={video.id} style={[styles.dot, index === page && styles.dotActive]} />
          ))}
        </View>
      ) : null}

      <VideoPlayerModal video={playing} onClose={() => setPlaying(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    paddingHorizontal: ScreenPad.horizontal,
  },
  bulbWrap: {
    width: Typography.section.lineHeight + Spacing.xs,
    height: Typography.section.lineHeight + Spacing.xs,
    borderRadius: (Typography.section.lineHeight + Spacing.xs) / 2,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1, minWidth: 0 },
  headerTitle: {
    ...Typography.section,
    lineHeight: Typography.section.lineHeight,
    includeFontPadding: false,
  },
  headerSub: { ...Typography.caption },
  list: { paddingHorizontal: ScreenPad.horizontal, paddingBottom: Spacing.xs },
  card: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  thumbWrap: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: Colors.disabledBg,
  },
  thumb: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  thumbPlaceholder: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.disabledBg,
  },
  watchPill: {
    position: 'absolute',
    left: Spacing.xs,
    bottom: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  watchPillText: { ...Typography.caption, color: Colors.white },
  videoTitle: {
    ...Typography.bodyStrong,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    minHeight: Typography.bodyStrong.lineHeight * 2 + Spacing.sm * 2,
  },
  skeletonTitle: {
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    minHeight: Typography.bodyStrong.lineHeight * 2 + Spacing.sm * 2,
  },
  skeletonLine: { height: 12, borderRadius: 6, backgroundColor: Colors.disabledBg },
  skeletonLineShort: { width: '60%' },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xxs + 2,
    marginTop: Spacing.sm,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  dotActive: { width: 18, backgroundColor: Colors.secondary },
});
