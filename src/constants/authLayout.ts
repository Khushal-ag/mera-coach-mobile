import { Spacing } from './theme';

/**
 * Shared auth form scale for Login, Register, and Forgot Password.
 * One product chrome — not per-screen magic numbers.
 */
export const AuthLayout = {
  /** Logo width as a fraction of screen width (feeds authLogoHeight). */
  logoWidthFrac: 0.25,
  /** Extra inset below the status bar before the header row. */
  headerTopExtra: Spacing.xxs,
  /** Horizontal padding for the header (back + logo). */
  headerPadH: Spacing.md,
  /** Form column width relative to screen. */
  formWidthPct: '88%' as const,
  formMaxWidth: 400,
  /** Gap between logo header and form block. */
  formTopGap: Spacing.xxs,
  titleSize: 26,
  titleToSubtitleGap: 2,
  subtitleLineHeight: 16,
  /** Gap under subtitle before the first field. */
  subtitleToFieldsGap: Spacing.xs,
  /** Vertical gap between stacked fields / inputs. */
  fieldGap: Spacing.xs,
  /** Gap under field labels. */
  labelGap: Spacing.xxs,
  inputHeight: 48,
  buttonHeight: 48,
  /** Gap above primary CTA / between stacked CTAs. */
  buttonGap: Spacing.xs,
  /** OR divider vertical margin. */
  orGap: Spacing.xs,
} as const;
