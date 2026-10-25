import {
  YOUTUBE_EMBED_ORIGIN,
  isAllowedPlayerUrl,
  isYouTubeVideoId,
  youTubeEmbedHtml,
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

describe('youTubeThumbnailUrl', () => {
  it('points at the ytimg still for the id', () => {
    expect(youTubeThumbnailUrl('UItWltVZZmE')).toBe(
      'https://i.ytimg.com/vi/UItWltVZZmE/hqdefault.jpg',
    );
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
