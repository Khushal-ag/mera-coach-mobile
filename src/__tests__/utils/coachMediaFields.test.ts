import { readCoachMediaFields } from '../../utils/coachMediaFields';

describe('readCoachMediaFields', () => {
  it('reads System.Text.Json camelCase with underscores', () => {
    expect(
      readCoachMediaFields({
        profile_Pic_Url: '/document/a/pic.jpg',
        logo_Url: '/document/a/logo.jpg',
        cover_Url: '/document/a/cover.jpg',
      }),
    ).toEqual({
      profilePicUrl: '/document/a/pic.jpg',
      logoUrl: '/document/a/logo.jpg',
      coverUrl: '/document/a/cover.jpg',
    });
  });

  it('reads PascalCase Cover_Url and Profile_Pic_Url', () => {
    expect(
      readCoachMediaFields({
        Profile_Pic_Url: '/document/a/pic.jpg',
        Logo_Url: '/document/a/logo.jpg',
        Cover_Url: '/document/a/cover.jpg',
      }),
    ).toEqual({
      profilePicUrl: '/document/a/pic.jpg',
      logoUrl: '/document/a/logo.jpg',
      coverUrl: '/document/a/cover.jpg',
    });
  });

  it('reads camelCase without underscores', () => {
    expect(
      readCoachMediaFields({
        profilePicUrl: '/document/a/pic.jpg',
        coverUrl: '/document/a/cover.jpg',
      }),
    ).toEqual({
      profilePicUrl: '/document/a/pic.jpg',
      logoUrl: '',
      coverUrl: '/document/a/cover.jpg',
    });
  });

  it('ignores blank strings and keeps a later casing that has a path', () => {
    expect(
      readCoachMediaFields({
        cover_Url: '   ',
        Cover_Url: '/document/a/cover.jpg',
        profile_Pic_Url: '',
      }).coverUrl,
    ).toBe('/document/a/cover.jpg');
  });
});
