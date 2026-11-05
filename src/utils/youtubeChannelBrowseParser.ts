import { isYouTubeVideoId } from './youtube';

/** Parsed from public channel /videos HTML when Atom RSS is blocked. */
export interface BrowseChannelVideo {
  id: string;
  title: string;
  isShort?: boolean;
}

const REEL_WATCH =
  /"accessibilityText"\s*:\s*"([^"]+?)"[\s\S]{0,900}?"reelWatchEndpoint"\s*:\s*\{\s*"videoId"\s*:\s*"([A-Za-z0-9_-]{11})"/g;

const WATCH_ENDPOINT = /"watchEndpoint"\s*:\s*\{\s*"videoId"\s*:\s*"([A-Za-z0-9_-]{11})"/g;

const PRIMARY_TEXT = /"primaryText"\s*:\s*\{\s*"content"\s*:\s*"([^"]+)"/;

const SIMPLE_TITLE = /"simpleText"\s*:\s*"([^"]+)"/;

/** Strips YouTube Shorts accessibility suffix (en-dash or hyphen before "play Short"). */
const SHORT_ACCESSIBILITY_SUFFIX = /, \d+ views [–-] play Short$/;

function tryAdd(
  videos: BrowseChannelVideo[],
  seen: Set<string>,
  id: string,
  title: string,
  isShort: boolean,
  limit: number,
): void {
  if (videos.length >= limit || seen.has(id) || !isYouTubeVideoId(id) || !title.trim()) return;
  seen.add(id);
  videos.push({
    id,
    title: title.trim(),
    ...(isShort ? { isShort: true } : {}),
  });
}

/** Fallback when feeds/videos.xml is unavailable: parse public /channel/…/videos HTML (ytInitialData fragments). */
export function parseChannelBrowseHtml(html: string, limit: number): BrowseChannelVideo[] {
  if (limit <= 0 || !html?.trim()) return [];

  const videos: BrowseChannelVideo[] = [];
  const seen = new Set<string>();

  for (const match of html.matchAll(REEL_WATCH)) {
    const title = match[1].replace(SHORT_ACCESSIBILITY_SUFFIX, '').trim();
    tryAdd(videos, seen, match[2], title, true, limit);
  }

  for (const match of html.matchAll(WATCH_ENDPOINT)) {
    const index = match.index ?? 0;
    const window = html.slice(Math.max(0, index - 400), Math.min(html.length, index + 800));
    let title = PRIMARY_TEXT.exec(window)?.[1]?.trim() ?? '';
    if (!title) title = SIMPLE_TITLE.exec(window)?.[1]?.trim() ?? '';
    tryAdd(videos, seen, match[1], title, false, limit);
  }

  return videos;
}
