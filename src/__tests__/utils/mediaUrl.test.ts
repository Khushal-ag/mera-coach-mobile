import {
  isDegenerateImageSize,
  isPendingLocalMediaUrl,
  resolveCoachPhotoUrl,
  resolveMediaUrl,
} from '../../utils/mediaUrl';

const ORIGINAL_API = process.env.EXPO_PUBLIC_API_BASE_URL;

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.com';
});

afterAll(() => {
  process.env.EXPO_PUBLIC_API_BASE_URL = ORIGINAL_API;
});

describe('resolveMediaUrl', () => {
  it('returns empty for blank input', () => {
    expect(resolveMediaUrl('')).toBe('');
    expect(resolveMediaUrl(null)).toBe('');
    expect(resolveMediaUrl(undefined)).toBe('');
  });

  it('prefixes relative /document paths with API base', () => {
    expect(resolveMediaUrl('/document/CH001/pic.jpg')).toBe(
      'https://api.example.com/document/CH001/pic.jpg',
    );
  });

  it('prefixes relative paths without a leading slash', () => {
    expect(resolveMediaUrl('document/CH001/pic.jpg')).toBe(
      'https://api.example.com/document/CH001/pic.jpg',
    );
  });

  it('returns relative path unchanged when no base is configured', () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    expect(resolveMediaUrl('/document/CH001/pic.jpg')).toBe('/document/CH001/pic.jpg');
  });

  it('leaves absolute and local URIs unchanged', () => {
    expect(resolveMediaUrl('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg');
    expect(resolveMediaUrl('file:///tmp/a.jpg')).toBe('file:///tmp/a.jpg');
    expect(resolveMediaUrl('data:image/jpeg;base64,abc')).toBe('data:image/jpeg;base64,abc');
  });
});

describe('isDegenerateImageSize', () => {
  it('flags 1×1 and other tiny dimensions as unusable', () => {
    expect(isDegenerateImageSize(1, 1)).toBe(true);
    expect(isDegenerateImageSize(2, 100)).toBe(true);
    expect(isDegenerateImageSize(100, 2)).toBe(true);
    expect(isDegenerateImageSize(3, 3)).toBe(false);
    expect(isDegenerateImageSize(null, 10)).toBe(false);
    expect(isDegenerateImageSize(undefined, undefined)).toBe(false);
  });
});

describe('resolveCoachPhotoUrl', () => {
  it('prefers profilePicUrl over logoUrl', () => {
    expect(
      resolveCoachPhotoUrl({
        profilePicUrl: '/document/a/pic.jpg',
        logoUrl: '/document/a/logo.jpg',
      }),
    ).toBe('https://api.example.com/document/a/pic.jpg');
  });

  it('falls back to logoUrl when profile pic is empty', () => {
    expect(resolveCoachPhotoUrl({ profilePicUrl: '', logoUrl: '/document/a/logo.jpg' })).toBe(
      'https://api.example.com/document/a/logo.jpg',
    );
  });
});

describe('isPendingLocalMediaUrl', () => {
  it('detects local picker URIs still uploading', () => {
    expect(isPendingLocalMediaUrl('file:///tmp/a.jpg')).toBe(true);
    expect(isPendingLocalMediaUrl('content://media/1')).toBe(true);
    expect(isPendingLocalMediaUrl('data:image/jpeg;base64,abc')).toBe(true);
    expect(isPendingLocalMediaUrl('/document/CH001/pic.jpg')).toBe(false);
    expect(isPendingLocalMediaUrl('https://cdn.example.com/a.jpg')).toBe(false);
    expect(isPendingLocalMediaUrl('')).toBe(false);
  });
});
