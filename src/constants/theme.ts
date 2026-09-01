import type { ViewStyle } from 'react-native';

export const Colors = {
  primary: '#c04b2b',
  primaryDark: '#9e3b1f',
  primaryLight: '#fceee9',
  secondary: '#1b4332',
  secondaryDark: '#2d6a4f',
  secondaryLight: '#e8f5e9',
  accent: '#c9882a',
  accentLight: '#fdf3e0',
  background: '#fdf8f2',
  backgroundTan: '#f5ede0',
  white: '#ffffff',
  textDark: '#2c1810',
  textLight: '#8b6553',
  border: '#e5d5c5',
  destructive: '#dc2626',
  destructiveOrange: '#ea580c',
  online: '#22c55e',
  whatsapp: '#25D366',
  onDarkOverlay: 'rgba(255,255,255,0.15)',
  onDarkMuted: 'rgba(255,255,255,0.7)',
  scrim: 'rgba(0,0,0,0.4)',
  heroScrim: 'rgba(27,67,50,0.72)',
} as const;

export const Radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 50,
} as const;

export const Spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

/** Matches @expo-google-fonts keys loaded in App.tsx. */
export const FontFamily = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
  extraBold: 'Outfit_800ExtraBold',
  displayItalic: 'Fraunces_700Bold_Italic',
} as const;

const STORY_CARD_WIDTH = 280;

export function storyCardWidth(screenWidth: number): number {
  return Math.min(STORY_CARD_WIDTH, Math.max(232, screenWidth - Spacing.lg * 2));
}

export const Shadow: Record<'sm' | 'md' | 'lg', ViewStyle> = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
};
