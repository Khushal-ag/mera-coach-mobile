/** YouTube refuses embeds that arrive without an https referrer, so the player page is served as if from the public site. */
export const YOUTUBE_EMBED_ORIGIN = 'https://mera-coach.com';

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export function isYouTubeVideoId(value: string): boolean {
  return VIDEO_ID.test(value);
}

/** Still frame YouTube generates for every video. */
export function youTubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
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
