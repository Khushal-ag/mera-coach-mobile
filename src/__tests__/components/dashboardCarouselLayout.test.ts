import {
  THUMB_ASPECT,
  carouselCardWidth,
  carouselThumbHeight,
} from '../../components/dashboard/carouselLayout';
import { ScreenPad } from '../../constants/theme';

describe('carouselCardWidth', () => {
  it('fills the screen minus horizontal padding', () => {
    expect(carouselCardWidth(390)).toBe(390 - ScreenPad.horizontal * 2);
    expect(carouselCardWidth(320)).toBe(320 - ScreenPad.horizontal * 2);
  });
});

describe('carouselThumbHeight', () => {
  it('uses 16:9 for every video (shorts are center-cropped in the frame)', () => {
    const w = carouselCardWidth(390);
    expect(carouselThumbHeight(w)).toBe(Math.round(w / THUMB_ASPECT));
  });
});
