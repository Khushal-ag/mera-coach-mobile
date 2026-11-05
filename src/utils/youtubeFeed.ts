import { YOUTUBE_CHANNEL_ID } from '../config/appConfig';
import { isYouTubeVideoId } from './youtube';
import { parseChannelBrowseHtml } from './youtubeChannelBrowseParser';

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

/** Desktop Chrome UA — YouTube often 404s Atom feeds from default React Native / datacenter clients. */
export const YOUTUBE_DESKTOP_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** True when a channel id is configured for the dashboard carousel. */
export function youtubeCarouselEnabled(): boolean {
  return Boolean(YOUTUBE_CHANNEL_ID);
}

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
const RSS_ATTEMPTS = 3;

let cache: { key: string; at: number; videos: DashboardVideo[] } | null = null;

function channelVideosBrowseUrl(channelId: string): string {
  const trimmed = channelId.trim();
  if (trimmed.startsWith('@')) {
    return `https://www.youtube.com/${encodeURI(trimmed)}/videos`;
  }
  return `https://www.youtube.com/channel/${encodeURIComponent(trimmed)}/videos`;
}

function rssFeedUrls(channelId: string): string[] {
  const trimmed = channelId.trim();
  if (trimmed.startsWith('@')) return [];
  const urls = [
    `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(trimmed)}`,
  ];
  if (/^UC[A-Za-z0-9_-]{22}$/.test(trimmed)) {
    urls.push(
      `https://www.youtube.com/feeds/videos.xml?playlist_id=UULF${encodeURIComponent(trimmed.slice(2))}`,
    );
  }
  return urls;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchTextWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchChannelVideosDirect(
  limit: number,
  channelId: string,
): Promise<DashboardVideo[]> {
  const parseLimit = Math.max(limit, 15);
  const rssHeaders: HeadersInit = {
    Accept: 'application/atom+xml, application/xml, text/xml, */*',
    'User-Agent': YOUTUBE_DESKTOP_USER_AGENT,
  };

  for (const feedUrl of rssFeedUrls(channelId)) {
    for (let attempt = 0; attempt < RSS_ATTEMPTS; attempt++) {
      if (attempt > 0) await delay(2000 * attempt);
      try {
        const xml = await fetchTextWithTimeout(feedUrl, { headers: rssHeaders }, FEED_TIMEOUT_MS);
        if (!xml.includes('<entry>')) break;
        const fromFeed = parseChannelFeed(xml, parseLimit);
        if (fromFeed.length > 0) return fromFeed.slice(0, limit);
        break;
      } catch {
        // try next attempt / URL
      }
    }
  }

  const browseUrl = channelVideosBrowseUrl(channelId);
  const browseHeaders: HeadersInit = {
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'User-Agent': YOUTUBE_DESKTOP_USER_AGENT,
  };
  const html = await fetchTextWithTimeout(browseUrl, { headers: browseHeaders }, FEED_TIMEOUT_MS);
  const fromBrowse = parseChannelBrowseHtml(html, parseLimit);
  if (fromBrowse.length === 0) {
    throw new Error('YouTube channel videos unavailable');
  }
  return fromBrowse.slice(0, limit);
}

/** Latest videos for the dashboard carousel (RSS, then channel /videos HTML). */
export async function fetchChannelVideos(
  limit: number,
  channelId: string = YOUTUBE_CHANNEL_ID,
): Promise<DashboardVideo[]> {
  const trimmed = channelId.trim();
  if (!trimmed) return [];

  const key = `direct:${trimmed}`;
  if (cache && cache.key === key && Date.now() - cache.at < CACHE_MS) {
    return cache.videos.slice(0, limit);
  }

  const videos = await fetchChannelVideosDirect(limit, trimmed);
  cache = { key, at: Date.now(), videos };
  return videos.slice(0, limit);
}
