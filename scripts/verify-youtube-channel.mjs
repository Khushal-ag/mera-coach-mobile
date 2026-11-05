/**
 * Smoke-test direct YouTube load (RSS → browse fallback). Usage:
 *   node scripts/verify-youtube-channel.mjs [channelId] [limit]
 */
const channelId = process.argv[2]?.trim() || 'UCyrit6VV-HZJGnnWzPfgDLw';
const limit = Math.max(1, Number(process.argv[3]) || 3);
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const REEL_WATCH =
  /"accessibilityText"\s*:\s*"([^"]+?)"[\s\S]{0,900}?"reelWatchEndpoint"\s*:\s*\{\s*"videoId"\s*:\s*"([A-Za-z0-9_-]{11})"/g;
const WATCH_ENDPOINT = /"watchEndpoint"\s*:\s*\{\s*"videoId"\s*:\s*"([A-Za-z0-9_-]{11})"/g;
const PRIMARY_TEXT = /"primaryText"\s*:\s*\{\s*"content"\s*:\s*"([^"]+)"/;
const SIMPLE_TITLE = /"simpleText"\s*:\s*"([^"]+)"/;
const SHORT_SUFFIX = /, \d+ views [–-] play Short$/;
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

function parseFeed(xml, max) {
  const videos = [];
  for (const entry of xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? []) {
    const id =
      /<yt:videoId>([^<]+)<\/yt:videoId>/.exec(entry)?.[1]?.trim() ||
      /[?&]v=([A-Za-z0-9_-]{11})/.exec(entry)?.[1] ||
      /\/shorts\/([A-Za-z0-9_-]{11})/.exec(entry)?.[1];
    const title = /<title>([^<]*)<\/title>/.exec(entry)?.[1]?.trim();
    if (!VIDEO_ID.test(id) || !title) continue;
    videos.push({ id, title, isShort: /\/shorts\//.test(entry) });
    if (videos.length >= max) break;
  }
  return videos;
}

function parseBrowse(html, max) {
  const videos = [];
  const seen = new Set();
  const tryAdd = (id, title, isShort) => {
    if (videos.length >= max || seen.has(id) || !VIDEO_ID.test(id) || !title?.trim()) return;
    seen.add(id);
    videos.push({ id, title: title.trim(), ...(isShort ? { isShort: true } : {}) });
  };
  for (const m of html.matchAll(REEL_WATCH)) {
    tryAdd(m[2], m[1].replace(SHORT_SUFFIX, ''), true);
  }
  for (const m of html.matchAll(WATCH_ENDPOINT)) {
    const i = m.index ?? 0;
    const window = html.slice(Math.max(0, i - 400), Math.min(html.length, i + 800));
    let title = PRIMARY_TEXT.exec(window)?.[1];
    if (!title) title = SIMPLE_TITLE.exec(window)?.[1];
    tryAdd(m[1], title, false);
  }
  return videos;
}

async function fetchText(url, headers) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.text();
}

async function main() {
  const rssHeaders = {
    Accept: 'application/atom+xml, application/xml, text/xml, */*',
    'User-Agent': UA,
  };
  const feedUrls = [
    `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`,
  ];
  if (/^UC[A-Za-z0-9_-]{22}$/.test(channelId)) {
    feedUrls.push(
      `https://www.youtube.com/feeds/videos.xml?playlist_id=UULF${encodeURIComponent(channelId.slice(2))}`,
    );
  }

  for (const url of feedUrls) {
    try {
      const xml = await fetchText(url, rssHeaders);
      if (xml.includes('<entry>')) {
        const videos = parseFeed(xml, limit);
        if (videos.length) {
          console.log(
            JSON.stringify({ source: 'rss', url, count: videos.length, videos }, null, 2),
          );
          return;
        }
      }
    } catch (e) {
      console.warn('RSS failed:', e.message);
    }
  }

  const browseUrl = `https://www.youtube.com/channel/${encodeURIComponent(channelId)}/videos`;
  const html = await fetchText(browseUrl, {
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'User-Agent': UA,
  });
  const videos = parseBrowse(html, limit);
  if (!videos.length) {
    console.error('No videos parsed from browse HTML');
    process.exit(1);
  }
  console.log(
    JSON.stringify({ source: 'browse', url: browseUrl, count: videos.length, videos }, null, 2),
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
