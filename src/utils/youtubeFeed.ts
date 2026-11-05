import { YOUTUBE_CHANNEL_ID } from '../config/appConfig';
import { isYouTubeVideoId } from './youtube';

export interface DashboardVideo {
  /** YouTube video id, the part after `v=`. */
  id: string;
  title: string;
  /** True when the feed link is a `/shorts/` URL (portrait thumbnail). */
  isShort?: boolean;
  /** Still URL from the feed's `media:thumbnail` (shard host, e.g. i3.ytimg.com). */
  thumbnailUrl?: string;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/** Video id from a feed alternate link (`watch?v=` or `/shorts/`). */
export function videoIdFromFeedLink(link: string): string {
  return (
    /[?&]v=([A-Za-z0-9_-]{11})/.exec(link)?.[1] ??
    /\/shorts\/([A-Za-z0-9_-]{11})/.exec(link)?.[1] ??
    ''
  );
}

export function isShortFeedLink(link: string): boolean {
  return /\/shorts\//.test(link);
}

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const point =
        code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(point) ? String.fromCodePoint(point) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

/** The newest videos in a channel's public Atom feed, including Shorts (same video ids as watch URLs). */
export function parseChannelFeed(xml: string, limit: number): DashboardVideo[] {
  const videos: DashboardVideo[] = [];
  for (const entry of xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? []) {
    const link = /<link rel="alternate" href="([^"]+)"/.exec(entry)?.[1] ?? '';
    const fromTag = /<yt:videoId>([^<]+)<\/yt:videoId>/.exec(entry)?.[1]?.trim() ?? '';
    const fromLink = videoIdFromFeedLink(link);
    const id = fromTag || fromLink;
    const title = /<title>([^<]*)<\/title>/.exec(entry)?.[1] ?? '';
    if (!isYouTubeVideoId(id) || !title.trim()) continue;
    const isShort = isShortFeedLink(link);
    const thumbnailUrl = /<media:thumbnail url="([^"]+)"/.exec(entry)?.[1]?.trim();
    videos.push({
      id,
      title: decodeEntities(title).trim(),
      ...(isShort ? { isShort: true } : {}),
      ...(thumbnailUrl ? { thumbnailUrl } : {}),
    });
    if (videos.length >= limit) break;
  }
  return videos;
}

const FEED_TIMEOUT_MS = 8000;
const CACHE_MS = 10 * 60 * 1000;

let cache: { channelId: string; at: number; videos: DashboardVideo[] } | null = null;

/** Latest videos of a YouTube channel, from its public feed (no API key). Cached for a few minutes. Empty when no channel is set; throws on failure. */
export async function fetchChannelVideos(
  limit: number,
  channelId: string = YOUTUBE_CHANNEL_ID,
): Promise<DashboardVideo[]> {
  if (!channelId) return [];
  if (cache && cache.channelId === channelId && Date.now() - cache.at < CACHE_MS) {
    return cache.videos.slice(0, limit);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`,
      { signal: controller.signal },
    );
    if (!response.ok) throw new Error(`YouTube feed returned ${response.status}`);
    const videos = parseChannelFeed(await response.text(), limit);
    cache = { channelId, at: Date.now(), videos };
    return videos;
  } finally {
    clearTimeout(timer);
  }
}
