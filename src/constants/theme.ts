import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

/**
 * Mera Coach design tokens.
 * Brand: forest green, terracotta, cream, gold · Outfit + Fraunces.
 * Prefer these over one-off hex / magic numbers in screens.
 */
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
  destructiveSoft: '#fef2f2',
  online: '#22c55e',
  whatsapp: '#25D366',
  whatsappSoft: '#dcfce7',
  disabledBg: '#f3ebe3',
  onDarkOverlay: 'rgba(255,255,255,0.15)',
  onDarkSubtle: 'rgba(255,255,255,0.12)',
  onDarkBorder: 'rgba(255,255,255,0.2)',
  onDarkBorderMid: 'rgba(255,255,255,0.25)',
  onDarkBorderStrong: 'rgba(255,255,255,0.45)',
  onDarkMuted: 'rgba(255,255,255,0.7)',
  onDarkCaption: 'rgba(255,255,255,0.75)',
  onDarkSoft: 'rgba(255,255,255,0.55)',
  onDarkTextSoft: 'rgba(255,255,255,0.65)',
  onDarkBright: 'rgba(255,255,255,0.85)',
  onDarkNearWhite: 'rgba(255,255,255,0.92)',
  onDarkFrost: 'rgba(255,255,255,0.95)',
  lightboxScrim: 'rgba(0,0,0,0.92)',
  /** Mint tone for “mera” on dark green — matches client outline wordmark. */
  brandMeraOnDark: '#a8c4b4',
  /** Warm orange for “coach” on dark backgrounds. */
  brandCoach: '#e8943a',
  scrim: 'rgba(0,0,0,0.4)',
  heroScrim: 'rgba(27,67,50,0.72)',
  authScrim: 'rgba(27,67,50,0.82)',
} as const;

export const Radius = {
  xs: 8,
  sm: 10,
  md: 16,
  lg: 24,
  pill: 50,
} as const;

export const Spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 48,
} as const;

/** Icon sizes used across chrome, lists, and CTAs. */
export const IconSize = {
  xs: 12,
  sm: 16,
  md: 18,
  lg: 20,
  xl: 22,
  xxl: 28,
} as const;

/** Minimum comfortable touch target (pt). */
export const TouchTarget = {
  min: 44,
  header: 44,
  icon: 44,
} as const;

export const HitSlop = {
  sm: { top: 8, bottom: 8, left: 8, right: 8 },
} as const;

/** Default press feedback — keep subtle, never flashy. */
export const PressOpacity = {
  strong: 0.7,
  default: 0.85,
  soft: 0.92,
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

/** Typography roles — prefer these over ad-hoc fontSize + family pairs. */
export const Typography = {
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    lineHeight: 28,
    color: Colors.textDark,
  },
  headline: {
    fontFamily: FontFamily.extraBold,
    fontSize: 18,
    lineHeight: 24,
    color: Colors.textDark,
  },
  section: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    lineHeight: 20,
    color: Colors.textDark,
  },
  body: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textDark,
  },
  bodyStrong: {
    fontFamily: FontFamily.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textDark,
  },
  label: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textDark,
  },
  caption: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textLight,
  },
  micro: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.textLight,
  },
} as const satisfies Record<string, TextStyle>;

const STORY_CARD_WIDTH = 280;

export function storyCardWidth(screenWidth: number): number {
  return Math.min(STORY_CARD_WIDTH, Math.max(232, screenWidth - Spacing.lg * 2));
}

/** Warm-tinted shadows that feel on-brand (not pure black fog). */
export const Shadow: Record<'sm' | 'md' | 'lg', ViewStyle> = {
  sm: {
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  lg: {
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
};

/** Shared form field chrome (login, register, edit profile, wizards). */
export const FormControl = {
  height: 50,
  searchHeight: 44,
  /** Inline toolbar / diet Add / filter row controls. */
  compactHeight: 36,
  borderWidth: 1.5,
  radius: Radius.sm,
  paddingHorizontal: Spacing.sm,
  background: Colors.background,
  surface: Colors.white,
} as const;

/**
 * Compact chips, filter pills, and inline actions.
 * Prefer these over per-screen paddingVertical hacks when AppButton is too tall.
 */
export const ChipControl = {
  minHeight: 32,
  paddingHorizontal: Spacing.sm,
  paddingVertical: 6,
  radius: Radius.pill,
  gap: Spacing.xxs,
} as const;

export const formFieldStyles = {
  wrap: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderWidth: FormControl.borderWidth,
    borderColor: Colors.border,
    borderRadius: FormControl.radius,
    backgroundColor: FormControl.background,
    paddingHorizontal: FormControl.paddingHorizontal,
    height: FormControl.height,
  },
  wrapSurface: {
    backgroundColor: FormControl.surface,
  },
  wrapError: {
    borderColor: Colors.destructive,
  },
  wrapDisabled: {
    backgroundColor: Colors.disabledBg,
    borderColor: Colors.border,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.textDark,
    paddingVertical: 0,
  },
  inputIcon: {
    marginRight: Spacing.xs,
  },
  searchWrap: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.white,
    borderRadius: FormControl.radius,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    paddingHorizontal: FormControl.paddingHorizontal,
    height: FormControl.searchHeight,
    ...Shadow.sm,
  },
  eyeBtn: {
    minWidth: TouchTarget.min,
    minHeight: TouchTarget.min,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: -Spacing.xs,
  },
};

/** Primary CTA chrome shared by AppButton and a few composite CTAs. */
export const buttonStyles = {
  primary: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    minHeight: 52,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    ...Shadow.md,
  },
  primaryText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: FontFamily.bold,
  },
  secondary: {
    backgroundColor: Colors.white,
    borderRadius: Radius.pill,
    minHeight: 48,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  secondaryText: {
    color: Colors.secondary,
    fontSize: 15,
    fontFamily: FontFamily.bold,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderRadius: Radius.pill,
    minHeight: 44,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  ghostText: {
    color: Colors.primary,
    fontSize: 14,
    fontFamily: FontFamily.bold,
  },
  /** Single compact size for list CTAs, diet Add, re-checkup, header chips. */
  compact: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    minHeight: FormControl.compactHeight,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: Spacing.xxs + 2,
    paddingHorizontal: Spacing.md,
  },
  compactText: {
    color: Colors.white,
    fontSize: 13,
    fontFamily: FontFamily.bold,
  },
  compactSecondary: {
    backgroundColor: Colors.white,
    borderRadius: Radius.pill,
    minHeight: FormControl.compactHeight,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: Spacing.xxs + 2,
    paddingHorizontal: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  compactSecondaryText: {
    color: Colors.secondary,
    fontSize: 13,
    fontFamily: FontFamily.bold,
  },
  compactGhost: {
    backgroundColor: 'transparent',
    borderRadius: Radius.pill,
    minHeight: FormControl.compactHeight,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: Spacing.xxs + 2,
    paddingHorizontal: Spacing.sm,
  },
  compactGhostText: {
    color: Colors.primary,
    fontSize: 13,
    fontFamily: FontFamily.bold,
  },
  disabled: {
    opacity: 0.7,
  },
};

/** Filter / category pills (coach list banner, explore chips). */
export const filterPillStyles = {
  base: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: ChipControl.gap,
    borderRadius: ChipControl.radius,
    paddingHorizontal: ChipControl.paddingHorizontal,
    paddingVertical: ChipControl.paddingVertical,
    minHeight: ChipControl.minHeight,
  },
  onDark: {
    backgroundColor: Colors.onDarkSubtle,
    borderWidth: 1,
    borderColor: Colors.onDarkBorder,
  },
  onDarkActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  text: {
    fontSize: 11,
    fontFamily: FontFamily.semibold,
    color: Colors.onDarkMuted,
  },
  textActive: {
    color: Colors.white,
  },
};

/** Status / meta chips used on client cards, leads, profiles. */
export const statusChipStyles = {
  base: {
    borderRadius: ChipControl.radius,
    paddingHorizontal: ChipControl.paddingHorizontal,
    paddingVertical: ChipControl.paddingVertical,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  text: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
  },
  microText: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
  },
  /** Dense list badges (client list / dashboard). */
  compact: {
    borderRadius: ChipControl.radius,
    paddingHorizontal: 9,
    paddingVertical: 3,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  compactText: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
  },
  toneActive: { backgroundColor: Colors.secondaryLight },
  toneWarning: { backgroundColor: Colors.accentLight },
  toneNew: { backgroundColor: Colors.primaryLight },
  toneActiveText: { color: Colors.secondary },
  toneWarningText: { color: Colors.accent },
  toneNewText: { color: Colors.primary },
};

/** Maps API client status labels to shared chip tones (label text is always shown). */
export function clientStatusTone(status: string): 'active' | 'warning' | 'new' {
  if (status === 'Active') return 'active';
  if (status === 'New') return 'new';
  return 'warning';
}
