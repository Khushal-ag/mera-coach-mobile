/** YouTube refuses embeds that arrive without an https referrer, so the player page is served as if from the public site. */
export const YOUTUBE_EMBED_ORIGIN = 'https://mera-coach.com';

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export function isYouTubeVideoId(value: string): boolean {
  return VIDEO_ID.test(value);
}

const YTIMG = 'https://i.ytimg.com/vi';
const IMG_YOUTUBE = 'https://img.youtube.com/vi';

/** Minimum still width (px) before we accept a carousel thumbnail (avoids upscaling mqdefault). */
export const YOUTUBE_THUMB_MIN_WIDTH_PX = 480;

/**
 * YouTube still-image names, best first.
 * Shorts: skip `hqdefault` (often a horizontal tile strip in 16:9); `mqdefault` is last-resort only.
 */
export const YOUTUBE_THUMBNAIL_VARIANTS = {
  landscape: ['maxresdefault', 'sddefault', 'hqdefault'] as const,
  short: ['maxresdefault', 'sddefault', 'oar1', 'mqdefault'] as const,
};

export type YouTubeThumbnailVariant =
  | (typeof YOUTUBE_THUMBNAIL_VARIANTS.landscape)[number]
  | (typeof YOUTUBE_THUMBNAIL_VARIANTS.short)[number];

export type YouTubeThumbnailHost = 'ytimg' | 'img';

export function youTubeThumbnailUrlFor(
  videoId: string,
  variant: YouTubeThumbnailVariant,
  host: YouTubeThumbnailHost = 'ytimg',
): string {
  const base = host === 'ytimg' ? YTIMG : IMG_YOUTUBE;
  return `${base}/${videoId}/${variant}.jpg`;
}

/** Feed RSS often ships `hqdefault` on a shard host; for Shorts swap to `maxresdefault` on the same URL. */
export function normalizeShortFeedThumbnail(url: string): string {
  return url.replace(/\/hqdefault\.jpg(\?.*)?$/i, '/maxresdefault.jpg$1');
}

/** Prepends from the Atom feed: Shorts upgrade low-res tiles; regular videos use the URL as-is. */
export function normalizeFeedThumbnail(url: string, options?: { short?: boolean }): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  return options?.short ? normalizeShortFeedThumbnail(trimmed) : trimmed;
}

function pushVariantUrls(
  urls: string[],
  videoId: string,
  variant: YouTubeThumbnailVariant,
  short: boolean,
): void {
  if (short && variant === 'mqdefault') {
    urls.push(youTubeThumbnailUrlFor(videoId, variant, 'img'));
    urls.push(youTubeThumbnailUrlFor(videoId, variant, 'ytimg'));
    return;
  }
  urls.push(youTubeThumbnailUrlFor(videoId, variant, 'ytimg'));
  urls.push(youTubeThumbnailUrlFor(videoId, variant, 'img'));
}

/** Ordered still URLs to try (UI should fall back on load error). */
export function youTubeThumbnailCandidates(
  videoId: string,
  options?: { short?: boolean; prepend?: readonly string[] },
): string[] {
  const short = Boolean(options?.short);
  const variants = short ? YOUTUBE_THUMBNAIL_VARIANTS.short : YOUTUBE_THUMBNAIL_VARIANTS.landscape;
  const urls: string[] = [];
  for (const variant of variants) {
    pushVariantUrls(urls, videoId, variant, short);
  }
  if (!short) {
    urls.push(youTubeThumbnailUrlFor(videoId, 'hqdefault', 'img'));
  }
  const ordered = [...new Set(urls)];
  let prepend = options?.prepend?.map(url => url.trim()).filter(Boolean) ?? [];
  if (prepend.length) {
    prepend = prepend.map(u => normalizeFeedThumbnail(u, { short }));
  }
  return prepend.length ? [...new Set([...prepend, ...ordered])] : ordered;
}

/** First candidate; use with `onError` stepping through `youTubeThumbnailCandidates`. */
export function youTubeThumbnailUrl(videoId: string, options?: { short?: boolean }): string {
  return youTubeThumbnailCandidates(videoId, options)[0];
}

/** Minimal page that plays one video full-bleed. Returns an empty page for an id that is not a YouTube id. */
export function youTubeEmbedHtml(videoId: string): string {
  const src = isYouTubeVideoId(videoId)
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0&modestbranding=1`
    : '';
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;height:100%;background:#000}iframe{position:absolute;inset:0;width:100%;height:100%;border:0}</style></head>
<body>${
    src
      ? `<iframe src="${src}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`
      : ''
  }</body></html>`;
}

/** The player may load YouTube and the blank page it is injected into, nothing else. */
export function isAllowedPlayerUrl(url: string): boolean {
  if (
    url === 'about:blank' ||
    url === YOUTUBE_EMBED_ORIGIN ||
    url.startsWith(`${YOUTUBE_EMBED_ORIGIN}/`)
  ) {
    return true;
  }
  return /^https:\/\/(www\.)?youtube(-nocookie)?\.com\//.test(url);
}
