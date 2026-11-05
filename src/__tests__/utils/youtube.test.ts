import {
  YOUTUBE_EMBED_ORIGIN,
  isAllowedPlayerUrl,
  isYouTubeVideoId,
  normalizeFeedThumbnail,
  youTubeEmbedHtml,
  youTubeThumbnailCandidates,
  youTubeThumbnailUrl,
} from '../../utils/youtube';

describe('isYouTubeVideoId', () => {
  it('accepts an 11 character id', () => {
    expect(isYouTubeVideoId('UItWltVZZmE')).toBe(true);
    expect(isYouTubeVideoId('GQ-S9OaZZKk')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isYouTubeVideoId('')).toBe(false);
    expect(isYouTubeVideoId('short')).toBe(false);
    expect(isYouTubeVideoId('UItWltVZZmE"><script>')).toBe(false);
  });
});

describe('normalizeFeedThumbnail', () => {
  it('passes through regular feed stills unchanged', () => {
    const url = 'https://i3.ytimg.com/vi/abc/hqdefault.jpg';
    expect(normalizeFeedThumbnail(url)).toBe(url);
    expect(normalizeFeedThumbnail(url, { short: false })).toBe(url);
  });

  it('upgrades Short feed stills to maxresdefault on the same host', () => {
    expect(
      normalizeFeedThumbnail('https://i3.ytimg.com/vi/6XTSde6Tyxk/hqdefault.jpg', { short: true }),
    ).toBe('https://i3.ytimg.com/vi/6XTSde6Tyxk/maxresdefault.jpg');
  });
});

describe('youTubeThumbnailUrl', () => {
  it('prefers maxresdefault for regular videos and shorts', () => {
    expect(youTubeThumbnailUrl('UItWltVZZmE')).toBe(
      'https://i.ytimg.com/vi/UItWltVZZmE/maxresdefault.jpg',
    );
    expect(youTubeThumbnailUrl('UItWltVZZmE', { short: true })).toBe(
      'https://i.ytimg.com/vi/UItWltVZZmE/maxresdefault.jpg',
    );
  });
});

describe('youTubeThumbnailCandidates', () => {
  it('prepends normalized feed still URLs before generated candidates', () => {
    const feed = 'https://i3.ytimg.com/vi/6XTSde6Tyxk/hqdefault.jpg';
    const urls = youTubeThumbnailCandidates('6XTSde6Tyxk', { short: true, prepend: [feed] });
    expect(urls[0]).toBe('https://i3.ytimg.com/vi/6XTSde6Tyxk/maxresdefault.jpg');
    expect(urls[1]).toBe('https://i.ytimg.com/vi/6XTSde6Tyxk/maxresdefault.jpg');
  });

  it('lists maxresdefault first and omits hqdefault for shorts', () => {
    const urls = youTubeThumbnailCandidates('abc', { short: true });
    expect(urls[0]).toContain('maxresdefault');
    expect(urls).not.toContain('https://i.ytimg.com/vi/abc/hqdefault.jpg');
  });
});

describe('youTubeEmbedHtml', () => {
  it('embeds the video with autoplay', () => {
    const html = youTubeEmbedHtml('UItWltVZZmE');
    expect(html).toContain('https://www.youtube.com/embed/UItWltVZZmE?autoplay=1');
  });

  it('renders no iframe for an id that could break out of the attribute', () => {
    expect(youTubeEmbedHtml('x" onload="alert(1)')).not.toContain('<iframe');
  });
});

describe('isAllowedPlayerUrl', () => {
  it('allows the injected page and YouTube', () => {
    expect(isAllowedPlayerUrl('about:blank')).toBe(true);
    expect(isAllowedPlayerUrl(YOUTUBE_EMBED_ORIGIN)).toBe(true);
    expect(isAllowedPlayerUrl('https://www.youtube.com/embed/UItWltVZZmE?autoplay=1')).toBe(true);
  });

  it('blocks other sites', () => {
    expect(isAllowedPlayerUrl('https://evil.example.com/')).toBe(false);
    expect(isAllowedPlayerUrl('https://youtube.com.evil.example.com/')).toBe(false);
    expect(isAllowedPlayerUrl('http://www.youtube.com/watch?v=x')).toBe(false);
  });
});
