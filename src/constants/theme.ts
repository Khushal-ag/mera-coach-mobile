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
  shadow: 'rgba(0,0,0,0.08)',
  success: '#1b4332',
  warning: '#c9882a',
  error: '#c04b2b',
  purple: '#7c3aed',
  purpleLight: '#ede9fe',
  destructive: '#dc2626',
  destructiveOrange: '#ea580c',
  online: '#22c55e',
  whatsapp: '#25D366',
  onDarkOverlay: 'rgba(255,255,255,0.15)',
  onDarkMuted: 'rgba(255,255,255,0.7)',
  scrim: 'rgba(0,0,0,0.4)',
} as const;

export const Radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 50,
} as const;

export const STORY_CARD_WIDTH = 280;

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
