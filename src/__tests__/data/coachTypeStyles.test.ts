import { Colors } from '../../constants/theme';
import { getCoachTypeStyle, shortLabelFromName } from '../../data/coachTypeStyles';

describe('shortLabelFromName', () => {
  it('strips trailing role words', () => {
    expect(shortLabelFromName('Yoga & Wellness Trainer')).toBe('Yoga');
    expect(shortLabelFromName('Health & Wellness Coach')).toBe('Health');
  });

  it('falls back to Other for empty labels', () => {
    expect(shortLabelFromName('')).toBe('Other');
    expect(shortLabelFromName(null)).toBe('Other');
  });
});

describe('getCoachTypeStyle', () => {
  it('returns brand styles for known codes', () => {
    expect(getCoachTypeStyle('CT001').short).toBe('Gym');
    expect(getCoachTypeStyle('CT001').icon).toBe('barbell');
    expect(getCoachTypeStyle('CT007').short).toBe('Yoga');
  });

  it('still renders unknown codes with a derived short label and generic icon', () => {
    const style = getCoachTypeStyle('CT099', 'Pilates Instructor');
    expect(style.short).toBe('Pilates');
    expect(style.icon).toBe('apps-outline');
    expect(style.color).toBeTruthy();
    expect(style.bg).toBeTruthy();
  });

  it('picks brand palette colors for unknown codes', () => {
    const style = getCoachTypeStyle('CT999', 'New Category');
    const brandColors: string[] = [
      Colors.primary,
      Colors.secondary,
      Colors.accent,
      Colors.secondaryDark,
      Colors.primaryDark,
    ];
    expect(brandColors).toContain(style.color);
  });
});
