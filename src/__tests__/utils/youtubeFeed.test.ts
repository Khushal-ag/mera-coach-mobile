import { parseChannelFeed } from '../../utils/youtubeFeed';

const entry = (id: string, title: string, path = 'watch?v=' + id) => `<entry>
  <id>yt:video:${id}</id>
  <yt:videoId>${id}</yt:videoId>
  <title>${title}</title>
  <link rel="alternate" href="https://www.youtube.com/${path}"/>
</entry>`;

describe('parseChannelFeed', () => {
  it('returns id and title for each video, newest first', () => {
    const xml = `<feed><title>Channel</title>${entry('AAAAAAAAAAA', 'First')}${entry('BBBBBBBBBBB', 'Second')}</feed>`;
    expect(parseChannelFeed(xml, 4)).toEqual([
      { id: 'AAAAAAAAAAA', title: 'First' },
      { id: 'BBBBBBBBBBB', title: 'Second' },
    ]);
  });

  it('skips shorts and stops at the limit', () => {
    const xml = [
      entry('AAAAAAAAAAA', 'Short', 'shorts/AAAAAAAAAAA'),
      entry('BBBBBBBBBBB', 'One'),
      entry('CCCCCCCCCCC', 'Two'),
      entry('DDDDDDDDDDD', 'Three'),
    ].join('');
    expect(parseChannelFeed(xml, 2).map(video => video.id)).toEqual(['BBBBBBBBBBB', 'CCCCCCCCCCC']);
  });

  it('decodes entities in titles', () => {
    const xml = entry('AAAAAAAAAAA', 'Abs &amp; core &#39;burn&#39; &#x1F525;');
    expect(parseChannelFeed(xml, 4)[0].title).toBe("Abs & core 'burn' 🔥");
  });

  it('ignores entries with a bad id and returns nothing for a non-feed', () => {
    expect(parseChannelFeed(entry('bad', 'Nope'), 4)).toEqual([]);
    expect(parseChannelFeed('<html>blocked</html>', 4)).toEqual([]);
  });
});
