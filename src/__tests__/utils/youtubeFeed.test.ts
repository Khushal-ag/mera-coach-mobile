import {
  fetchChannelVideos,
  isShortFeedLink,
  parseChannelFeed,
  videoIdFromFeedLink,
} from '../../utils/youtubeFeed';

const entry = (id: string, title: string, path = 'watch?v=' + id, thumb?: string) => `<entry>
  <id>yt:video:${id}</id>
  <yt:videoId>${id}</yt:videoId>
  <title>${title}</title>
  <link rel="alternate" href="https://www.youtube.com/${path}"/>
  ${
    thumb
      ? `<media:group><media:thumbnail url="${thumb}" width="480" height="360"/></media:group>`
      : ''
  }
</entry>`;

describe('parseChannelFeed', () => {
  it('returns id and title for each video, newest first', () => {
    const xml = `<feed><title>Channel</title>${entry('AAAAAAAAAAA', 'First')}${entry('BBBBBBBBBBB', 'Second')}</feed>`;
    expect(parseChannelFeed(xml, 4)).toEqual([
      { id: 'AAAAAAAAAAA', title: 'First' },
      { id: 'BBBBBBBBBBB', title: 'Second' },
    ]);
  });

  it('reads media:thumbnail from the feed entry', () => {
    const xml = entry(
      '6XTSde6Tyxk',
      'How to : Register and Login',
      'shorts/6XTSde6Tyxk',
      'https://i3.ytimg.com/vi/6XTSde6Tyxk/hqdefault.jpg',
    );
    expect(parseChannelFeed(`<feed>${xml}</feed>`, 4)).toEqual([
      {
        id: '6XTSde6Tyxk',
        title: 'How to : Register and Login',
        isShort: true,
        thumbnailUrl: 'https://i3.ytimg.com/vi/6XTSde6Tyxk/hqdefault.jpg',
      },
    ]);
  });

  it('includes shorts and stops at the limit', () => {
    const xml = [
      entry('AAAAAAAAAAA', 'Short', 'shorts/AAAAAAAAAAA'),
      entry('BBBBBBBBBBB', 'One'),
      entry('CCCCCCCCCCC', 'Two'),
      entry('DDDDDDDDDDD', 'Three'),
    ].join('');
    expect(parseChannelFeed(xml, 2)).toEqual([
      { id: 'AAAAAAAAAAA', title: 'Short', isShort: true },
      { id: 'BBBBBBBBBBB', title: 'One' },
    ]);
  });

  it('reads video id from a shorts link when yt:videoId is missing', () => {
    const xml = `<entry>
  <title>From link</title>
  <link rel="alternate" href="https://www.youtube.com/shorts/EEEEEEEEEEE"/>
</entry>`;
    expect(parseChannelFeed(xml, 4)).toEqual([
      { id: 'EEEEEEEEEEE', title: 'From link', isShort: true },
    ]);
  });

  it('decodes entities in titles', () => {
    const xml = entry('AAAAAAAAAAA', 'Abs &amp; core &#39;burn&#39; &#x1F525;');
    expect(parseChannelFeed(xml, 4)[0].title).toBe("Abs & core 'burn' 🔥");
  });

  it('ignores entries with a bad id and returns nothing for a non-feed', () => {
    expect(parseChannelFeed(entry('bad', 'Nope'), 4)).toEqual([]);
    expect(parseChannelFeed('<html>blocked</html>', 4)).toEqual([]);
  });

  it('reads id from yt:videoId when the alternate link is missing', () => {
    const xml = `<entry>
  <yt:videoId>FFFFFFFFFFF</yt:videoId>
  <title>Tag only</title>
</entry>`;
    expect(parseChannelFeed(xml, 4)).toEqual([{ id: 'FFFFFFFFFFF', title: 'Tag only' }]);
  });

  it('reads id from watch URL when yt:videoId is missing', () => {
    const xml = `<entry>
  <title>Watch link</title>
  <link rel="alternate" href="https://www.youtube.com/watch?v=GGGGGGGGGGG"/>
</entry>`;
    expect(parseChannelFeed(xml, 4)).toEqual([{ id: 'GGGGGGGGGGG', title: 'Watch link' }]);
  });
});

describe('videoIdFromFeedLink', () => {
  it('parses watch and shorts URLs', () => {
    expect(videoIdFromFeedLink('https://www.youtube.com/watch?v=UItWltVZZmE')).toBe('UItWltVZZmE');
    expect(videoIdFromFeedLink('https://www.youtube.com/shorts/UItWltVZZmE')).toBe('UItWltVZZmE');
  });
});

describe('isShortFeedLink', () => {
  it('is true only for /shorts/ links', () => {
    expect(isShortFeedLink('https://www.youtube.com/shorts/abc')).toBe(true);
    expect(isShortFeedLink('https://www.youtube.com/watch?v=abc')).toBe(false);
  });
});

describe('fetchChannelVideos', () => {
  const realFetch = global.fetch;

  afterEach(() => {
    global.fetch = realFetch;
  });

  it('loads from RSS directly with a browser User-Agent', async () => {
    const xml = `<feed>${entry('AAAAAAAAAAA', 'From RSS')}</feed>`;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => xml,
    }) as typeof fetch;

    await expect(fetchChannelVideos(4, 'UCyrit6VV-HZJGnnWzPfgDLw')).resolves.toEqual([
      { id: 'AAAAAAAAAAA', title: 'From RSS' },
    ]);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('feeds/videos.xml?channel_id=UCyrit6VV-HZJGnnWzPfgDLw'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': expect.stringContaining('Chrome'),
        }),
      }),
    );
  });

  it('falls back to browse HTML when RSS fails', async () => {
    const channelId = '@HenchSolutionsTest';
    const browseHtml = `"primaryText":{"content":"Browse title"}
      "watchEndpoint":{"videoId":"BBBBBBBBBBB"}`;

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => browseHtml,
    }) as typeof fetch;

    await expect(fetchChannelVideos(3, channelId)).resolves.toEqual([
      { id: 'BBBBBBBBBBB', title: 'Browse title' },
    ]);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/@HenchSolutionsTest/videos'),
      expect.any(Object),
    );
  });
});
