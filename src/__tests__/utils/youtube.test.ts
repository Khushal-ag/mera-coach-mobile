import {
  YOUTUBE_EMBED_ORIGIN,
  isAllowedPlayerUrl,
  isYouTubeVideoId,
  normalizeFeedThumbnail,
  normalizeShortFeedThumbnail,
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

describe('normalizeShortFeedThumbnail', () => {
  it('upgrades feed hqdefault to maxresdefault on the same host', () => {
    expect(normalizeShortFeedThumbnail('https://i3.ytimg.com/vi/6XTSde6Tyxk/hqdefault.jpg')).toBe(
      'https://i3.ytimg.com/vi/6XTSde6Tyxk/maxresdefault.jpg',
    );
  });
});

describe('normalizeFeedThumbnail', () => {
  it('passes through regular feed stills unchanged', () => {
    const url = 'https://i3.ytimg.com/vi/abc/hqdefault.jpg';
    expect(normalizeFeedThumbnail(url)).toBe(url);
    expect(normalizeFeedThumbnail(url, { short: false })).toBe(url);
  });

  it('upgrades Short feed stills like normalizeShortFeedThumbnail', () => {
    expect(
      normalizeFeedThumbnail('https://i3.ytimg.com/vi/6XTSde6Tyxk/hqdefault.jpg', { short: true }),
    ).toBe('https://i3.ytimg.com/vi/6XTSde6Tyxk/maxresdefault.jpg');
  });
});

describe('youTubeThumbnailUrl', () => {
  it('prefers maxresdefault for regular videos', () => {
    expect(youTubeThumbnailUrl('UItWltVZZmE')).toBe(
      'https://i.ytimg.com/vi/UItWltVZZmE/maxresdefault.jpg',
    );
  });

  it('prefers maxresdefault for shorts (not hqdefault tiles or low-res mqdefault)', () => {
    expect(youTubeThumbnailUrl('UItWltVZZmE', { short: true })).toBe(
      'https://i.ytimg.com/vi/UItWltVZZmE/maxresdefault.jpg',
    );
  });
});

describe('youTubeThumbnailCandidates', () => {
  it('lists fallbacks for landscape and short', () => {
    expect(youTubeThumbnailCandidates('abc')).toEqual([
      'https://i.ytimg.com/vi/abc/maxresdefault.jpg',
      'https://img.youtube.com/vi/abc/maxresdefault.jpg',
      'https://i.ytimg.com/vi/abc/sddefault.jpg',
      'https://img.youtube.com/vi/abc/sddefault.jpg',
      'https://i.ytimg.com/vi/abc/hqdefault.jpg',
      'https://img.youtube.com/vi/abc/hqdefault.jpg',
    ]);
    expect(youTubeThumbnailCandidates('abc', { short: true })).toEqual([
      'https://i.ytimg.com/vi/abc/maxresdefault.jpg',
      'https://img.youtube.com/vi/abc/maxresdefault.jpg',
      'https://i.ytimg.com/vi/abc/sddefault.jpg',
      'https://img.youtube.com/vi/abc/sddefault.jpg',
      'https://i.ytimg.com/vi/abc/oar1.jpg',
      'https://img.youtube.com/vi/abc/oar1.jpg',
      'https://img.youtube.com/vi/abc/mqdefault.jpg',
      'https://i.ytimg.com/vi/abc/mqdefault.jpg',
    ]);
    expect(youTubeThumbnailCandidates('abc', { short: true })).not.toContain(
      'https://i.ytimg.com/vi/abc/hqdefault.jpg',
    );
  });

  /** HenchSolutions Short: "Complete your profile - English" (feed id ogBxBvpBTGc). */
  it('lists maxresdefault first for a known channel short id', () => {
    const id = 'ogBxBvpBTGc';
    const urls = youTubeThumbnailCandidates(id, { short: true });
    expect(urls[0]).toBe(`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`);
    expect(urls).toContain(`https://i.ytimg.com/vi/${id}/oar1.jpg`);
    expect(urls[urls.length - 1]).toBe(`https://i.ytimg.com/vi/${id}/mqdefault.jpg`);
  });

  it('prepends normalized feed still URLs before generated candidates', () => {
    const feed = 'https://i3.ytimg.com/vi/6XTSde6Tyxk/hqdefault.jpg';
    const urls = youTubeThumbnailCandidates('6XTSde6Tyxk', { short: true, prepend: [feed] });
    expect(urls[0]).toBe('https://i3.ytimg.com/vi/6XTSde6Tyxk/maxresdefault.jpg');
    expect(urls[1]).toBe('https://i.ytimg.com/vi/6XTSde6Tyxk/maxresdefault.jpg');
  });

  it('prepends regular feed stills without rewriting hqdefault', () => {
    const feed = 'https://i3.ytimg.com/vi/UItWltVZZmE/hqdefault.jpg';
    const urls = youTubeThumbnailCandidates('UItWltVZZmE', { prepend: [feed] });
    expect(urls[0]).toBe(feed);
    expect(urls[1]).toBe('https://i.ytimg.com/vi/UItWltVZZmE/maxresdefault.jpg');
  });
});

describe('youTubeEmbedHtml', () => {
  it('embeds the video with autoplay', () => {
    const html = youTubeEmbedHtml('UItWltVZZmE');
    expect(html).toContain('https://www.youtube.com/embed/UItWltVZZmE?autoplay=1');
  });

  it('uses the same embed URL for Short and regular ids', () => {
    const shortId = 'ogBxBvpBTGc';
    const regularId = 'UItWltVZZmE';
    expect(youTubeEmbedHtml(shortId)).toContain(`/embed/${shortId}?`);
    expect(youTubeEmbedHtml(regularId)).toContain(`/embed/${regularId}?`);
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
