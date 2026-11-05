import { parseChannelBrowseHtml } from '../../utils/youtubeChannelBrowseParser';

describe('parseChannelBrowseHtml', () => {
  it('extracts shorts from channel html fragment', () => {
    const html = `
      "accessibilityText":"How to : Register and Login, 4 views – play Short"
      "reelWatchEndpoint":{"videoId":"6XTSde6Tyxk","params":""}
    `;

    expect(parseChannelBrowseHtml(html, 4)).toEqual([
      {
        id: '6XTSde6Tyxk',
        title: 'How to : Register and Login',
        isShort: true,
      },
    ]);
  });

  it('extracts watch videos with primaryText title', () => {
    const html = `
      "primaryText":{"content":"Morning workout"}
      "watchEndpoint":{"videoId":"dQw4w9WgXcQ","params":""}
    `;

    expect(parseChannelBrowseHtml(html, 4)).toEqual([
      { id: 'dQw4w9WgXcQ', title: 'Morning workout' },
    ]);
  });

  it('falls back to simpleText for watch title', () => {
    const html = `"simpleText":"Evening stretch"
      "watchEndpoint":{"videoId":"abcdefghijk"}`;

    expect(parseChannelBrowseHtml(html, 4)).toEqual([
      { id: 'abcdefghijk', title: 'Evening stretch' },
    ]);
  });

  it('dedupes by id and respects limit', () => {
    const html = [
      '"accessibilityText":"A, 1 views – play Short" "reelWatchEndpoint":{"videoId":"AAAAAAAAAAA"}',
      '"primaryText":{"content":"A again"} "watchEndpoint":{"videoId":"AAAAAAAAAAA"}',
      '"primaryText":{"content":"B"} "watchEndpoint":{"videoId":"BBBBBBBBBBB"}',
    ].join('\n');

    expect(parseChannelBrowseHtml(html, 1)).toEqual([
      { id: 'AAAAAAAAAAA', title: 'A', isShort: true },
    ]);
  });

  it('returns empty for blank or non-channel html', () => {
    expect(parseChannelBrowseHtml('', 4)).toEqual([]);
    expect(parseChannelBrowseHtml('<html>blocked</html>', 4)).toEqual([]);
  });
});
