import { fontAwesomeToIonicon, parseFontAwesomeGlyph, parseFontAwesomeStyle } from '../../utils/fontAwesomeToIonicon';

describe('fontAwesomeToIonicon', () => {
  it('parses FontAwesome class strings', () => {
    expect(parseFontAwesomeGlyph('fas fa-dumbbell')).toBe('dumbbell');
    expect(parseFontAwesomeGlyph('fa-heart')).toBe('heart');
    expect(parseFontAwesomeGlyph('dumbbell')).toBe('dumbbell');
  });

  it('parses FontAwesome style prefixes', () => {
    expect(parseFontAwesomeStyle('fas fa-dumbbell')).toBe('solid');
    expect(parseFontAwesomeStyle('far fa-heart')).toBe('regular');
    expect(parseFontAwesomeStyle('fab fa-whatsapp')).toBe('brand');
  });

  it('maps API coach-type icons to Ionicons', () => {
    expect(fontAwesomeToIonicon('fas fa-dumbbell')).toBe('barbell');
    expect(fontAwesomeToIonicon('fas fa-heart')).toBe('heart');
    expect(fontAwesomeToIonicon('fas fa-leaf')).toBe('leaf');
    expect(fontAwesomeToIonicon('fas fa-spa')).toBe('flower');
    expect(fontAwesomeToIonicon('fas fa-music')).toBe('musical-notes');
  });

  it('returns null for unknown or empty icons', () => {
    expect(fontAwesomeToIonicon(undefined)).toBeNull();
    expect(fontAwesomeToIonicon('')).toBeNull();
    expect(fontAwesomeToIonicon('fas fa-unknown-glyph')).toBeNull();
  });
});
