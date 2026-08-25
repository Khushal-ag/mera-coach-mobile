import { resolveMediaUrl } from '../mediaUrl';

const ORIGINAL_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.com';
});

afterAll(() => {
  process.env.EXPO_PUBLIC_API_BASE_URL = ORIGINAL_BASE;
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

  it('leaves absolute and local URIs unchanged', () => {
    expect(resolveMediaUrl('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg');
    expect(resolveMediaUrl('file:///tmp/a.jpg')).toBe('file:///tmp/a.jpg');
    expect(resolveMediaUrl('data:image/jpeg;base64,abc')).toBe('data:image/jpeg;base64,abc');
  });
});
