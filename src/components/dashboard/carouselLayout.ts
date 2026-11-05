import { ScreenPad } from '../../constants/theme';

/** Landscape frame for every carousel card (Shorts thumbnails are center-cropped with cover). */
export const THUMB_ASPECT = 16 / 9;

export function carouselCardWidth(screenWidth: number): number {
  return screenWidth - ScreenPad.horizontal * 2;
}

export function carouselThumbHeight(cardWidth: number): number {
  return Math.round(cardWidth / THUMB_ASPECT);
}
